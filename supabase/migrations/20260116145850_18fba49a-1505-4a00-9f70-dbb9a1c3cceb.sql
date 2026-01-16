-- Adicionar constraint única para permitir UPSERT e evitar duplicatas
-- A chave única é: data + campanha + conjunto + anuncio
ALTER TABLE ads_data 
ADD CONSTRAINT ads_data_unique_key 
UNIQUE NULLS NOT DISTINCT (data, campanha, conjunto, anuncio);