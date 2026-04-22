-- =============================================================================
-- Rodada 04 — Reclassificar histórico: Buzz Fly + Fiotec → B2B
-- =============================================================================
-- Motivo: o parser da NF classifica Serie 1 sem unidade de peso (kg/L)
-- como B2B2C. Clientes institucionais (P&D, ensaios, pesquisa) podem comprar
-- em embalagens não-peso mas comercialmente são B2B.
--
-- Este UPDATE alinha registros históricos à whitelist definida em
-- src/utils/invoiceParser.ts (B2B_ALWAYS_PATTERNS).
--
-- Clientes afetados:
--   - BUZZ FLY P&D EM ALIMENTOS (e variações)
--   - FIOTEC (Fundação para Desenvolvimento Científico e Tecnológico em Saúde)
-- =============================================================================

BEGIN;

-- Diagnóstico antes (opcional — deixar comentado em produção):
-- SELECT cliente_nome, segmento_cliente, COUNT(*)
-- FROM public.sales_data
-- WHERE cliente_nome ILIKE '%buzz fly%' OR cliente_nome ILIKE '%fiotec%'
-- GROUP BY cliente_nome, segmento_cliente;

UPDATE public.sales_data
SET    segmento_cliente = 'b2b'
WHERE  (cliente_nome ILIKE '%buzz fly%' OR cliente_nome ILIKE '%fiotec%')
  AND  (segmento_cliente IS DISTINCT FROM 'b2b');

COMMIT;

-- Verificação pós-deploy:
-- SELECT cliente_nome, segmento_cliente, COUNT(*)
-- FROM public.sales_data
-- WHERE cliente_nome ILIKE '%buzz fly%' OR cliente_nome ILIKE '%fiotec%'
-- GROUP BY cliente_nome, segmento_cliente;
-- Esperado: TODAS as linhas com segmento_cliente = 'b2b'.
