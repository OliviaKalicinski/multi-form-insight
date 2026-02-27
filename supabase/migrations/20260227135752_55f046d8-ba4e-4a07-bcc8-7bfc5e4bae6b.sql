
-- 1. Add merge columns to customer
ALTER TABLE public.customer
  ADD COLUMN IF NOT EXISTS merged_into uuid REFERENCES public.customer(id),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Create customer_identifier table
CREATE TABLE public.customer_identifier (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customer(id) ON DELETE CASCADE,
  type text NOT NULL,
  value text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_customer_identifier_value ON public.customer_identifier(value);
CREATE INDEX idx_customer_identifier_customer ON public.customer_identifier(customer_id);
CREATE UNIQUE INDEX unique_identifier_type_value ON public.customer_identifier(type, value);

ALTER TABLE public.customer_identifier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read identifiers" ON public.customer_identifier FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert identifiers" ON public.customer_identifier FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update identifiers" ON public.customer_identifier FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete identifiers" ON public.customer_identifier FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- 3. Populate customer_identifier from existing customer.cpf_cnpj
INSERT INTO public.customer_identifier (customer_id, type, value, is_primary)
SELECT id, 'cpf', cpf_cnpj, true
FROM public.customer
WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != '' AND length(trim(cpf_cnpj)) > 3 AND NOT cpf_cnpj LIKE 'nf-%'
ON CONFLICT DO NOTHING;

-- 4. Create customer_contact_log table
CREATE TABLE public.customer_contact_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customer(id),
  data_contato timestamptz NOT NULL DEFAULT now(),
  tipo text,
  motivo text,
  resumo text NOT NULL,
  responsavel text,
  resultado text,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

ALTER TABLE public.customer_contact_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read contact_log" ON public.customer_contact_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert contact_log" ON public.customer_contact_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update contact_log" ON public.customer_contact_log FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete contact_log" ON public.customer_contact_log FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- 5. Create customer_complaint table
CREATE TABLE public.customer_complaint (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customer(id),
  atendimento_numero text,
  data_contato timestamptz DEFAULT now(),
  canal text,
  atendente text,
  produto text,
  lote text,
  data_fabricacao date,
  local_compra text,
  transportador text,
  nf_produto text,
  natureza_pedido text,
  tipo_reclamacao text,
  descricao text NOT NULL,
  link_reclamacao text,
  acao_orientacao text,
  status text NOT NULL DEFAULT 'aberta',
  gravidade text,
  custo_estimado numeric(14,2),
  data_fechamento timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

ALTER TABLE public.customer_complaint ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read complaints" ON public.customer_complaint FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert complaints" ON public.customer_complaint FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update complaints" ON public.customer_complaint FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete complaints" ON public.customer_complaint FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- 6. Create customer_merge_log table
CREATE TABLE public.customer_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_customer_id uuid NOT NULL,
  secondary_customer_id uuid NOT NULL,
  merged_by uuid DEFAULT auth.uid(),
  merged_at timestamptz DEFAULT now()
);

ALTER TABLE public.customer_merge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read merge_log" ON public.customer_merge_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert merge_log" ON public.customer_merge_log FOR INSERT TO authenticated WITH CHECK (true);

-- 7. Create merge_customers function
CREATE OR REPLACE FUNCTION public.merge_customers(p_primary uuid, p_secondary uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_primary_active boolean;
  v_secondary_active boolean;
  v_primary_cpf text;
BEGIN
  -- Validate both exist and are active
  SELECT is_active INTO v_primary_active FROM customer WHERE id = p_primary;
  SELECT is_active INTO v_secondary_active FROM customer WHERE id = p_secondary;

  IF v_primary_active IS NULL OR v_secondary_active IS NULL THEN
    RAISE EXCEPTION 'One or both customers do not exist';
  END IF;

  IF NOT v_primary_active THEN
    RAISE EXCEPTION 'Primary customer is not active';
  END IF;

  IF NOT v_secondary_active THEN
    RAISE EXCEPTION 'Secondary customer is already inactive/merged';
  END IF;

  IF p_primary = p_secondary THEN
    RAISE EXCEPTION 'Cannot merge a customer with itself';
  END IF;

  -- Move identifiers (skip conflicts)
  UPDATE customer_identifier SET customer_id = p_primary
  WHERE customer_id = p_secondary
    AND NOT EXISTS (
      SELECT 1 FROM customer_identifier ci2
      WHERE ci2.customer_id = p_primary AND ci2.type = customer_identifier.type AND ci2.value = customer_identifier.value
    );

  -- Delete remaining conflicting identifiers
  DELETE FROM customer_identifier WHERE customer_id = p_secondary;

  -- Move complaints
  UPDATE customer_complaint SET customer_id = p_primary WHERE customer_id = p_secondary;

  -- Move contact logs
  UPDATE customer_contact_log SET customer_id = p_primary WHERE customer_id = p_secondary;

  -- Mark secondary as inactive
  UPDATE customer SET is_active = false, merged_into = p_primary, updated_at = now() WHERE id = p_secondary;

  -- Log the merge
  INSERT INTO customer_merge_log (primary_customer_id, secondary_customer_id, merged_by)
  VALUES (p_primary, p_secondary, auth.uid());

  -- Recalculate primary customer metrics
  SELECT cpf_cnpj INTO v_primary_cpf FROM customer WHERE id = p_primary;
  IF v_primary_cpf IS NOT NULL THEN
    PERFORM recalculate_customer(v_primary_cpf);
  END IF;
END;
$$;

-- 8. Create find_customer_by_identifier function
CREATE OR REPLACE FUNCTION public.find_customer_by_identifier(p_value text)
RETURNS SETOF public.customer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.*
  FROM customer c
  JOIN customer_identifier ci ON ci.customer_id = c.id
  WHERE ci.value ILIKE p_value
    AND c.is_active = true
  LIMIT 10;
$$;

-- 9. Update recalculate_customer to skip inactive
CREATE OR REPLACE FUNCTION public.recalculate_customer(p_cpf_cnpj text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nome text;
  v_total_orders_revenue integer;
  v_total_orders_all integer;
  v_total_revenue numeric(14,2);
  v_ticket_medio numeric(14,2);
  v_first_order_date timestamptz;
  v_last_order_date timestamptz;
  v_avg_days numeric(10,2);
  v_segment text;
  v_dates timestamptz[];
  v_total_intervals numeric;
  v_count_intervals integer;
  v_is_active boolean;
BEGIN
  -- Check if customer exists and is active
  SELECT is_active INTO v_is_active FROM customer WHERE cpf_cnpj = p_cpf_cnpj;
  IF v_is_active IS NOT NULL AND NOT v_is_active THEN
    RETURN; -- Skip merged/inactive customers
  END IF;

  SELECT cliente_nome INTO v_nome
  FROM sales_data
  WHERE cliente_email = p_cpf_cnpj
  ORDER BY data_venda DESC
  LIMIT 1;

  IF v_nome IS NULL AND NOT EXISTS (SELECT 1 FROM sales_data WHERE cliente_email = p_cpf_cnpj) THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_total_orders_all
  FROM sales_data
  WHERE cliente_email = p_cpf_cnpj;

  SELECT
    COUNT(*),
    COALESCE(SUM(COALESCE(total_faturado, valor_total + COALESCE(valor_frete, 0))), 0),
    MIN(data_venda),
    MAX(data_venda)
  INTO v_total_orders_revenue, v_total_revenue, v_first_order_date, v_last_order_date
  FROM sales_data
  WHERE cliente_email = p_cpf_cnpj
    AND COALESCE(tipo_movimento, 'venda') = 'venda';

  v_ticket_medio := CASE WHEN v_total_orders_revenue > 0
    THEN v_total_revenue / v_total_orders_revenue
    ELSE 0 END;

  v_avg_days := NULL;
  IF v_total_orders_revenue >= 2 THEN
    SELECT ARRAY_AGG(data_venda ORDER BY data_venda) INTO v_dates
    FROM sales_data
    WHERE cliente_email = p_cpf_cnpj
      AND COALESCE(tipo_movimento, 'venda') = 'venda';

    v_total_intervals := 0;
    v_count_intervals := 0;
    FOR i IN 2..array_length(v_dates, 1) LOOP
      v_total_intervals := v_total_intervals + (v_dates[i]::date - v_dates[i-1]::date);
      v_count_intervals := v_count_intervals + 1;
    END LOOP;

    IF v_count_intervals > 0 THEN
      v_avg_days := v_total_intervals / v_count_intervals;
    END IF;
  END IF;

  IF v_total_orders_revenue >= 5 OR v_total_revenue >= 500 THEN
    v_segment := 'VIP';
  ELSIF v_total_orders_revenue >= 3 THEN
    v_segment := 'Fiel';
  ELSIF v_total_orders_revenue = 2 THEN
    v_segment := 'Recorrente';
  ELSE
    v_segment := 'Primeira Compra';
  END IF;

  INSERT INTO customer (
    cpf_cnpj, nome,
    total_orders_revenue, total_orders_all, total_revenue, ticket_medio,
    first_order_date, last_order_date, average_days_between_purchases,
    segment, recalculated_at
  ) VALUES (
    p_cpf_cnpj, v_nome,
    v_total_orders_revenue, v_total_orders_all, v_total_revenue, v_ticket_medio,
    v_first_order_date, v_last_order_date, v_avg_days,
    v_segment, now()
  )
  ON CONFLICT (cpf_cnpj) DO UPDATE SET
    nome = EXCLUDED.nome,
    total_orders_revenue = EXCLUDED.total_orders_revenue,
    total_orders_all = EXCLUDED.total_orders_all,
    total_revenue = EXCLUDED.total_revenue,
    ticket_medio = EXCLUDED.ticket_medio,
    first_order_date = EXCLUDED.first_order_date,
    last_order_date = EXCLUDED.last_order_date,
    average_days_between_purchases = EXCLUDED.average_days_between_purchases,
    segment = EXCLUDED.segment,
    recalculated_at = now(),
    updated_at = now();
END;
$$;

-- 10. Recreate customer_full view with is_active and merged_into
DROP VIEW IF EXISTS public.customer_full;
CREATE VIEW public.customer_full AS
SELECT
  c.id,
  c.cpf_cnpj,
  c.nome,
  c.total_orders_revenue,
  c.total_orders_all,
  c.total_revenue,
  c.ticket_medio,
  c.first_order_date,
  c.last_order_date,
  c.average_days_between_purchases,
  c.segment,
  c.responsavel,
  c.tags,
  c.observacoes,
  c.prioridade,
  c.status_manual,
  c.last_contact_date,
  c.created_at,
  c.updated_at,
  c.recalculated_at,
  c.merged_into,
  c.is_active,
  CASE
    WHEN c.last_order_date IS NULL THEN NULL
    ELSE (CURRENT_DATE - c.last_order_date::date)
  END AS days_since_last_purchase,
  CASE
    WHEN c.total_orders_revenue <= 1 THEN 'active'
    WHEN c.last_order_date IS NULL THEN 'churned'
    WHEN (CURRENT_DATE - c.last_order_date::date) > 90 THEN 'churned'
    WHEN (CURRENT_DATE - c.last_order_date::date) > 60 THEN 'inactive'
    WHEN (CURRENT_DATE - c.last_order_date::date) > 30 THEN 'at_risk'
    ELSE 'active'
  END AS churn_status
FROM public.customer c
WHERE c.is_active = true;
