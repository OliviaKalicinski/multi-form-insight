-- R47 (Bloco A auditoria /seguidores): cron job que invoca sync-instagram-organic
-- a cada 6 horas. Bug Bruno: 'os números estão com certeza desatualizados'.
--
-- Causa raiz confirmada: sync-instagram-organic não tinha cron — só rodava
-- quando alguém apertava o botão manual no upload page. Diferente de
-- sync-instagram-comments que tem cron de 30min (R23).
--
-- Frequência: 6h. Seguidores mudam devagar comparado a comentários —
-- não justifica 30min. 6h dá 4 syncs por dia, latência máxima de 6h.
-- A função busca os últimos 30 dias e usa UPSERT (onConflict: data),
-- então rodar várias vezes por dia não duplica nem polui dados.
--
-- IMPORTANTE: substituir <SUPABASE_ANON_KEY> pelo anon key real do projeto
-- antes de rodar esta migration. Mesma key usada no R23 (sync-instagram-comments).
--
-- Pra remover/atualizar o cron depois:
--   SELECT cron.unschedule('sync-instagram-organic-6h');
--
-- Pra ver execuções:
--   SELECT * FROM cron.job_run_details
--     WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-instagram-organic-6h')
--     ORDER BY start_time DESC LIMIT 20;

SELECT cron.schedule(
  'sync-instagram-organic-6h',
  '0 */6 * * *', -- a cada 6h: 00:00, 06:00, 12:00, 18:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://hqpupwtddwcvakhhjvcq.supabase.co/functions/v1/sync-instagram-organic',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUPABASE_ANON_KEY>'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000 -- 2min, pode ser sync mais longo que comments
  ) AS request_id;
  $$
);
