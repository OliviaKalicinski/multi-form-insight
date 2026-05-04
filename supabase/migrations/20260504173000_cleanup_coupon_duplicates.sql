-- R40 (auditoria #6.5) · Limpar duplicatas de cupom + UNIQUE constraint
--
-- Problema: o `suggestCoupon` aceitava match por prefixo de 3 caracteres
-- e o `selectedSuggestion` não excluía cupons já vinculados a outras.
-- Resultado: 168 influenciadoras todas com 'SIMBAEPULGA' (e provavelmente
-- outros casos similares). KPIs por cupom estão corrompidos.
--
-- Estratégia (decisão Bruno 04/05 - opção A): zerar coupon em TODAS as
-- rows que compartilham cupom duplicado. Bruno revincula manualmente os
-- ~10-20 corretos depois via UI.
--
-- A UNIQUE constraint parcial (WHERE coupon IS NOT NULL) garante que o
-- erro não volta mesmo se o frontend escapar — defesa em camada.

-- ── 1. Snapshot pra auditoria (lê antes de zerar) ────────────────
-- Útil pra Bruno reconstruir os vínculos. Salva em tabela temporária
-- com timestamp do cleanup.
CREATE TABLE IF NOT EXISTS public.coupon_cleanup_audit_20260504 AS
SELECT id, name, instagram, email, coupon
FROM public.influencer_registry
WHERE coupon IS NOT NULL
  AND coupon IN (
    SELECT coupon
    FROM public.influencer_registry
    WHERE coupon IS NOT NULL
    GROUP BY coupon
    HAVING COUNT(*) > 1
  );

-- ── 2. Zerar coupon de todas as rows com cupom duplicado ─────────
UPDATE public.influencer_registry
   SET coupon = NULL,
       updated_at = now()
 WHERE coupon IN (
   SELECT coupon
   FROM public.influencer_registry
   WHERE coupon IS NOT NULL
   GROUP BY coupon
   HAVING COUNT(*) > 1
 );

-- ── 3. UNIQUE INDEX parcial pra prevenir reincidência ───────────
DROP INDEX IF EXISTS public.influencer_registry_coupon_unique;
CREATE UNIQUE INDEX influencer_registry_coupon_unique
  ON public.influencer_registry (coupon)
  WHERE coupon IS NOT NULL;

-- ── 4. Função util pra Bruno consultar a auditoria depois ────────
COMMENT ON TABLE public.coupon_cleanup_audit_20260504 IS
  'R40 — Snapshot de influenciadoras que tinham cupom duplicado antes do cleanup. Bruno consulta pra revincular manualmente: SELECT name, coupon FROM coupon_cleanup_audit_20260504 ORDER BY coupon, name;';
