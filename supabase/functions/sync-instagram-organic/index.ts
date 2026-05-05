// R48: reescrita por causa do bug de total_value mascarando metricas zeradas.
//
// Bug Bruno 04/05/2026: dashboard /seguidores mostrava Interacoes 0, Visitas 0,
// Cliques 0, Total Acumulado 100. Confirmado via export do Meta Business Suite
// que os valores REAIS sao centenas/milhares por dia.
//
// Causa raiz: a versao anterior do parser fetchMetric so lia json.data[].values[]
// e ignorava json.data[].total_value.value. Quando metric_type=total_value,
// a Meta v20 retorna { total_value: { value: N }, values: [] } — o parser
// devolvia [] e nada chegava no banco.
//
// Mudanca arquitetural:
// 1. Metricas com metric_type=total_value precisam de 1 chamada POR DIA
//    porque a API agrega no range. Pra ter serie diaria, faz loop com
//    since=D, until=D+1.
// 2. fetchDailyMetric le tanto total_value.value quanto values[0].value
//    (compatibilidade com endpoints antigos).
// 3. fetchRangeMetric mantido para 'reach' que ainda funciona como time series.
// 4. total_seguidores agora gravado pra today SEMPRE — antes dependia
//    de byDate ter row pra hoje.
// 5. Body aceita { days: N } pra backfill historico (default 7).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IG_ACCOUNT_ID = "17841470017662704";
const META_API = "https://graph.facebook.com/v20.0";

