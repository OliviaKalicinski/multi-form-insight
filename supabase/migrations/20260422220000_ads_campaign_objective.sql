-- R07-2a: adicionar campaign_objective na tabela ads_data
-- Motivo: sync-meta-ads não salvava o objetivo da campanha, forçando o parser
-- a inferir por métricas (ad com AtC era classificado como Sales, mesmo sendo
-- campanha de Engagement/Traffic). Isso fazia ROAS Total = ROAS Sales e
-- escondia campanhas non-Sales da UI.
-- Após aplicar, re-sincronizar período via botão "Sincronizar Meta Ads".
-- Registros antigos ficam com campaign_objective=NULL até o próximo sync
-- sobrescrever via onConflict(ad_id,data).

ALTER TABLE ads_data
  ADD COLUMN IF NOT EXISTS campaign_objective TEXT;

-- Índice útil para filtros por objetivo no dashboard (group by / where).
CREATE INDEX IF NOT EXISTS idx_ads_data_campaign_objective
  ON ads_data(campaign_objective);

COMMENT ON COLUMN ads_data.campaign_objective IS
  'Objetivo da campanha Meta (OUTCOME_SALES, OUTCOME_ENGAGEMENT, OUTCOME_TRAFFIC, OUTCOME_AWARENESS, OUTCOME_LEADS). Capturado via Graph API /campaigns.';
