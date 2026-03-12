import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IG_ACCOUNT_ID = "17841470017662704"; // Comida de Dragão

function defaultDateRange(): { since: string; until: string } {
  const until = new Date();
  until.setDate(until.getDate() - 1);
  const since = new Date(until);
  since.setDate(since.getDate() - 6);
  return {
    since: since.toISOString().split("T")[0],
    until: until.toISOString().split("T")[0],
  };
}

async function fetchMetric(
  metricName: string,
  since: string,
  until: string,
  token: string
): Promise<Array<{ date: string; value: any }>> {
  const url = new URL(`https://graph.facebook.com/v20.0/${IG_ACCOUNT_ID}/insights`);
  url.searchParams.set("metric", metricName);
  url.searchParams.set("period", "day");
  url.searchParams.set("since", since);
  url.searchParams.set("until", until);
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString());
  const json = await res.json();

  if (json.error) {
    console.error(`Erro na métrica ${metricName}:`, JSON.stringify(json.error));
    return [];
  }

  const results: Array<{ date: string; value: any }> = [];
  for (const item of (json.data || [])) {
    for (const v of (item.values || [])) {
      const date = (v.end_time || "").split("T")[0];
      if (date) results.push({ date, value: v.value });
    }
  }
  return results;
}

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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let since: string;
    let until: string;
    try {
      const body = await req.json();
      const d = defaultDateRange();
      since = body.date_start || d.since;
      until = body.date_stop || d.until;
    } catch {
      const d = defaultDateRange();
      since = d.since;
      until = d.until;
    }

    console.log(`Sync Instagram orgânico: ${since} → ${until}`);

    // ── 1. Métricas de conta (removidas deprecated: profile_views, website_clicks)
    const [
      impressions,
      reach,
      totalInteractions,
      accountsEngaged,
      saves,
      shares,
      followsUnfollows,
    ] = await Promise.all([
      fetchMetric("impressions", since, until, META_TOKEN),
      fetchMetric("reach", since, until, META_TOKEN),
      fetchMetric("total_interactions", since, until, META_TOKEN),
      fetchMetric("accounts_engaged", since, until, META_TOKEN),
      fetchMetric("saves", since, until, META_TOKEN),
      fetchMetric("shares", since, until, META_TOKEN),
      fetchMetric("follows_and_unfollows", since, until, META_TOKEN),
    ]);

    // ── 2. Total de seguidores atual ──────────────────────────────────
    const profileRes = await fetch(
      `https://graph.facebook.com/v20.0/${IG_ACCOUNT_ID}?fields=followers_count&access_token=${META_TOKEN}`
    );
    const profileJson = await profileRes.json();
    const followersCount = profileJson.followers_count || 0;
    console.log(`Seguidores: ${followersCount}`);

    // ── 3. Organiza por data ──────────────────────────────────────────
    const byDate: Record<string, Record<string, number>> = {};

    const addMetric = (entries: Array<{ date: string; value: any }>, key: string) => {
      for (const { date, value } of entries) {
        if (!byDate[date]) byDate[date] = {};
        byDate[date][key] = typeof value === "number" ? value : 0;
      }
    };

    addMetric(impressions, "impressions");
    addMetric(reach, "reach");
    addMetric(totalInteractions, "total_interactions");
    addMetric(accountsEngaged, "accounts_engaged");
    addMetric(saves, "saves");
    addMetric(shares, "shares");

    // follows_and_unfollows vem como objeto {FOLLOW: N, UNFOLLOW: N}
    for (const { date, value } of followsUnfollows) {
      if (!byDate[date]) byDate[date] = {};
      byDate[date]["follows"] = value?.FOLLOW ?? value?.follow ?? 0;
      byDate[date]["unfollows"] = value?.UNFOLLOW ?? value?.unfollow ?? 0;
    }

    console.log(`Datas com dados: ${Object.keys(byDate).length}`);

    if (Object.keys(byDate).length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, followers_current: followersCount, message: "Nenhum dado no período" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // ── 4. Upsert followers_data ──────────────────────────────────────
    const followersRows = Object.entries(byDate).map(([date, m]) => ({
      data: date,
      total_seguidores: followersCount,
      novos_seguidores: m["follows"] || 0,
      unfollows: m["unfollows"] || 0,
      source: "api",
    }));

    const { error: followersError } = await supabase
      .from("followers_data")
      .upsert(followersRows, { onConflict: "data", ignoreDuplicates: false });

    if (followersError) throw new Error(`followers_data: ${followersError.message}`);

    // ── 5. Upsert marketing_data (inclui saves e shares agora) ────────
    const metricsMap: Record<string, string> = {
      impressions: "visualizacoes",
      reach: "alcance",
      total_interactions: "interacoes",
      accounts_engaged: "engajamentos",
      saves: "saves",
      shares: "shares",
    };

    const marketingRows: any[] = [];
    for (const [date, m] of Object.entries(byDate)) {
      for (const [apiKey, dbKey] of Object.entries(metricsMap)) {
        if (m[apiKey] !== undefined) {
          marketingRows.push({ data: date, metrica: dbKey, valor: m[apiKey], source: "api" });
        }
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
        synced: followersRows.length,
        followers_current: followersCount,
        period: { since, until },
        marketing_rows: marketingRows.length,
        metrics_fetched: Object.keys(metricsMap),
        deprecated_removed: ["profile_views", "website_clicks"],
        message: `${followersRows.length} dias sincronizados (${marketingRows.length} métricas)`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Erro:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});