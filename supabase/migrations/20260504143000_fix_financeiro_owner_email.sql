-- R37-fix: corrigir email do owner do Modelo Financeiro
--
-- Email correto: bruno.multedo@letsfly.com.br (era multedob@gmail.com no R37).
-- Idempotente: dropa policies existentes e recria com email correto.

DROP POLICY IF EXISTS "Owner can read financial_monthly" ON public.financial_monthly;
DROP POLICY IF EXISTS "Owner can write financial_monthly" ON public.financial_monthly;

CREATE POLICY "Owner can read financial_monthly"
  ON public.financial_monthly FOR SELECT
  TO authenticated
  USING (auth.email() = 'bruno.multedo@letsfly.com.br');

CREATE POLICY "Owner can write financial_monthly"
  ON public.financial_monthly FOR ALL
  TO authenticated
  USING (auth.email() = 'bruno.multedo@letsfly.com.br')
  WITH CHECK (auth.email() = 'bruno.multedo@letsfly.com.br');
