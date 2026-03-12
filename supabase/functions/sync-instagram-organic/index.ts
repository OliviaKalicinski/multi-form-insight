import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const IG_ACCOUNT_ID = "17841470017662704"; // Comida de Dragão

function defaultDateRange(): { since: string; until: string } {
  const until = new Date();
  until.setDate(until.getDate() - 1); // ontem
  const since = new Date(until);
  since.setDate(since.getDate() - 6); // últimos 7 dias
  return {
    since: since.toISOString().split("T")[0],
    until: until.toISOString().split("T")[0],
  };
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
      const defaults = defaultDateRange();
      since = body.date_start || defaults.since;
      until = body.date_stop || defaults.until;
    } catch {
      const defaults = defaultDateRange();
      since = defaults.since;
      until = defaults.until;
    }

    console.log(`Sincronizando Instagram orgânico: ${since} → ${until}`);

    // ── 1. Insights diários da conta ──────────────────────────────────
    const insightMetrics = [
      "reach",
      "profile_views",
      "website_clicks",
      "accounts_engaged",
      "total_interactions",
      "follows_and_unfollows",
      "views",
    ].join(",");

    const insightsUrl = new URL(
      `https://graph.facebook.com/v20.0/${IG_ACCOUNT_ID}/insights`
    );
    insightsUrl.searchParams.set("metric", insightMetrics);
    insightsUrl.searchParams.set("period", "day");
    insightsUrl.searchParams.set("since", since);
    insightsUrl.searchParams.set("until", until);
    // metric_type removed — "day" period returns daily values by default
    insightsUrl.searchParams.set("access_token", META_TOKEN);

    const insightsRes = await fetch(insightsUrl.toString());
    if (!insightsRes.ok) {
      const err = await insightsRes.json();
      throw new Error(`Instagram Insights API erro: ${JSON.stringify(err)}`);
    }
    const insightsJson = await insightsRes.json();

    // ── 2. Total de seguidores atual ───────────────────────────────────
    const profileUrl = new URL(
      `https://graph.facebook.com/v20.0/${IG_ACCOUNT_ID}`
    );
    profileUrl.searchParams.set("fields", "followers_count");
    profileUrl.searchParams.set("access_token", META_TOKEN);

    const profileRes = await fetch(profileUrl.toString());
    const profileJson = await profileRes.json();
    const followersCount = profileJson.followers_count || 0;

    console.log(`Seguidores atuais: ${followersCount}`);
    console.log(`Insights recebidos: ${insightsJson.data?.length || 0} métricas`);

    // ── 3. Organiza por data ───────────────────────────────────────────
    const byDate: Record<string, Record<string, number>> = {};

    for (const metric of (insightsJson.data || [])) {
      const metricName = metric.name;
      const values = metric.total_value?.breakdowns?.[0]?.results ||
                     metric.values || [];

      for (const entry of values) {
        const date = (entry.end_time || entry.period?.since || "").split("T")[0];
        if (!date) continue;
        if (!byDate[date]) byDate[date] = {};

        if (metricName === "follows_and_unfollows") {
          const items = entry.value?.breakdown || entry.value || {};
          byDate[date]["follows"] = items["FOLLOW"] || items["follow"] || 0;
          byDate[date]["unfollows"] = items["UNFOLLOW"] || items["unfollow"] || 0;
        } else {
          byDate[date][metricName] = entry.value || 0;
        }
      }
    }

    console.log(`Datas com dados: ${Object.keys(byDate).length}`);

    if (Object.keys(byDate).length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, followers: followersCount, message: "Nenhum dado no período" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // ── 4. Upsert followers_data ───────────────────────────────────────
    const followersRows = Object.entries(byDate).map(([date, metrics]) => ({
      data: date,
      total_seguidores: followersCount,
      novos_seguidores: metrics["follows"] || 0,
      unfollows: metrics["unfollows"] || 0,
      source: "api",
    }));

    const { error: followersError } = await supabase
      .from("followers_data")
      .upsert(followersRows, { onConflict: "data", ignoreDuplicates: false });

    if (followersError) throw new Error(`followers_data upsert: ${followersError.message}`);

    // ── 5. Upsert marketing_data ───────────────────────────────────────
    const metricsMap: Record<string, string> = {
      views: "visualizacoes",
      reach: "alcance",
      profile_views: "visitas",
      website_clicks: "clicks",
      total_interactions: "interacoes",
      accounts_engaged: "engajamentos",
    };

    const marketingRows: any[] = [];
    for (const [date, metrics] of Object.entries(byDate)) {
      for (const [apiKey, dbKey] of Object.entries(metricsMap)) {
        if (metrics[apiKey] !== undefined) {
          marketingRows.push({
            data: date,
            metrica: dbKey,
            valor: metrics[apiKey],
            source: "api",
          });
        }
      }
    }

    if (marketingRows.length > 0) {
      const { error: marketingError } = await supabase
        .from("marketing_data")
        .upsert(marketingRows, { onConflict: "data,metrica", ignoreDuplicates: false });

      if (marketingError) throw new Error(`marketing_data upsert: ${marketingError.message}`);
    }

    const totalSynced = followersRows.length;

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSynced,
        followers_current: followersCount,
        period: { since, until },
        marketing_rows: marketingRows.length,
        message: `${totalSynced} dias sincronizados (${marketingRows.length} métricas)`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Erro na Edge Function:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
