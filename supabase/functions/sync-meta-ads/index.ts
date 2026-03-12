import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ────────────────────────────────────────────────────────────

function getActionValue(actions: any[], actionType: string): number {
  if (!actions) return 0;
  const found = actions.find((a: any) => a.action_type === actionType);
  return found ? parseInt(found.value, 10) || 0 : 0;
}

function getActionMoneyValue(actionValues: any[], actionType: string): number {
  if (!actionValues) return 0;
  const found = actionValues.find((a: any) => a.action_type === actionType);
  return found ? parseFloat(found.value) || 0 : 0;
}

function dateRange(daysBack: number): { since: string; until: string } {
  const until = new Date();
  until.setDate(until.getDate() - 1); // yesterday
  const since = new Date(until);
  since.setDate(since.getDate() - (daysBack - 1));
  return {
    since: since.toISOString().split("T")[0],
    until: until.toISOString().split("T")[0],
  };
}

// ── Main ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const META_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
    const META_ACCOUNT = Deno.env.get("META_AD_ACCOUNT_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!META_TOKEN || !META_ACCOUNT) {
      return new Response(
        JSON.stringify({ error: "META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID não configurados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parâmetros opcionais via body
    let since: string;
    let until: string;

    try {
      const body = await req.json();
      since = body.date_start || dateRange(7).since;
      until = body.date_stop || dateRange(7).until;
    } catch {
      const range = dateRange(7);
      since = range.since;
      until = range.until;
    }

    console.log(`Sincronizando Meta Ads: ${since} → ${until}`);

    // ── Chama a Meta Insights API ──────────────────────────────────────
    const fields = [
      "ad_id",
      "ad_name",
      "adset_id",
      "adset_name",
      "campaign_id",
      "campaign_name",
      "date_start",
      "impressions",
      "reach",
      "clicks",
      "spend",
      "cpc",
      "cpm",
      "ctr",
      "cpp",
      "actions",
      "action_values",
    ].join(",");

    const metaUrl = new URL(
      `https://graph.facebook.com/v20.0/${META_ACCOUNT}/insights`
    );
    metaUrl.searchParams.set("fields", fields);
    metaUrl.searchParams.set("level", "ad");
    metaUrl.searchParams.set("time_increment", "1");
    metaUrl.searchParams.set("time_range", JSON.stringify({ since, until }));
    metaUrl.searchParams.set("limit", "500");
    metaUrl.searchParams.set("access_token", META_TOKEN);

    const allInsights: any[] = [];
    let nextUrl: string | null = metaUrl.toString();

    // Paginação automática
    while (nextUrl) {
      const res = await fetch(nextUrl);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(`Meta API erro: ${JSON.stringify(err)}`);
      }
      const json = await res.json();
      allInsights.push(...(json.data || []));
      nextUrl = json.paging?.next || null;
    }

    console.log(`Registros recebidos da Meta: ${allInsights.length}`);

    if (allInsights.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: "Nenhum dado no período" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Mapeia para o schema da tabela ads_data ────────────────────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const rows = allInsights.map((insight: any) => {
      const actions = insight.actions || [];
      const actionValues = insight.action_values || [];

      const purchases = getActionValue(actions, "purchase");
      const purchaseValue = getActionMoneyValue(actionValues, "purchase");
      const spend = parseFloat(insight.spend) || 0;
      const roas = spend > 0 && purchaseValue > 0 ? purchaseValue / spend : null;

      return {
        // Identidade
        ad_id: insight.ad_id,
        campaign_id: insight.campaign_id,
        adset_id: insight.adset_id,

        // Campos legados (compatibilidade com CSV)
        data: insight.date_start,
        campanha: insight.campaign_name,
        conjunto: insight.adset_name,
        anuncio: insight.ad_name,

        // Entrega
        impressoes: parseInt(insight.impressions) || 0,
        alcance: parseInt(insight.reach) || 0,
        cliques: parseInt(insight.clicks) || 0,

        // Custo
        gasto: spend,
        cpc: parseFloat(insight.cpc) || null,
        cpm: parseFloat(insight.cpm) || null,
        ctr: parseFloat(insight.ctr) || null,
        cpp: parseFloat(insight.cpp) || null,

        // Conversões
        purchases,
        purchase_value: purchaseValue,
        conversoes: purchases,
        receita: purchaseValue,
        add_to_cart: getActionValue(actions, "add_to_cart"),
        initiate_checkout: getActionValue(actions, "initiate_checkout"),
        view_content: getActionValue(actions, "view_content"),
        leads: getActionValue(actions, "lead"),

        // ROAS
        roas,

        // Origem
        source: "api",
      };
    });

    // ── Upsert em lotes de 100 ─────────────────────────────────────────
    const BATCH = 100;
    let totalUpserted = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await supabase
        .from("ads_data")
        .upsert(batch, {
          onConflict: "ad_id,data",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error("Erro no upsert:", error);
        throw new Error(`Supabase upsert erro: ${error.message}`);
      }

      totalUpserted += batch.length;
      console.log(`Lote ${Math.ceil((i + BATCH) / BATCH)}: ${batch.length} registros`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalUpserted,
        period: { since, until },
        message: `${totalUpserted} registros sincronizados com sucesso`,
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
