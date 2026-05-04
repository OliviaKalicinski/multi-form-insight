-- R42 (auditoria comportamento-cliente) · fix churn_status na view customer_full
--
-- Bug Bruno 04/05: 'Clientes Ativos: 6.093 (95.1% da base) — eles com certeza
-- não compraram todos nos últimos 30 dias.' Confirmado.
--
-- Causa raiz: view customer_full classificava como 'active' qualquer cliente
-- com `total_orders_revenue <= 1`, INDEPENDENTE de last_order_date. Cliente
-- que comprou 1 vez há 3 anos era contado como ativo. Distorcia churn,
-- retenção e LTV.
--
-- Fix: classificar SEMPRE pelo last_order_date, independente da contagem
-- de pedidos. Cliente que nunca comprou (last_order_date NULL) vai pra
-- bucket próprio 'never_purchased' (não-pejorativo, exclui da taxa de
-- churn que é métrica pra quem JÁ COMPROU).

DROP VIEW IF EXISTS public.customer_full;

CREATE VIEW public.customer_full WITH (security_invoker = true) AS
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
    -- Nunca comprou (lead Shopify, cadastro manual sem venda) — bucket
    -- próprio. Não entra no denominador da taxa de churn.
    WHEN c.last_order_date IS NULL THEN 'never_purchased'
    -- Classificação por tempo desde última compra. Mesmas faixas, agora
    -- aplicadas a TODOS independente de quantos pedidos.
    WHEN (CURRENT_DATE - c.last_order_date::date) > 90 THEN 'churned'
    WHEN (CURRENT_DATE - c.last_order_date::date) > 60 THEN 'inactive'
    WHEN (CURRENT_DATE - c.last_order_date::date) > 30 THEN 'at_risk'
    ELSE 'active'
  END AS churn_status
FROM public.customer c
WHERE c.is_active = true;
