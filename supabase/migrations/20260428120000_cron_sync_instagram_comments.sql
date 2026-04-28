-- R23: cron job que invoca sync-instagram-comments a cada 30 minutos.
--
-- Pré-requisitos (já satisfeitos em migrations anteriores):
--   - pg_cron habilitada
--   - pg_net habilitada
--
-- IMPORTANTE: substituir <SUPABASE_ANON_KEY> pelo anon key real do projeto
-- antes de rodar esta migration. O anon key está em:
--   Supabase Dashboard → Settings → API → Project API keys → anon public
-- O anon key é seguro de expor no SQL — é o mesmo que vai pro frontend.
-- A edge function usa SERVICE_ROLE internamente via Deno.env.get.
--
-- Pra remover/atualizar o cron depois:
--   SELECT cron.unschedule('sync-instagram-comments-30min');
--
-- Pra ver execuções:
--   SELECT * FROM cron.job_run_details
--     WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-instagram-comments-30min')
--     ORDER BY start_time DESC LIMIT 20;

SELECT cron.schedule(
  'sync-instagram-comments-30min',
  '*/30 * * * *', -- a cada 30 minutos
  $$
  SELECT net.http_post(
    url := 'https://hqpupwtddwcvakhhjvcq.supabase.co/functions/v1/sync-instagram-comments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUPABASE_ANON_KEY>'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);
