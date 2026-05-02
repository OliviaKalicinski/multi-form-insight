-- R31-A · Bug #1: RLS bloqueia criar cliente
--
-- Contexto:
--   A migration 20260227132217 definiu INSERT/UPDATE/DELETE em `customer`
--   exigindo `is_admin(auth.uid())`. Atendentes operacionais (Beatriz e
--   companhia) não estão na role `admin` → erro:
--     "new row violates row-level security policy for table customer"
--
-- Decisão (Bruno · 02/05/2026):
--   O dashboard é interno, time pequeno, todo authenticated user já é
--   confiável. Granularidade admin/non-admin sobre `customer` não compensa
--   o atrito operacional. Relaxar para `WITH CHECK (true)` em authenticated.
--
-- Mesma decisão aplicada em customer_identifier (telefone/email salvos
-- junto no NewCustomerDialog — se a INSERT lá falhasse com is_admin,
-- o cliente entrava sem contato).

-- ── customer ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert customer" ON public.customer;
DROP POLICY IF EXISTS "Admins can update customer" ON public.customer;
DROP POLICY IF EXISTS "Admins can delete customer" ON public.customer;

CREATE POLICY "Authenticated users can insert customer"
  ON public.customer FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer"
  ON public.customer FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customer"
  ON public.customer FOR DELETE
  TO authenticated
  USING (true);

-- ── customer_identifier ──────────────────────────────────────────
-- Sem garantia de qual conjunto exato de policies existe; dropamos os
-- nomes prováveis e recriamos limpos.
DROP POLICY IF EXISTS "Admins can insert customer_identifier" ON public.customer_identifier;
DROP POLICY IF EXISTS "Admins can update customer_identifier" ON public.customer_identifier;
DROP POLICY IF EXISTS "Admins can delete customer_identifier" ON public.customer_identifier;
DROP POLICY IF EXISTS "Admins manage customer_identifier" ON public.customer_identifier;

-- Garante leitura também (caso ainda não exista)
DROP POLICY IF EXISTS "Authenticated users can read customer_identifier" ON public.customer_identifier;
CREATE POLICY "Authenticated users can read customer_identifier"
  ON public.customer_identifier FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer_identifier"
  ON public.customer_identifier FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer_identifier"
  ON public.customer_identifier FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customer_identifier"
  ON public.customer_identifier FOR DELETE
  TO authenticated
  USING (true);
