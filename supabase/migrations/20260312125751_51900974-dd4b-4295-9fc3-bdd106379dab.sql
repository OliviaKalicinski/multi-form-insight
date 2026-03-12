ALTER TABLE public.followers_data ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'csv';
ALTER TABLE public.marketing_data ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'csv';