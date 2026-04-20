-- Shopify import support
-- Adds idempotency column to customer and an audit log table for imports.

-- 1. shopify_customer_id em customer (chave vinda do export do Shopify)
ALTER TABLE public.customer
  ADD COLUMN IF NOT EXISTS shopify_customer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS unique_customer_shopify_id
  ON public.customer(shopify_customer_id)
  WHERE shopify_customer_id IS NOT NULL;

-- 2. Log de auditoria das importações
CREATE TABLE IF NOT EXISTS public.shopify_import_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  total_rows integer NOT NULL DEFAULT 0,
  matched_shopify_id integer NOT NULL DEFAULT 0,
  matched_email integer NOT NULL DEFAULT 0,
  matched_phone integer NOT NULL DEFAULT 0,
  matched_name integer NOT NULL DEFAULT 0,
  created_new integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  error_details jsonb DEFAULT '[]',
  dry_run boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid()
);

ALTER TABLE public.shopify_import_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read shopify_import_log"
  ON public.shopify_import_log FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert shopify_import_log"
  ON public.shopify_import_log FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can delete shopify_import_log"
  ON public.shopify_import_log FOR DELETE
  TO authenticated USING (public.is_admin(auth.uid()));

COMMENT ON COLUMN public.customer.shopify_customer_id
  IS 'ID do cliente no Shopify (do export CSV). Usado pra idempotência em reimportações.';

COMMENT ON TABLE public.shopify_import_log
  IS 'Auditoria de cada execução da Edge Function import-shopify-customers.';
