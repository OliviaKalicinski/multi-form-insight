DROP INDEX IF EXISTS public.ads_data_api_upsert_key;
ALTER TABLE public.ads_data ADD CONSTRAINT ads_data_ad_id_data_unique UNIQUE (ad_id, data);