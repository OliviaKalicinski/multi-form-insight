-- Aumentar precisão das colunas numéricas para suportar valores maiores do Meta Ads
ALTER TABLE ads_data
  ALTER COLUMN cpm TYPE numeric(15,4),
  ALTER COLUMN frequencia TYPE numeric(15,4),
  ALTER COLUMN ctr TYPE numeric(15,6),
  ALTER COLUMN ctr_saida TYPE numeric(15,6),
  ALTER COLUMN custo_por_resultado TYPE numeric(15,4),
  ALTER COLUMN custo_por_visualizacao TYPE numeric(15,4),
  ALTER COLUMN custo_adicao_carrinho TYPE numeric(15,4),
  ALTER COLUMN custo_por_compra TYPE numeric(15,4),
  ALTER COLUMN cpc TYPE numeric(15,4),
  ALTER COLUMN roas_resultados TYPE numeric(15,4),
  ALTER COLUMN gasto TYPE numeric(15,4),
  ALTER COLUMN receita TYPE numeric(15,4);