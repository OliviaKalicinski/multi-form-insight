-- R37-quick: Atendimento sem cliente cadastrado
--
-- Feedback Beatriz (3eb43b72 + 03c4a4bf): pessoas entram em contato pra
-- tirar dúvidas antes de virar cliente. Hoje customer_id é NOT NULL e
-- bloqueia o registro. Solução: torna NULLable + 3 campos opcionais
-- pra capturar contato avulso (nome / whatsapp / email).

ALTER TABLE public.customer_contact_log
  ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE public.customer_contact_log
  ADD COLUMN IF NOT EXISTS contato_nome text,
  ADD COLUMN IF NOT EXISTS contato_whatsapp text,
  ADD COLUMN IF NOT EXISTS contato_email text;

-- Constraint: ou tem customer_id, ou tem ao menos contato_nome (não pode
-- ficar 100% vazio de identificação).
ALTER TABLE public.customer_contact_log
  DROP CONSTRAINT IF EXISTS contact_log_has_identity;
ALTER TABLE public.customer_contact_log
  ADD CONSTRAINT contact_log_has_identity
  CHECK (customer_id IS NOT NULL OR (contato_nome IS NOT NULL AND TRIM(contato_nome) <> ''));
