-- ============================================================
-- Migration: Adicionar post_type em instagram_posts + journey_stage em customer
-- Ref: Diagnóstico Estratégico — Desconexão 1 (conteúdo sem medição)
-- ============================================================

-- 1. post_type: classifica posts nos 5 formatos da estratégia
ALTER TABLE public.instagram_posts
ADD COLUMN IF NOT EXISTS post_type TEXT;

COMMENT ON COLUMN public.instagram_posts.post_type IS
  'Categoria editorial: manifesto | educativo | bastidor | prova_social | oferta | outro';

-- 2. journey_stage: segmenta clientes por fase do funil
ALTER TABLE public.customer
ADD COLUMN IF NOT EXISTS journey_stage TEXT DEFAULT 'novo';

COMMENT ON COLUMN public.customer.journey_stage IS
  'Estágio na jornada: novo (1 pedido) | recorrente (2-4) | campea (5+) | risco (60-90 dias) | perdido (90+)';

-- Popula journey_stage com base nos dados existentes
UPDATE public.customer SET journey_stage =
  CASE
    WHEN total_orders_revenue >= 5 THEN 'campea'
    WHEN total_orders_revenue >= 2 THEN 'recorrente'
    WHEN last_order_date < NOW() - INTERVAL '90 days' THEN 'perdido'
    WHEN last_order_date < NOW() - INTERVAL '60 days' THEN 'risco'
    ELSE 'novo'
  END
WHERE journey_stage IS NULL OR journey_stage = 'novo';
