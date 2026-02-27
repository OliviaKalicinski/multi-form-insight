
-- 1. Tabela customer (entidade operacional)
CREATE TABLE customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf_cnpj text NOT NULL UNIQUE,
  nome text,

  -- Derivados (atualizados por recalculate)
  total_orders_revenue integer NOT NULL DEFAULT 0,
  total_orders_all integer NOT NULL DEFAULT 0,
  total_revenue numeric(14,2) NOT NULL DEFAULT 0,
  ticket_medio numeric(14,2) DEFAULT 0,
  first_order_date timestamptz,
  last_order_date timestamptz,
  average_days_between_purchases numeric(10,2),
  segment text CHECK (segment IN ('Primeira Compra','Recorrente','Fiel','VIP')),

  -- Operacionais (manuais, NUNCA sobrescritos por recalc)
  tags jsonb DEFAULT '[]',
  observacoes text,
  responsavel text,
  prioridade text,
  status_manual text,
  last_contact_date timestamptz,

  -- Controle
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  recalculated_at timestamptz
);

ALTER TABLE customer ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read customer"
  ON customer FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert customer"
  ON customer FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update customer"
  ON customer FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete customer"
  ON customer FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- 2. View customer_full (churn dinâmico)
CREATE VIEW customer_full AS
SELECT *,
  CASE
    WHEN last_order_date IS NULL THEN NULL
    ELSE (now()::date - last_order_date::date)
  END AS days_since_last_purchase,
  CASE
    WHEN last_order_date IS NULL THEN 'churned'
    WHEN (now()::date - last_order_date::date) <= 30 THEN 'active'
    WHEN (now()::date - last_order_date::date) <= 60 THEN 'at_risk'
    WHEN (now()::date - last_order_date::date) <= 90 THEN 'inactive'
    ELSE 'churned'
  END AS churn_status
FROM customer;

-- 3. Função recalculate_customer
CREATE OR REPLACE FUNCTION recalculate_customer(p_cpf_cnpj text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
BEGIN
  -- Nome do cliente (último pedido)
  SELECT cliente_nome INTO v_nome
  FROM sales_data
  WHERE cliente_email = p_cpf_cnpj
  ORDER BY data_venda DESC
  LIMIT 1;

  -- Se não encontrar nenhum pedido, sair
  IF v_nome IS NULL AND NOT EXISTS (SELECT 1 FROM sales_data WHERE cliente_email = p_cpf_cnpj) THEN
    RETURN;
  END IF;

  -- Total de pedidos (todos os tipos)
  SELECT COUNT(*) INTO v_total_orders_all
  FROM sales_data
  WHERE cliente_email = p_cpf_cnpj;

  -- Métricas econômicas (apenas vendas)
  SELECT
    COUNT(*),
    COALESCE(SUM(COALESCE(total_faturado, valor_total + COALESCE(valor_frete, 0))), 0),
    MIN(data_venda),
    MAX(data_venda)
  INTO v_total_orders_revenue, v_total_revenue, v_first_order_date, v_last_order_date
  FROM sales_data
  WHERE cliente_email = p_cpf_cnpj
    AND COALESCE(tipo_movimento, 'venda') = 'venda';

  -- Ticket médio
  v_ticket_medio := CASE WHEN v_total_orders_revenue > 0
    THEN v_total_revenue / v_total_orders_revenue
    ELSE 0 END;

  -- Average days between purchases (NULL se < 2 pedidos de venda)
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

  -- Segment
  IF v_total_orders_revenue >= 5 OR v_total_revenue >= 500 THEN
    v_segment := 'VIP';
  ELSIF v_total_orders_revenue >= 3 THEN
    v_segment := 'Fiel';
  ELSIF v_total_orders_revenue = 2 THEN
    v_segment := 'Recorrente';
  ELSE
    v_segment := 'Primeira Compra';
  END IF;

  -- UPSERT: preserva campos operacionais
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

-- 4. Função recalculate_all_customers
CREATE OR REPLACE FUNCTION recalculate_all_customers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf text;
  v_count integer := 0;
BEGIN
  FOR v_cpf IN
    SELECT DISTINCT cliente_email
    FROM sales_data
    WHERE cliente_email IS NOT NULL
  LOOP
    PERFORM recalculate_customer(v_cpf);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
