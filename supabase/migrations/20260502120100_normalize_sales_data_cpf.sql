-- R31-A · Bug #3: Reclamação não acha pedidos do cliente
-- (Maitê Romão / pedido 1235 — feedback Beatriz 22/04/2026)
--
-- Causa raiz:
--   sales_data.cpf_cnpj foi backfilled de cliente_email, que vem da NF
--   formatado ("123.456.789-00"). Já customer.cpf_cnpj é digits-only
--   ("12345678900") porque NewCustomerDialog normaliza antes de salvar.
--   A query de ReclamacaoNova faz `.eq("cpf_cnpj", customer.cpf_cnpj)` →
--   mismatch → "nenhum pedido encontrado".
--
-- O mesmo mismatch contamina:
--   - Kanban Operacional (não puxa CNPJ do cliente já cadastrado — #6)
--   - useCustomerData (lookup de pedidos pelo cliente)
--   - qualquer JOIN entre customer e sales_data
--
-- Solução: normalizar para digits-only no banco (1× backfill + trigger
-- BEFORE INSERT/UPDATE pra manter limpo daqui pra frente).
--
-- Trade-off considerado:
--   - Padrão do CRM brasileiro é guardar com pontuação pra display.
--     Mas display é responsabilidade do frontend (formatCpfCnpj já existe
--     em ReclamacaoNova). Banco mantém canônico.
--   - Risco: se alguma outra query usa `LIKE '%.%'` em cpf_cnpj, quebra.
--     Verificado: as queries atuais usam `.eq()`, não há grep com pattern
--     formatado.

-- ── 1. Trigger function ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_sales_data_cpf()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.cpf_cnpj IS NOT NULL THEN
    NEW.cpf_cnpj := regexp_replace(NEW.cpf_cnpj, '[^0-9]', '', 'g');
    -- Se sobrou string vazia depois da limpeza (ex: era só pontuação),
    -- vira NULL pra não criar chave canhota.
    IF NEW.cpf_cnpj = '' THEN
      NEW.cpf_cnpj := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 2. Trigger ──────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_normalize_sales_data_cpf ON public.sales_data;
CREATE TRIGGER trg_normalize_sales_data_cpf
  BEFORE INSERT OR UPDATE OF cpf_cnpj ON public.sales_data
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_sales_data_cpf();

-- ── 3. Backfill ─────────────────────────────────────────────────
-- Só linhas que de fato têm pontuação (evita rewrite total da tabela).
UPDATE public.sales_data
SET cpf_cnpj = regexp_replace(cpf_cnpj, '[^0-9]', '', 'g')
WHERE cpf_cnpj IS NOT NULL
  AND cpf_cnpj ~ '[^0-9]';

-- Limpa strings vazias geradas (registros com cpf_cnpj só de pontuação).
UPDATE public.sales_data
SET cpf_cnpj = NULL
WHERE cpf_cnpj = '';

-- ── 4. Re-recalcular customers afetados ─────────────────────────
-- Como recalculate_customer usa COALESCE(cpf_cnpj, cliente_email) como
-- chave, depois do backfill alguns clientes que antes batiam por
-- cliente_email (formatado) agora batem por cpf_cnpj (limpo). Roda
-- recalculate_all_customers pra reconciliar agregados.
SELECT public.recalculate_all_customers();

-- ── 5. Index pra queries por CPF (acelera /reclamacoes/nova) ────
CREATE INDEX IF NOT EXISTS idx_sales_data_cpf_cnpj
  ON public.sales_data (cpf_cnpj)
  WHERE cpf_cnpj IS NOT NULL;
