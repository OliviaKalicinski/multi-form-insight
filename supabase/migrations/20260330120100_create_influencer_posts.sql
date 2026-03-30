-- ============================================================
-- Migration: Tabela para rastrear posts dos influencers parceiros
-- Ref: Diagnóstico — conteúdo de criadores invisível para o sistema
-- ============================================================

CREATE TABLE IF NOT EXISTS public.influencer_posts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  influencer_name TEXT NOT NULL,
  influencer_instagram TEXT,
  coupon          TEXT,
  post_url        TEXT NOT NULL,
  platform        TEXT DEFAULT 'instagram',
  published_at    DATE,
  likes           INTEGER DEFAULT 0,
  comments        INTEGER DEFAULT 0,
  shares          INTEGER DEFAULT 0,
  reach           INTEGER DEFAULT 0,
  saves           INTEGER DEFAULT 0,
  views           INTEGER DEFAULT 0,
  post_type       TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.influencer_posts IS
  'Posts publicados pelos influencers em seus perfis — métricas inseridas manualmente ou via CSV';

-- RLS: leitura pública, escrita autenticada
ALTER TABLE public.influencer_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_influencer_posts"
  ON public.influencer_posts FOR SELECT
  USING (true);

CREATE POLICY "write_influencer_posts"
  ON public.influencer_posts FOR ALL
  USING (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

-- Índices para queries comuns
CREATE INDEX IF NOT EXISTS idx_influencer_posts_instagram
  ON public.influencer_posts(influencer_instagram);
CREATE INDEX IF NOT EXISTS idx_influencer_posts_published
  ON public.influencer_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_influencer_posts_coupon
  ON public.influencer_posts(coupon);
