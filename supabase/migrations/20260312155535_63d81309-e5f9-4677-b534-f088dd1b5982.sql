CREATE TABLE IF NOT EXISTS public.instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL UNIQUE,
  permalink TEXT,
  media_type TEXT,
  caption TEXT,
  published_at TIMESTAMPTZ,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to instagram_posts" ON public.instagram_posts FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.instagram_demographics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  breakdown_type TEXT NOT NULL,
  breakdown_value TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  UNIQUE(breakdown_type, breakdown_value)
);

ALTER TABLE public.instagram_demographics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to instagram_demographics" ON public.instagram_demographics FOR ALL USING (true) WITH CHECK (true);