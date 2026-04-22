-- =============================================================================
-- Rodada 04 — influencer_registry.kanban_status DEFAULT 'prospeccao'
-- =============================================================================
-- Objetivo: garantir que novos registros criados via CSV import
-- (CadastroInfluenciadores → upsert em influencer_registry) entrem
-- automaticamente na coluna "Prospecção" do kanban, em vez de ficarem
-- invisíveis por causa de kanban_status NULL.
--
-- IMPORTANTE: preserva o padrão de "soft-delete/arquivar" via UPDATE
-- SET kanban_status = NULL. Esta migração NÃO altera registros existentes;
-- apenas define o default para futuros INSERTs que omitam a coluna.
-- =============================================================================

BEGIN;

ALTER TABLE public.influencer_registry
  ALTER COLUMN kanban_status SET DEFAULT 'prospeccao';

COMMIT;

-- Verificação (manual):
-- SELECT column_name, column_default
-- FROM information_schema.columns
-- WHERE table_schema='public'
--   AND table_name='influencer_registry'
--   AND column_name='kanban_status';
