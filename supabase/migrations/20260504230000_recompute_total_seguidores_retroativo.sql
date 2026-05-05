-- R51 (auditoria /seguidores - Bloco C): function pra recalcular total_seguidores
-- retroativo a partir do snapshot atual do perfil.
--
-- Bug Bruno 04/05: 'os seguidores estao como se todos tivessem entrado de uma
-- unica vez nesse mes'. Causa: total_seguidores so eh gravado pra TODAY pelo
-- sync (snapshot do followers_count da Meta API). Dias passados ficam com
-- total_seguidores=NULL, entao o calculo do frontend cai no fallback de
-- somar deltas — que so cobre os dias com sync, dando ilusao de crescimento
-- subito.
--
-- Solucao: assumir que today_total eh ground truth (Meta API confirmou) e
-- reconstruir os totais historicos pela formula:
--
--   total[D] = today_total - sum(novos[D+1..today] - unfollows[D+1..today])
--
-- Em SQL via window function: para cada dia D, calcula a soma cumulativa
-- de (novos - unfollows) dos dias APOS D (na ordem temporal), e subtrai
-- do today_total.
--
-- Uso:
--   SELECT recompute_total_seguidores_retroativo();
--
-- Retorna: numero de rows atualizadas.
--
-- Idempotente: pode rodar varias vezes sem problema.

CREATE OR REPLACE FUNCTION public.recompute_total_seguidores_retroativo()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_total INTEGER;
  today_date DATE;
  rows_updated INTEGER := 0;
BEGIN
  -- Pega o snapshot mais recente (de today), source=api (nao bagunca uploads csv)
  SELECT total_seguidores, data::DATE
  INTO today_total, today_date
  FROM followers_data
  WHERE total_seguidores IS NOT NULL
    AND source = 'api'
  ORDER BY data DESC
  LIMIT 1;

  IF today_total IS NULL THEN
    RAISE NOTICE 'recompute_total_seguidores_retroativo: sem snapshot atual de followers_count, abortando';
    RETURN 0;
  END IF;

  RAISE NOTICE 'recompute_total_seguidores_retroativo: ground truth = % seguidores em %', today_total, today_date;

  -- Reconstrucao via window function
  WITH ordered AS (
    SELECT
      data,
      COALESCE(novos_seguidores, 0) AS n,
      COALESCE(unfollows, 0) AS u
    FROM followers_data
    WHERE data::DATE <= today_date
      AND source = 'api'
  ),
  reverse_cum AS (
    SELECT
      data,
      -- soma de (n - u) dos dias APOS este (ordem DESC = mais recente primeiro)
      -- ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING captura tudo antes
      -- na ordem DESC, ou seja, datas posteriores no tempo real.
      COALESCE(
        SUM(n - u) OVER (
          ORDER BY data DESC
          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ),
        0
      ) AS sum_apos
    FROM ordered
  )
  UPDATE followers_data fd
  SET total_seguidores = today_total - rc.sum_apos
  FROM reverse_cum rc
  WHERE fd.data = rc.data
    AND fd.source = 'api'
    AND fd.data::DATE < today_date; -- nao toca no today (snapshot real)

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE 'recompute_total_seguidores_retroativo: % dias reconstruidos', rows_updated;
  RETURN rows_updated;
END;
$$;

-- Permissoes: authenticated pode executar (pra chamar via supabase.rpc no front)
GRANT EXECUTE ON FUNCTION public.recompute_total_seguidores_retroativo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_total_seguidores_retroativo() TO service_role;
