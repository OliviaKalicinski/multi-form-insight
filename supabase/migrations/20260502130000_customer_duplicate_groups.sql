-- R31-B · Detector de duplicatas de cliente
--
-- Contexto:
--   Importer Shopify cria customer com cpf_cnpj=`shopify-XXX` (lead).
--   NF importada depois cria OUTRO customer com CPF real. Resultado:
--   2+ rows pra mesma pessoa, sendo o lead Shopify zerado e a versão
--   NF com pedidos. Top-10 nomes duplicados tem entre 4-6 rows.
--
-- View `customer_duplicate_groups`:
--   Agrupa customers ATIVOS por nome normalizado (lowercase + trim) e
--   só retorna grupos com 2+ rows. Pra cada grupo, o agg traz:
--     - group_key: nome normalizado (chave do grupo)
--     - group_size: quantos customers no grupo
--     - total_revenue_in_group: soma da receita (pra priorizar grupos
--       com volume real — duplicata sem pedido em ninguém é low priority)
--     - primary_id: o id do cliente com mais total_orders_revenue
--                   (candidato natural a virar o "principal" no merge)
--     - members: array com [{id, cpf_cnpj, total_orders_revenue,
--                first_order_date, created_at}] pra a UI renderizar
--
-- Frontend usa essa view em /clientes/duplicatas pra listar e disparar
-- merge_customers(p_primary, p_secondary) que já existe.

CREATE OR REPLACE VIEW public.customer_duplicate_groups AS
WITH normalized AS (
  SELECT
    id,
    nome,
    cpf_cnpj,
    LOWER(TRIM(nome)) AS nome_norm,
    COALESCE(total_orders_revenue, 0) AS orders_count,
    COALESCE(total_revenue, 0) AS revenue,
    first_order_date,
    last_order_date,
    created_at
  FROM public.customer
  WHERE is_active = true
    AND merged_into IS NULL
    AND nome IS NOT NULL
    AND TRIM(nome) <> ''
),
groups AS (
  SELECT nome_norm
  FROM normalized
  GROUP BY nome_norm
  HAVING COUNT(*) > 1
),
ranked AS (
  SELECT
    n.*,
    -- Ranking dentro do grupo: cliente com mais pedidos primeiro,
    -- desempate por receita, depois por created_at mais antigo.
    ROW_NUMBER() OVER (
      PARTITION BY n.nome_norm
      ORDER BY n.orders_count DESC, n.revenue DESC, n.created_at ASC
    ) AS rank_in_group
  FROM normalized n
  JOIN groups g ON g.nome_norm = n.nome_norm
)
SELECT
  r.nome_norm AS group_key,
  COUNT(*) AS group_size,
  SUM(r.revenue) AS total_revenue_in_group,
  SUM(r.orders_count) AS total_orders_in_group,
  -- O id do principal (rank=1) já vai dentro do JSON, mas
  -- expõe separado pra o frontend conseguir ordenar/filtrar fácil.
  MAX(CASE WHEN r.rank_in_group = 1 THEN r.id END) AS primary_id,
  MAX(CASE WHEN r.rank_in_group = 1 THEN r.nome END) AS primary_nome,
  jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'nome', r.nome,
      'cpf_cnpj', r.cpf_cnpj,
      'orders_count', r.orders_count,
      'revenue', r.revenue,
      'first_order_date', r.first_order_date,
      'last_order_date', r.last_order_date,
      'created_at', r.created_at,
      'rank_in_group', r.rank_in_group
    )
    ORDER BY r.rank_in_group
  ) AS members
FROM ranked r
GROUP BY r.nome_norm;

-- View herda RLS da tabela base. Como customer já está authorizado
-- pra qualquer authenticated (depois da R31-A), está OK.
GRANT SELECT ON public.customer_duplicate_groups TO authenticated;
