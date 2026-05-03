-- R34 · Corrigir mojibake (UTF-8 lido como Latin-1) em influencer_registry
--
-- Diagnóstico:
--   "Hotel Ecológico" virou "Hotel EcolÃ³gico" — clássico mojibake. Bytes
--   UTF-8 da letra "ó" (0xC3 0xB3) foram interpretados como 2 chars
--   Latin-1 ("Ã" + "³"). Aconteceu na importação CSV/XLSX.
--
-- Padrões afetados (casos comuns):
--   ó → Ã³    é → Ã©    á → Ã¡    ã → Ã£    ç → Ã§
--   ú → Ãº    í → Ã­    ô → Ã´    ê → Ãª    õ → Ãµ
--   à → Ã    â → Ã¢    Ç → Ã‡    É → Ã‰    etc.
--
-- Estratégia:
--   1. Função `fix_mojibake(text)` tenta reverter via convert_from/to
--      LATIN1↔UTF8. Heurística de segurança: só aceita conversão se
--      resultado tem MENOS 'Ã' que original (senão não era mojibake).
--   2. Backfill em influencer_registry (name + razao_social).
--   3. Trigger BEFORE INSERT/UPDATE pra prevenir mojibake entrar de novo.

-- ── Função de conversão ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fix_mojibake(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  fixed text;
  orig_count int;
  fixed_count int;
BEGIN
  IF input IS NULL OR input = '' THEN
    RETURN input;
  END IF;

  -- Sem 'Ã' → não tem mojibake do tipo UTF8-as-Latin1.
  IF input !~ 'Ã' THEN
    RETURN input;
  END IF;

  -- Tenta inverter: encoda string atual como Latin-1, depois decoda
  -- esses bytes como UTF-8. Se a string realmente era mojibake,
  -- volta ao texto original.
  BEGIN
    fixed := convert_from(convert_to(input, 'LATIN1'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    -- Falhou (provavelmente char fora de Latin-1) — devolve original
    RETURN input;
  END;

  -- Heurística anti-falso-positivo: se a versão "corrigida" tem MAIS
  -- ou MESMO número de 'Ã' que a original, não era mojibake real.
  orig_count := length(input) - length(replace(input, 'Ã', ''));
  fixed_count := length(fixed) - length(replace(fixed, 'Ã', ''));

  IF fixed_count < orig_count THEN
    RETURN fixed;
  END IF;

  RETURN input;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fix_mojibake(text) TO authenticated;

-- ── Backfill de influencer_registry ──────────────────────────────────
UPDATE public.influencer_registry
   SET name = public.fix_mojibake(name)
 WHERE name IS NOT NULL AND name ~ 'Ã';

UPDATE public.influencer_registry
   SET razao_social = public.fix_mojibake(razao_social)
 WHERE razao_social IS NOT NULL AND razao_social ~ 'Ã';

UPDATE public.influencer_registry
   SET address_logradouro = public.fix_mojibake(address_logradouro)
 WHERE address_logradouro IS NOT NULL AND address_logradouro ~ 'Ã';

UPDATE public.influencer_registry
   SET address_bairro = public.fix_mojibake(address_bairro)
 WHERE address_bairro IS NOT NULL AND address_bairro ~ 'Ã';

UPDATE public.influencer_registry
   SET address_cidade = public.fix_mojibake(address_cidade)
 WHERE address_cidade IS NOT NULL AND address_cidade ~ 'Ã';

UPDATE public.influencer_registry
   SET kanban_observacoes = public.fix_mojibake(kanban_observacoes)
 WHERE kanban_observacoes IS NOT NULL AND kanban_observacoes ~ 'Ã';

-- ── Trigger: aplicar fix_mojibake em INSERTs e UPDATEs futuros ───────
CREATE OR REPLACE FUNCTION public.normalize_influencer_text_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.name := public.fix_mojibake(NEW.name);
  NEW.razao_social := public.fix_mojibake(NEW.razao_social);
  NEW.address_logradouro := public.fix_mojibake(NEW.address_logradouro);
  NEW.address_bairro := public.fix_mojibake(NEW.address_bairro);
  NEW.address_cidade := public.fix_mojibake(NEW.address_cidade);
  NEW.kanban_observacoes := public.fix_mojibake(NEW.kanban_observacoes);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_influencer_text ON public.influencer_registry;
CREATE TRIGGER trg_normalize_influencer_text
  BEFORE INSERT OR UPDATE ON public.influencer_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_influencer_text_fields();
