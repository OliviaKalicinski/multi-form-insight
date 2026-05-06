-- R57: cria tabelas budget_requests + budget_attachments + bucket de storage
--
-- Bug Bruno: feature de anexos em /orcamentos nao funcionava porque tabelas
-- e bucket nao existiam (UI ja estava codada mas backend faltando).
--
-- Cria:
--   1. Tabela public.budget_requests (orçamentos pendentes/aprovados)
--   2. Tabela public.budget_attachments (anexos vinculados ao orçamento)
--   3. Storage bucket public.budget-attachments
--   4. RLS policies authenticated (toda equipe pode ver/criar/editar)
--   5. Trigger updated_at em budget_requests

-- =====================================================
-- 1. budget_requests
-- =====================================================
CREATE TABLE IF NOT EXISTS public.budget_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                    TEXT NOT NULL,
  description              TEXT,
  value                    NUMERIC(12, 2) NOT NULL,
  request_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  event_start_date         DATE,
  event_end_date           DATE,
  deadline_date            DATE NOT NULL,
  justification            TEXT,
  calendar_event_id        UUID REFERENCES public.marketing_calendar(id) ON DELETE SET NULL,
  needs_financial          BOOLEAN NOT NULL DEFAULT false,
  needs_operations         BOOLEAN NOT NULL DEFAULT false,
  needs_marketing          BOOLEAN NOT NULL DEFAULT false,
  financial_status         TEXT NOT NULL DEFAULT 'not_required'
    CHECK (financial_status IN ('pending', 'approved', 'rejected', 'not_required')),
  financial_notes          TEXT,
  financial_approved_at    TIMESTAMPTZ,
  operations_status        TEXT NOT NULL DEFAULT 'not_required'
    CHECK (operations_status IN ('pending', 'approved', 'rejected', 'not_required')),
  operations_notes         TEXT,
  operations_approved_at   TIMESTAMPTZ,
  marketing_status         TEXT NOT NULL DEFAULT 'not_required'
    CHECK (marketing_status IN ('pending', 'approved', 'rejected', 'not_required')),
  marketing_notes          TEXT,
  marketing_approved_at    TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_requests_request_date
  ON public.budget_requests(request_date DESC);

CREATE INDEX IF NOT EXISTS idx_budget_requests_deadline
  ON public.budget_requests(deadline_date);

-- Trigger: updated_at automatico
CREATE OR REPLACE FUNCTION public.set_budget_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_budget_requests_updated_at ON public.budget_requests;
CREATE TRIGGER trg_budget_requests_updated_at
  BEFORE UPDATE ON public.budget_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_budget_requests_updated_at();

-- =====================================================
-- 2. budget_attachments
-- =====================================================
CREATE TABLE IF NOT EXISTS public.budget_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id   UUID NOT NULL REFERENCES public.budget_requests(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  file_size   INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_attachments_budget_id
  ON public.budget_attachments(budget_id);

-- =====================================================
-- 3. RLS Policies (toda equipe autenticada pode ver/editar)
-- =====================================================
ALTER TABLE public.budget_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read budget_requests" ON public.budget_requests;
CREATE POLICY "Authenticated read budget_requests"
  ON public.budget_requests FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated write budget_requests" ON public.budget_requests;
CREATE POLICY "Authenticated write budget_requests"
  ON public.budget_requests FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated read budget_attachments" ON public.budget_attachments;
CREATE POLICY "Authenticated read budget_attachments"
  ON public.budget_attachments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated write budget_attachments" ON public.budget_attachments;
CREATE POLICY "Authenticated write budget_attachments"
  ON public.budget_attachments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =====================================================
-- 4. Storage bucket: budget-attachments (público)
-- =====================================================
-- Padrão público porque o código usa getPublicUrl(). Anexos de orçamento
-- não são dados sensíveis (PDFs internos da equipe).
INSERT INTO storage.buckets (id, name, public)
VALUES ('budget-attachments', 'budget-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies do bucket: authenticated pode upload/delete; leitura é pública
DROP POLICY IF EXISTS "Authenticated upload budget-attachments" ON storage.objects;
CREATE POLICY "Authenticated upload budget-attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'budget-attachments');

DROP POLICY IF EXISTS "Authenticated delete budget-attachments" ON storage.objects;
CREATE POLICY "Authenticated delete budget-attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'budget-attachments');

DROP POLICY IF EXISTS "Public read budget-attachments" ON storage.objects;
CREATE POLICY "Public read budget-attachments"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'budget-attachments');