// R49: paralelismo via Promise.all de N métricas por dia + sleep entre dias.
// Antes (R48): loop sequencial dia × métrica = 30d × 7 × 80ms = 17s só de sleep.
// Agora (R49): 30d × (1 batch paralelo de 7 + 100ms sleep) ≈ 5s.
// Cabe no limite de 150s do Supabase Edge mesmo pra 60d.
const SLEEP_BETWEEN_DAYS_MS = 100;
const MAX_DAYS_PER_CALL = 60; // R49 (A): limite duro. 12 meses estourava 150s.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Helpers ─────────────────────────────────────────────────────────────────
function enumerateDates(since: string, until: string): string[] {
  const dates: string[] = [];
  const cur = new Date(since + "T00:00:00Z");
  const end = new Date(until + "T00:00:00Z");
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function dateRangeFromDays(days: number): { since: string; until: string } {
  const until = new Date();
  until.setDate(until.getDate() - 1); // ontem (Meta tem 24h delay)
  const since = new Date(until);
  since.setDate(since.getDate() - (days - 1));
  return {
    since: since.toISOString().split("T")[0],
    until: until.toISOString().split("T")[0],
  };
}

// ── fetchRangeMetric: 1 chamada cobrindo o range inteiro (time series natural) ──
async function fetchRangeMetric(
  metricName: string,
  since: string,
  until: string,
  token: string,
): Promise<Array<{ date: string; value: any }>> {
  const url = new URL(`${META_API}/${IG_ACCOUNT_ID}/insights`);
  url.searchParams.set("metric", metricName);
  url.searchParams.set("period", "day");
  url.searchParams.set("since", since);
  url.searchParams.set("until", until);
  url.searchParams.set("access_token", token);
  try {
    const res = await fetch(url.toString());
    const json = await res.json();
    if (json.error) {
      console.error(`[META range] ${metricName}: ${json.error.message} (code ${json.error.code})`);
      return [];
    }
    const out: Array<{ date: string; value: any }> = [];
    for (const item of json.data || []) {
      for (const v of item.values || []) {
        const date = (v.end_time || "").split("T")[0];
        if (date) out.push({ date, value: v.value });
      }
    }
    return out;
  } catch (e: any) {
    console.error(`[META range] ${metricName} threw:`, e.message);
    return [];
  }
}

// ── fetchDailyMetric: 1 chamada pra 1 dia, suporta total_value e values ──
async function fetchDailyMetric(
  metricName: string,
  date: string,
  token: string,
  metricType: "total_value" | undefined,
): Promise<any | null> {
  const next = new Date(date + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + 1);
  const untilStr = next.toISOString().split("T")[0];

  const url = new URL(`${META_API}/${IG_ACCOUNT_ID}/insights`);
  url.searchParams.set("metric", metricName);
  url.searchParams.set("period", "day");
  if (metricType) url.searchParams.set("metric_type", metricType);
  url.searchParams.set("since", date);
  url.searchParams.set("until", untilStr);
  url.searchParams.set("access_token", token);

  try {
    const res = await fetch(url.toString());
    const json = await res.json();
    if (json.error) {
      console.error(`[META daily] ${metricName} ${date}: ${json.error.message}`);
      return null;
    }
    const item = json.data?.[0];
    if (!item) return null;
    // R48 fix: aceita os dois formatos. v20 com metric_type=total_value retorna
    // total_value.value; antigos retornam values[0].value.
    if (item.total_value && item.total_value.value !== undefined) {
      return item.total_value.value;
    }
    if (item.values && item.values[0] && item.values[0].value !== undefined) {
      return item.values[0].value;
    }
    return null;
  } catch (e: any) {
    console.error(`[META daily] ${metricName} ${date} threw:`, e.message);
    return null;
  }
}

// ── fetchFollowersCount: snapshot atual ──
async function fetchFollowersCount(token: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${META_API}/${IG_ACCOUNT_ID}?fields=followers_count&access_token=${token}`,
    );
    const json = await res.json();
    if (json.error) {
      console.error(`[META] followers_count: ${json.error.message}`);
      return null;
    }
    if (typeof json.followers_count === "number") return json.followers_count;
    console.warn(`[META] followers_count formato inesperado:`, JSON.stringify(json));
    return null;
  } catch (e: any) {
    console.error(`[META] followers_count threw:`, e.message);
    return null;
  }
}

// ── Configuracao das metricas ──
// daily=true → loop dia a dia; daily=false → 1 chamada cobrindo o range.
// Em v20+ a maioria das metricas exige metric_type=total_value e por isso
// retorna agregado (sem serie diaria), exigindo loop. 'reach' e excecao.
interface MetricConfig {
  name: string;
  daily: boolean;
  metricType?: "total_value";
  // dbKey: chave usada em marketing_data.metrica
  dbKey?: string;
}

const METRICS: MetricConfig[] = [
  { name: "reach", daily: false, dbKey: "alcance" },
  { name: "total_interactions", daily: true, metricType: "total_value", dbKey: "interacoes" },
  { name: "accounts_engaged", daily: true, metricType: "total_value", dbKey: "engajamentos" },
  { name: "saves", daily: true, metricType: "total_value", dbKey: "saves" },
  { name: "shares", daily: true, metricType: "total_value", dbKey: "shares" },
  { name: "profile_views", daily: true, metricType: "total_value", dbKey: "visitas" },
  { name: "website_clicks", daily: true, metricType: "total_value", dbKey: "clicks" },
  // follows_and_unfollows: especial — retorna {FOLLOW, UNFOLLOW}, vai pra followers_data
  { name: "follows_and_unfollows", daily: true, metricType: "total_value" },
];

// ── Handler ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const META_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!META_TOKEN) {
      return new Response(
        JSON.stringify({ error: "META_ACCESS_TOKEN não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Range
    let since: string, until: string, days: number;
    try {
      const body = await req.json();
      if (body?.date_start && body?.date_stop) {
        since = body.date_start;
        until = body.date_stop;
        days = enumerateDates(since, until).length;
      } else {
        // R49 (A): teto de 60 dias por chamada pra não estourar 150s do Edge.
        // Backfill maior precisa ser feito em múltiplas invocações.
        days = typeof body?.days === "number" ? Math.min(body.days, MAX_DAYS_PER_CALL) : 7;
        const r = dateRangeFromDays(days);
        since = r.since;
        until = r.until;
      }
    } catch {
      days = 7;
      const r = dateRangeFromDays(days);
      since = r.since;
      until = r.until;
    }

    console.log(`[R48] sync-instagram-organic: ${since} → ${until} (${days} dias)`);

    const dates = enumerateDates(since, until);
    const byDate: Record<string, Record<string, number>> = {};
    for (const d of dates) byDate[d] = {};

    // 1. Metricas range (reach) — 1 chamada
    const rangeMetrics = METRICS.filter((m) => !m.daily);
    const rangeResults = await Promise.all(
      rangeMetrics.map((m) => fetchRangeMetric(m.name, since, until, META_TOKEN)),
    );
    rangeResults.forEach((series, i) => {
      const m = rangeMetrics[i];
      for (const { date, value } of series) {
        if (!byDate[date]) byDate[date] = {};
        byDate[date][m.name] = typeof value === "number" ? value : 0;
      }
    });

    // 2. Metricas daily — R49: paralelizado por DIA (Promise.all das N métricas
    // simultaneamente). Sleep entre dias pra respeitar rate limit (~200/h).
    const dailyMetrics = METRICS.filter((m) => m.daily);
    let dailyCalls = 0;
    for (const date of dates) {
      const values = await Promise.all(
        dailyMetrics.map((m) => fetchDailyMetric(m.name, date, META_TOKEN, m.metricType)),
      );
      values.forEach((value, i) => {
        const m = dailyMetrics[i];
        dailyCalls++;
        if (value === null) return;
        if (m.name === "follows_and_unfollows" && typeof value === "object") {
          byDate[date]["follows"] = (value as any).FOLLOW ?? (value as any).follow ?? 0;
          byDate[date]["unfollows"] = (value as any).UNFOLLOW ?? (value as any).unfollow ?? 0;
        } else if (typeof value === "number") {
          byDate[date][m.name] = value;
        }
      });
      await sleep(SLEEP_BETWEEN_DAYS_MS);
    }
    console.log(`[R49] daily calls: ${dailyCalls}, datas com algum dado: ${
      Object.values(byDate).filter((v) => Object.keys(v).length > 0).length
    }`);

    // 3. followers_count atual — snapshot pro 'today'
    const followersCount = await fetchFollowersCount(META_TOKEN);
    console.log(`[R48] followers_count: ${followersCount}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const today = new Date().toISOString().split("T")[0];

    // 4. Upsert followers_data — total_seguidores so para today (snapshot do perfil)
    const followersRows = dates.map((date) => ({
      data: date,
      total_seguidores: date === today && followersCount !== null ? followersCount : null,
      novos_seguidores: byDate[date]?.["follows"] ?? 0,
      unfollows: byDate[date]?.["unfollows"] ?? 0,
      source: "api",
    }));

    // R48: garante row pra today mesmo se today nao estiver no range pedido.
    // Importante porque Meta tem delay de 24h e until normalmente e 'ontem'.
    if (!dates.includes(today) && followersCount !== null) {
      followersRows.push({
        data: today,
        total_seguidores: followersCount,
        novos_seguidores: 0,
        unfollows: 0,
        source: "api",
      });
    }

    const { error: followersError } = await supabase
      .from("followers_data")
      .upsert(followersRows, { onConflict: "data", ignoreDuplicates: false });
    if (followersError) throw new Error(`followers_data: ${followersError.message}`);

    // 5. Upsert marketing_data
    const marketingRows: any[] = [];
    for (const m of METRICS) {
      if (!m.dbKey) continue;
      for (const date of dates) {
        const v = byDate[date]?.[m.name];
        if (typeof v === "number") {
          marketingRows.push({ data: date, metrica: m.dbKey, valor: v, source: "api" });
        }
      }
    }
    // Visualizacoes: alias de reach (impressions foi deprecado em v20)
    for (const date of dates) {
      const v = byDate[date]?.["reach"];
      if (typeof v === "number") {
        marketingRows.push({ data: date, metrica: "visualizacoes", valor: v, source: "api" });
      }
    }

    if (marketingRows.length > 0) {
      const { error: mktError } = await supabase
        .from("marketing_data")
        .upsert(marketingRows, { onConflict: "data,metrica", ignoreDuplicates: false });
      if (mktError) throw new Error(`marketing_data: ${mktError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        period: { since, until, days },
        followers_count: followersCount,
        followers_rows: followersRows.length,
        marketing_rows: marketingRows.length,
        daily_calls: dailyCalls,
        message: `Sync R49 completo — ${days} dias, ${dailyCalls} chamadas Meta API (paralelizado por dia).`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[R48] erro:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
