-- R36-fix · Adiciona coluna data_primeiro_contato em influencer_registry
--
-- Causa do bug Beatriz "Nomes não estão sendo editados" (28/04):
--   formToDbRow mandava data_primeiro_contato no payload de UPDATE, mas
--   a coluna nunca foi criada no DB. Supabase falhava com erro
--   "Could not find the 'data_primeiro_contato' column...". Sem onError
--   na mutation, o erro era silenciado e a UI dava ilusão de save.
--
-- A feature já existia no frontend (campo no modal, badge no card).
-- Só faltava a coluna.

ALTER TABLE public.influencer_registry
  ADD COLUMN IF NOT EXISTS data_primeiro_contato date;
