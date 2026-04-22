-- =============================================================================
-- Rodada 03 — kanban_status_history + trigger + backfill idempotente
-- =============================================================================
-- Objetivo: capturar cada transição de kanban_status para permitir medir
-- quantos influenciadores entraram em cada coluna por semana/mês/trimestre.
-- =============================================================================

BEGIN;

-- 1) Tabela de histórico
CREATE TABLE IF NOT EXISTS public.kanban_status_history (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id   uuid        NOT NULL REFERENCES public.influencer_registry(id) ON DELETE CASCADE,
  old_status      text,
  new_status      text        NOT NULL,
  changed_at      timestamptz NOT NULL DEFAULT now(),
  changed_by      uuid,           -- auth.users.id quando disponível
  source          text        NOT NULL DEFAULT 'trigger'   -- 'trigger' | 'backfill' | 'manual'
);

CREATE INDEX IF NOT EXISTS idx_ksh_changed_at
  ON public.kanban_status_history (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ksh_new_status_changed_at
  ON public.kanban_status_history (new_status, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ksh_influencer
  ON public.kanban_status_history (influencer_id);

-- 2) RLS
ALTER TABLE public.kanban_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read kanban_status_history" ON public.kanban_status_history;
CREATE POLICY "Authenticated can read kanban_status_history"
  ON public.kanban_status_history
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert kanban_status_history" ON public.kanban_status_history;
CREATE POLICY "Authenticated can insert kanban_status_history"
  ON public.kanban_status_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3) Função trigger
CREATE OR REPLACE FUNCTION public.log_kanban_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF NEW.kanban_status IS DISTINCT FROM OLD.kanban_status THEN
    INSERT INTO public.kanban_status_history
      (influencer_id, old_status, new_status, changed_at, changed_by, source)
    VALUES
      (NEW.id, OLD.kanban_status, NEW.kanban_status, now(), auth.uid(), 'trigger');
  END IF;
  RETURN NEW;
END;
$func$;

-- 4) Trigger (AFTER UPDATE OF kanban_status)
DROP TRIGGER IF EXISTS trg_log_kanban_status_change ON public.influencer_registry;
CREATE TRIGGER trg_log_kanban_status_change
  AFTER UPDATE OF kanban_status ON public.influencer_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.log_kanban_status_change();

-- 5) Backfill idempotente (só roda se ainda não existir entrada 'backfill' pra aquele status)
-- 5a) "Entrou em em_contato"
-- Preferência de data: data_primeiro_contato (se a coluna existir) → updated_at → created_at
INSERT INTO public.kanban_status_history (influencer_id, old_status, new_status, changed_at, source)
SELECT
  r.id,
  NULL,
  'em_contato',
  COALESCE(
    NULLIF(to_jsonb(r) ->> 'data_primeiro_contato', '')::timestamptz,
    r.updated_at,
    r.created_at
  ),
  'backfill'
FROM public.influencer_registry r
WHERE r.kanban_status IN ('em_contato','registrado_inflows','seeding_enviado','postou','parceiro')
  AND NOT EXISTS (
    SELECT 1 FROM public.kanban_status_history h
    WHERE h.influencer_id = r.id
      AND h.new_status = 'em_contato'
      AND h.source = 'backfill'
  );

-- 5b) "Virou parceiro"
INSERT INTO public.kanban_status_history (influencer_id, old_status, new_status, changed_at, source)
SELECT
  r.id,
  'em_contato',
  'parceiro',
  COALESCE(r.updated_at, r.created_at),
  'backfill'
FROM public.influencer_registry r
WHERE r.kanban_status = 'parceiro'
  AND NOT EXISTS (
    SELECT 1 FROM public.kanban_status_history h
    WHERE h.influencer_id = r.id
      AND h.new_status = 'parceiro'
      AND h.source = 'backfill'
  );

COMMIT;

-- =============================================================================
-- Sanity check (rodar manualmente após o BEGIN/COMMIT):
--
-- SELECT new_status, source, COUNT(*), MIN(changed_at), MAX(changed_at)
-- FROM public.kanban_status_history
-- GROUP BY 1, 2 ORDER BY 1, 2;
--
-- Deve mostrar alguns 'backfill' de 'em_contato' e 'parceiro'.
-- Daí em diante, toda mudança de status via UPDATE no influencer_registry
-- criará uma linha com source='trigger'.
-- =============================================================================
