-- ============================================================
-- Migration: Tabela de performance de SEO/Blog
-- Ref: Diagnóstico — SEO sem estrutura de suporte (Desconexão 2)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.blog_performance (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_url        TEXT NOT NULL,
  post_title      TEXT NOT NULL,
  post_type       TEXT DEFAULT 'cluster',
  published_at    DATE,
  word_count      INTEGER DEFAULT 0,
  target_keyword  TEXT,
  keyword_position INTEGER,
  sessions        INTEGER DEFAULT 0,
  pageviews       INTEGER DEFAULT 0,
  avg_time_on_page NUMERIC(8,2) DEFAULT 0,
  bounce_rate     NUMERIC(5,2) DEFAULT 0,
  transactions    INTEGER DEFAULT 0,
  revenue         NUMERIC(14,2) DEFAULT 0,
  organic_clicks  INTEGER DEFAULT 0,
  organic_impressions INTEGER DEFAULT 0,
  ctr             NUMERIC(5,2) DEFAULT 0,
  backlinks       INTEGER DEFAULT 0,
  internal_links  INTEGER DEFAULT 0,
  measured_at     DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.blog_performance IS
  'Performance dos posts do blog: keyword position, tráfego, conversões — atualizado semanal';

COMMENT ON COLUMN public.blog_performance.post_type IS
  'Tipo do post: pillar (2500+ palavras) | cluster (700-1200) | hub';

-- RLS
ALTER TABLE public.blog_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_blog_performance"
  ON public.blog_performance FOR SELECT
  USING (true);

CREATE POLICY "write_blog_performance"
  ON public.blog_performance FOR ALL
  USING (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

-- Índices
CREATE INDEX IF NOT EXISTS idx_blog_perf_keyword
  ON public.blog_performance(target_keyword);
CREATE INDEX IF NOT EXISTS idx_blog_perf_measured
  ON public.blog_performance(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_perf_url
  ON public.blog_performance(post_url);
