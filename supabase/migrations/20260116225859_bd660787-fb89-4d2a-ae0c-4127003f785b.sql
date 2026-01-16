-- Insert default sector_benchmarks setting
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES (
  'sector_benchmarks',
  '{
    "ticketMedio": 180,
    "taxaConversao": 1.2,
    "roasMedio": 3.2,
    "roasMinimo": 2.5,
    "roasExcelente": 4.0,
    "ctr": 1.8,
    "cpc": 0.45,
    "cac": 45,
    "taxaRecompra": 38,
    "taxaChurn": 28,
    "ltv": 420,
    "margemLiquida": 22,
    "seguidoresMes": null,
    "dataReferencia": "2024-01",
    "fonte": "Relatório Mercado Pet Brasil 2024 + ABINPET + Shopify Benchmark Reports"
  }'::jsonb,
  'Benchmarks do setor Pet Food para comparação'
)
ON CONFLICT (setting_key) DO NOTHING;