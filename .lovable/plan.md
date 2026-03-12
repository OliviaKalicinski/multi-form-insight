

## Plano: sync-meta-ads (Edge Function + Migração + Cron)

### Contexto
A tabela `ads_data` já possui `cpc`, `cpm`, `ctr`, `gasto`, `impressoes`, `alcance`, `cliques`, `conversoes`, `receita`, `campanha`, `conjunto`, `anuncio`, `data`. Precisamos adicionar campos da Meta API e criar a Edge Function.

### 1. Migração SQL (via migration tool)
Adicionar à tabela `ads_data`:
- `ad_id`, `campaign_id`, `adset_id` (identidade Meta)
- `cpp` (custo por mil que falta — cpc/cpm/ctr já existem)
- `purchases`, `purchase_value`, `add_to_cart`, `initiate_checkout`, `view_content`, `leads` (conversões)
- `roas` (calculado)
- `source` (default `'csv'`)
- Índice em `ad_id` + unique index condicional `(ad_id, data) WHERE ad_id IS NOT NULL`

Nota: as colunas `cpc`, `cpm`, `ctr` já existem — o SQL usa `ADD COLUMN IF NOT EXISTS`, então não há conflito.

### 2. Edge Function
Criar `supabase/functions/sync-meta-ads/index.ts` com o código fornecido. Usa `SUPABASE_SERVICE_ROLE_KEY` (disponível automaticamente) para bypass de RLS no upsert.

### 3. Cron diário (via insert tool, não migration)
Habilitar extensões `pg_cron` e `pg_net`, depois agendar:
```sql
SELECT cron.schedule(
  'sync-meta-ads-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://hqpupwtddwcvakhhjvcq.supabase.co/functions/v1/sync-meta-ads',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcHVwd3RkZHdjdmFraGhqdmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODIwNDIsImV4cCI6MjA4MzU1ODA0Mn0.BYypkz_p48cVEbhJp2rLErGdaEwpW2VrgVGN4XnMm3M"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### Ordem de execução
1. Migração SQL (schema)
2. Criar Edge Function (deploy automático)
3. Habilitar `pg_cron` + `pg_net` e agendar cron (via insert tool)

