-- Limpar dados existentes (sem upload_id)
DELETE FROM sales_data;
DELETE FROM ads_data;
DELETE FROM followers_data;
DELETE FROM marketing_data;
DELETE FROM upload_history;

-- Adicionar coluna upload_id às tabelas de dados
ALTER TABLE sales_data ADD COLUMN upload_id UUID REFERENCES upload_history(id) ON DELETE CASCADE;
ALTER TABLE ads_data ADD COLUMN upload_id UUID REFERENCES upload_history(id) ON DELETE CASCADE;
ALTER TABLE followers_data ADD COLUMN upload_id UUID REFERENCES upload_history(id) ON DELETE CASCADE;
ALTER TABLE marketing_data ADD COLUMN upload_id UUID REFERENCES upload_history(id) ON DELETE CASCADE;

-- Criar índices para performance
CREATE INDEX idx_sales_data_upload_id ON sales_data(upload_id);
CREATE INDEX idx_ads_data_upload_id ON ads_data(upload_id);
CREATE INDEX idx_followers_data_upload_id ON followers_data(upload_id);
CREATE INDEX idx_marketing_data_upload_id ON marketing_data(upload_id);