-- R09-2: remove ambiguidade de sobrecarga em bulk_update_effective_status.
-- Contexto: logs da edge function sync-meta-ads apontam erro
--   "Could not choose the best candidate function between:
--    public.bulk_update_effective_status(updates => jsonb),
--    public.bulk_update_effective_status(updates => jsonb[])"
-- O PostgreSQL tem 2 versões da função com assinaturas diferentes e não
-- consegue decidir qual chamar via PostgREST. Isso impedia a atualização
-- do effective_status dos anúncios após cada sync.
--
-- Correção: dropar a versão jsonb[] (menos usada) e manter jsonb (que é como
-- supabase-js serializa arrays por padrão via PostgREST).

DROP FUNCTION IF EXISTS public.bulk_update_effective_status(updates jsonb[]);

-- Garantir que a versão jsonb existe (idempotente — não substitui se já certa).
CREATE OR REPLACE FUNCTION public.bulk_update_effective_status(updates jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE public.ads_data
       SET effective_status = item->>'effective_status'
     WHERE ad_id = item->>'ad_id';
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  END LOOP;
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.bulk_update_effective_status(jsonb) IS
  'Atualiza effective_status de múltiplos anúncios em batch. Recebe jsonb array de {ad_id, effective_status}. Versão única após R09-2 (conflito de overload removido).';
