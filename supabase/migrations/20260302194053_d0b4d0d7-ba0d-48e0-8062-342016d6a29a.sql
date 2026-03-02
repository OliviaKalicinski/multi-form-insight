-- Fix: use numero_pedido_plataforma instead of numero_pedido for cross-source matching
CREATE OR REPLACE FUNCTION public.enforce_nf_precedence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.fonte_dados = 'ecommerce' THEN
    IF EXISTS (
      SELECT 1 FROM sales_data
      WHERE fonte_dados = 'nf'
        AND numero_pedido_plataforma IS NOT NULL
        AND numero_pedido_plataforma = NEW.numero_pedido
        AND cliente_email = NEW.cliente_email
    ) THEN
      RAISE EXCEPTION 'Ecommerce bloqueado: NF já existe para pedido plataforma %', NEW.numero_pedido;
    END IF;
  END IF;

  IF NEW.fonte_dados = 'nf'
     AND NEW.numero_pedido_plataforma IS NOT NULL THEN
    DELETE FROM sales_data
    WHERE numero_pedido = NEW.numero_pedido_plataforma
      AND fonte_dados = 'ecommerce'
      AND cliente_email = NEW.cliente_email;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_nf_precedence ON sales_data;
CREATE TRIGGER trg_enforce_nf_precedence
  BEFORE INSERT ON sales_data
  FOR EACH ROW
  EXECUTE FUNCTION enforce_nf_precedence();

-- Defensive CTE in recalculate_customer
CREATE OR REPLACE FUNCTION public.recalculate_customer(p_cpf_cnpj text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SELECT is_active INTO v_is_active FROM customer WHERE cpf_cnpj = p_cpf_cnpj;
  IF v_is_active IS NOT NULL AND NOT v_is_active THEN
    RETURN;
  END IF;

  SELECT cliente_nome INTO v_nome
  FROM sales_data
  WHERE cliente_email = p_cpf_cnpj
  ORDER BY data_venda DESC
  LIMIT 1;

  IF v_nome IS NULL AND NOT EXISTS (SELECT 1 FROM sales_data WHERE cliente_email = p_cpf_cnpj) THEN
    RETURN;
  END IF;

  -- Deduplicated: exclude ecommerce when matching NF exists
  WITH nf_links AS (
    SELECT numero_pedido_plataforma
    FROM sales_data
    WHERE cliente_email = p_cpf_cnpj
      AND fonte_dados = 'nf'
      AND numero_pedido_plataforma IS NOT NULL
  ),
  deduplicated AS (
    SELECT * FROM sales_data
    WHERE cliente_email = p_cpf_cnpj
      AND NOT (
        fonte_dados = 'ecommerce'
        AND EXISTS (
          SELECT 1 FROM nf_links
          WHERE nf_links.numero_pedido_plataforma = sales_data.numero_pedido
        )
      )
  )
  SELECT COUNT(*) INTO v_total_orders_all FROM deduplicated;

  WITH nf_links AS (
    SELECT numero_pedido_plataforma
    FROM sales_data
    WHERE cliente_email = p_cpf_cnpj
      AND fonte_dados = 'nf'
      AND numero_pedido_plataforma IS NOT NULL
  ),
  deduplicated AS (
    SELECT * FROM sales_data
    WHERE cliente_email = p_cpf_cnpj
      AND NOT (
        fonte_dados = 'ecommerce'
        AND EXISTS (
          SELECT 1 FROM nf_links
          WHERE nf_links.numero_pedido_plataforma = sales_data.numero_pedido
        )
      )
  )
  SELECT
    COUNT(*),
    COALESCE(SUM(COALESCE(total_faturado, valor_total + COALESCE(valor_frete, 0))), 0),
    MIN(data_venda),
    MAX(data_venda)
  INTO v_total_orders_revenue, v_total_revenue, v_first_order_date, v_last_order_date
  FROM deduplicated
  WHERE COALESCE(tipo_movimento, 'venda') = 'venda';

  v_ticket_medio := CASE WHEN v_total_orders_revenue > 0
    THEN v_total_revenue / v_total_orders_revenue
    ELSE 0 END;

  v_avg_days := NULL;
  IF v_total_orders_revenue >= 2 THEN
    WITH nf_links AS (
      SELECT numero_pedido_plataforma
      FROM sales_data
      WHERE cliente_email = p_cpf_cnpj
        AND fonte_dados = 'nf'
        AND numero_pedido_plataforma IS NOT NULL
    ),
    deduplicated AS (
      SELECT * FROM sales_data
      WHERE cliente_email = p_cpf_cnpj
        AND NOT (
          fonte_dados = 'ecommerce'
          AND EXISTS (
            SELECT 1 FROM nf_links
            WHERE nf_links.numero_pedido_plataforma = sales_data.numero_pedido
          )
        )
    )
    SELECT ARRAY_AGG(data_venda ORDER BY data_venda) INTO v_dates
    FROM deduplicated
    WHERE COALESCE(tipo_movimento, 'venda') = 'venda';

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
$function$;

-- Composite index for trigger performance
CREATE INDEX IF NOT EXISTS idx_sales_fonte_pedido_email
ON sales_data (fonte_dados, numero_pedido, cliente_email);
