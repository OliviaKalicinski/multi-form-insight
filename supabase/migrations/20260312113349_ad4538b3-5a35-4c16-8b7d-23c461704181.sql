
-- Campos de identidade da hierarquia Meta
ALTER TABLE public.ads_data
ADD COLUMN IF NOT EXISTS ad_id TEXT,
ADD COLUMN IF NOT EXISTS campaign_id TEXT,
ADD COLUMN IF NOT EXISTS adset_id TEXT;

-- Custo adicional (cpc, cpm, ctr já existem)
ALTER TABLE public.ads_data
ADD COLUMN IF NOT EXISTS cpp NUMERIC(10,4);

-- Conversões (via actions[] da API)
ALTER TABLE public.ads_data
ADD COLUMN IF NOT EXISTS purchases INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS purchase_value NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS add_to_cart INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS initiate_checkout INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_content INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads INTEGER DEFAULT 0;

-- ROAS calculado
ALTER TABLE public.ads_data
ADD COLUMN IF NOT EXISTS roas NUMERIC(10,4);

-- Origem dos dados: 'csv' (upload manual) ou 'api' (Meta API)
ALTER TABLE public.ads_data
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'csv';

-- Índice para buscas por ad_id
CREATE INDEX IF NOT EXISTS idx_ads_data_ad_id ON public.ads_data(ad_id);

-- Constraint de upsert para dados vindos da API (ad_id + data)
CREATE UNIQUE INDEX IF NOT EXISTS ads_data_api_upsert_key
ON public.ads_data(ad_id, data)
WHERE ad_id IS NOT NULL;
