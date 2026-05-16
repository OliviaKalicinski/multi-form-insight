-- R76: repositorio central de relatorios da empresa.
--
-- Cria:
--   1. Tabela public.company_reports
--   2. Storage bucket 'company-reports' (privado, file_size_limit 100MB)
--   3. RLS: todos authenticated leem; INSERT exige uploaded_by=auth.uid();
--      UPDATE/DELETE so do dono. Storage segue mesma regra.
--
-- Decisao Bruno (16/05): 6 categorias fixas, delete so dono, 100MB max.

-- =====================================================
-- 1. Tabela
-- =====================================================
CREATE TABLE IF NOT EXISTS public.company_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT,
  file_name         TEXT NOT NULL,
  file_path         TEXT NOT NULL,
  file_size         BIGINT NOT NULL DEFAULT 0,
  file_type         TEXT,
  category          TEXT NOT NULL DEFAULT 'Outros'
    CHECK (category IN ('Financeiro','Marketing','Operacional','Comercial','Estratégico','Outros')),
  uploaded_by       UUID,
  uploaded_by_email TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_reports_category
  ON public.company_reports (category);
CREATE INDEX IF NOT EXISTS idx_company_reports_created_at
  ON public.company_reports (created_at DESC);

-- =====================================================
-- 2. RLS
-- =====================================================
ALTER TABLE public.company_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read company_reports" ON public.company_reports;
CREATE POLICY "Authenticated read company_reports"
  ON public.company_reports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert company_reports" ON public.company_reports;
CREATE POLICY "Authenticated insert company_reports"
  ON public.company_reports FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Owner update company_reports" ON public.company_reports;
CREATE POLICY "Owner update company_reports"
  ON public.company_reports FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Owner delete company_reports" ON public.company_reports;
CREATE POLICY "Owner delete company_reports"
  ON public.company_reports FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- =====================================================
-- 3. Storage bucket (privado, 100MB)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('company-reports', 'company-reports', false, 104857600)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 104857600;

-- Storage policies
DROP POLICY IF EXISTS "Authenticated upload company-reports" ON storage.objects;
CREATE POLICY "Authenticated upload company-reports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-reports');

DROP POLICY IF EXISTS "Authenticated read company-reports" ON storage.objects;
CREATE POLICY "Authenticated read company-reports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-reports');

DROP POLICY IF EXISTS "Owner delete company-reports" ON storage.objects;
CREATE POLICY "Owner delete company-reports"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-reports' AND owner = auth.uid());
