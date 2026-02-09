ALTER TABLE ads_data DROP CONSTRAINT IF EXISTS ads_data_unique_key;
ALTER TABLE ads_data 
  ADD CONSTRAINT ads_data_unique_key 
  UNIQUE NULLS NOT DISTINCT (data, campanha, conjunto, anuncio, objetivo);