-- R31-C · Auto-merge de duplicatas por mesmo CPF (formatos diferentes)
--
-- Diagnóstico:
--   3.015 customer rows são duplicatas onde o cpf_cnpj é o MESMO em
--   digits-only mas armazenado em formatos diferentes ("146.503.158-XX"
--   vs "14650315883"). Causa raiz: NF antiga importou com pontuação,
--   NewCustomerDialog mais novo salva digits-only. R31-A normalizou
--   sales_data.cpf_cnpj mas esqueci customer.cpf_cnpj.
--
-- Como isso é 100% seguro pra auto-merge:
--   CPF é único por lei. Se 2 customers têm o mesmo CPF normalizado,
--   é provadamente a mesma pessoa — zero risco de homônimo.
--
-- Estratégia:
--   1. Função `auto_merge_same_cpf_duplicates(p_limit)` processa em
--      batches pra não estourar timeout do SQL Editor.
--   2. Pra cada grupo de mesmo cpf_norm:
--      a. Escolhe primary = mais total_orders_revenue (desempate created_at)
--      b. Move cpf_cnpj dos secondaries pra `merged-{uuid}` (libera
--         o cpf_norm pra ser ocupado pelo primary).
--      c. Atualiza primary.cpf_cnpj = cpf_norm.
--      d. Chama merge_customers(primary, secondary) — função existente
--         já move identifiers, complaints, contact_logs, recalcula
--         métricas e desativa o secondary.
--   3. Trigger BEFORE INSERT/UPDATE em customer pra prevenir CPF
--      formatado entrar de novo no futuro.
--
-- Como rodar:
--   SELECT * FROM auto_merge_same_cpf_duplicates(200);
--   -- Retorna (groups_processed, secondaries_merged). Repetir até
--   -- ambos retornarem 0. Estimativa: ~15 chamadas pra processar 3.015.

CREATE OR REPLACE FUNCTION public.auto_merge_same_cpf_duplicates(p_limit int DEFAULT 200)
RETURNS TABLE(groups_processed int, secondaries_merged int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
  v_primary_id uuid;
  v_secondary_ids uuid[];
  v_sec_id uuid;
  v_groups int := 0;
  v_secondaries int := 0;
BEGIN
  FOR rec IN
    SELECT
      regexp_replace(cpf_cnpj, '[^0-9]', '', 'g') AS cpf_norm,
      array_agg(id ORDER BY COALESCE(total_orders_revenue, 0) DESC, created_at ASC) AS ids
    FROM customer
    WHERE is_active = true
      AND merged_into IS NULL
      AND cpf_cnpj IS NOT NULL
      AND cpf_cnpj NOT LIKE 'shopify-%'
      AND cpf_cnpj NOT LIKE 'nf-%'
      AND cpf_cnpj NOT LIKE 'merged-%'
    GROUP BY regexp_replace(cpf_cnpj, '[^0-9]', '', 'g')
    HAVING COUNT(*) > 1
       AND LENGTH(regexp_replace(cpf_cnpj, '[^0-9]', '', 'g')) IN (11, 14)
    LIMIT p_limit
  LOOP
    v_primary_id := rec.ids[1];
    v_secondary_ids := rec.ids[2:];

    -- 1. Move secondary cpf_cnpj para "merged-{uuid}" — libera o cpf_norm
    --    pra primary ocupar sem violar UNIQUE.
    FOREACH v_sec_id IN ARRAY v_secondary_ids LOOP
      UPDATE customer
         SET cpf_cnpj = 'merged-' || v_sec_id::text
       WHERE id = v_sec_id;
    END LOOP;

    -- 2. Normaliza o primary pra digits-only (cpf_norm).
    --    Importante fazer ANTES do merge — merge_customers chama
    --    recalculate_customer(primary.cpf_cnpj) no fim, e sales_data
    --    já está em digits-only desde R31-A.
    UPDATE customer SET cpf_cnpj = rec.cpf_norm WHERE id = v_primary_id;

    -- 3. Mergear cada secondary no primary.
    FOREACH v_sec_id IN ARRAY v_secondary_ids LOOP
      PERFORM merge_customers(v_primary_id, v_sec_id);
      v_secondaries := v_secondaries + 1;
    END LOOP;

    v_groups := v_groups + 1;
  END LOOP;

  RETURN QUERY SELECT v_groups, v_secondaries;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_merge_same_cpf_duplicates(int) TO authenticated;

-- ── Trigger pra prevenir CPF formatado entrar no futuro ───────────────
CREATE OR REPLACE FUNCTION public.normalize_customer_cpf()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.cpf_cnpj IS NOT NULL
     AND NEW.cpf_cnpj NOT LIKE 'shopify-%'
     AND NEW.cpf_cnpj NOT LIKE 'nf-%'
     AND NEW.cpf_cnpj NOT LIKE 'merged-%'
     AND NEW.cpf_cnpj ~ '[^0-9]'
  THEN
    NEW.cpf_cnpj := regexp_replace(NEW.cpf_cnpj, '[^0-9]', '', 'g');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_customer_cpf ON public.customer;
CREATE TRIGGER trg_normalize_customer_cpf
  BEFORE INSERT OR UPDATE OF cpf_cnpj ON public.customer
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_customer_cpf();

-- ── Backfill de customers solitários (cpf_cnpj formatado mas único) ──
-- Trigger acima já vai pegar futuros UPDATEs, mas backfilla os que
-- estão hoje formatados sem duplicata (não passariam pela função
-- auto_merge porque ela só processa grupos com COUNT > 1).
-- Faz isso AQUI agora — qualquer UPDATE em cpf_cnpj que cruzar a
-- normalização será capturado pelo trigger.
UPDATE public.customer
   SET cpf_cnpj = regexp_replace(cpf_cnpj, '[^0-9]', '', 'g')
 WHERE is_active = true
   AND cpf_cnpj IS NOT NULL
   AND cpf_cnpj NOT LIKE 'shopify-%'
   AND cpf_cnpj NOT LIKE 'nf-%'
   AND cpf_cnpj NOT LIKE 'merged-%'
   AND cpf_cnpj ~ '[^0-9]'
   -- Safety: só atualiza se o digits-only resultante NÃO já existir
   -- em outra row ativa (caso de edge dos 3.015 que serão tratados
   -- pela função auto_merge — não conflita aqui).
   AND NOT EXISTS (
     SELECT 1 FROM public.customer c2
     WHERE c2.id <> public.customer.id
       AND c2.cpf_cnpj = regexp_replace(public.customer.cpf_cnpj, '[^0-9]', '', 'g')
   );
