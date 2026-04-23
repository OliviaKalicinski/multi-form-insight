import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function chunkDateRange(since: string, until: string, chunkDays: number) {
  const chunks = [];
  let current = new Date(since);
  const end = new Date(until);
  while (current <= end) {
    const chunkEnd = new Date(current);
    chunkEnd.setDate(chunkEnd.getDate() + chunkDays - 1);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());
    chunks.push({
      since: current.toISOString().split("T")[0],
      until: chunkEnd.toISOString().split("T")[0],
    });
    current = new Date(chunkEnd);
    current.setDate(current.getDate() + 1);
  }
  return chunks;
}

// ─── Busca effective_status de todos os anúncios da conta ───────────────────
async function syncEffectiveStatus(supabase: any, metaToken: string, metaAccount: string): Promise<number> {
  // Meta API: /act_ACCOUNT/ads retorna effective_status por ad_id
  // Inclui todos os status: ACTIVE, PAUSED, DELETED, ARCHIVED, WITH_ISSUES
  const adStatuses: { ad_id: string; effective_status: string }[] = [];

  let nextUrl: string | null =
    `https://graph.facebook.com/v20.0/${metaAccount}/ads?` +
    `fields=id,effective_status&limit=500&access_token=${metaToken}`;

  let pages = 0;
  while (nextUrl && pages < 20) {
    const res = await fetch(nextUrl);
    if (!res.ok) {
      const err = await res.json();
      console.error(`Erro ao buscar effective_status: ${JSON.stringify(err)}`);
      return 0;
    }
    const json = await res.json();
    for (const ad of json.data || []) {
      if (ad.id && ad.effective_status) {
        adStatuses.push({ ad_id: ad.id, effective_status: ad.effective_status });
      }
    }
    nextUrl = json.paging?.next || null;
    pages++;
  }

  if (adStatuses.length === 0) return 0;

  // Batch update via RPC — uma única chamada ao banco em vez de N updates individuais
  const { error } = await supabase.rpc("bulk_update_effective_status", {
    updates: adStatuses,
  });

  if (error) {
    console.error(`Erro ao atualizar effective_status em batch: ${error.message}`);
    return 0;
  }

  console.log(`effective_status atualizado em batch para ${adStatuses.length} anúncios`);
  return adStatuses.length;
}

async function syncChunk(
  supabase: any,
  metaToken: string,
  metaAccount: string,
  since: string,
  until: string,
): Promise<number> {
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
    "quality_ranking",
    "engagement_rate_ranking",
    "conversion_rate_ranking",
    "outbound_clicks",
    "video_p25_watched_actions",
    "video_p50_watched_actions",
    "video_p75_watched_actions",
    "video_p100_watched_actions",
    "video_play_actions",
  ].join(",");

  const metaUrl = new URL(`https://graph.facebook.com/v20.0/${metaAccount}/insights`);
  metaUrl.searchParams.set("fields", fields);
  metaUrl.searchParams.set("level", "ad");
  metaUrl.searchParams.set("time_increment", "1");
  metaUrl.searchParams.set("time_range", JSON.stringify({ since, until }));
  metaUrl.searchParams.set("limit", "300");
  // R07-1: atribuição unificada — garante que purchase_value seja coletado para
  // TODOS os objetivos (Engagement/Traffic/Awareness também), não só Sales.
  // Sem isso, o Meta Ads Manager mostra receita atribuída que a API omite,
  // causando divergência no ROAS Total (1,41x dashboard vs 1,92x Meta).
  metaUrl.searchParams.set("use_unified_attribution_setting", "true");
  // Janelas explícitas como fallback caso unified_setting não esteja ativo no BM.
  // 7d_click + 1d_view é o padrão do Ads Manager desde iOS 14 (2021).
  metaUrl.searchParams.set("action_attribution_windows", JSON.stringify(["7d_click", "1d_view"]));
  // Relatar ações pelo momento da conversão (não do clique) — alinha com Ads Manager.
  metaUrl.searchParams.set("action_report_time", "conversion");
  metaUrl.searchParams.set("access_token", metaToken);

  const allInsights: any[] = [];
  let nextUrl: string | null = metaUrl.toString();
  let pages = 0;

  while (nextUrl && pages < 15) {
    const res = await fetch(nextUrl);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Meta API erro: ${JSON.stringify(err)}`);
    }
    const json = await res.json();
    allInsights.push(...(json.data || []));
    nextUrl = json.paging?.next || null;
    pages++;
  }

  if (allInsights.length === 0) return 0;

  const rows = allInsights.map((insight: any) => {
    const actions = insight.actions || [];
    const actionValues = insight.action_values || [];
    const purchases = getActionValue(actions, "purchase");
    const purchaseValue = getActionMoneyValue(actionValues, "purchase");
    const spend = parseFloat(insight.spend) || 0;
    // R06-3: sempre retornar número quando spend > 0 (0 em vez de null).
    // Antes: spend > 0 mas 0 compras → null quebrava agregações downstream.
    const roas = spend > 0 ? purchaseValue / spend : 0;
    return {
      ad_id: insight.ad_id,
      campaign_id: insight.campaign_id,
      adset_id: insight.adset_id,
      data: insight.date_start,
      campanha: insight.campaign_name,
      conjunto: insight.adset_name,
      anuncio: insight.ad_name,
      impressoes: parseInt(insight.impressions) || 0,
      alcance: parseInt(insight.reach) || 0,
      cliques: parseInt(insight.clicks) || 0,
      gasto: spend,
      cpc: parseFloat(insight.cpc) || null,
      cpm: parseFloat(insight.cpm) || null,
      ctr: parseFloat(insight.ctr) || null,
      cpp: parseFloat(insight.cpp) || null,
      purchases,
      purchase_value: purchaseValue,
      conversoes: purchases,
      receita: purchaseValue,
      add_to_cart: getActionValue(actions, "add_to_cart"),
      initiate_checkout: getActionValue(actions, "initiate_checkout"),
      view_content: getActionValue(actions, "view_content"),
      leads: getActionValue(actions, "lead"),
      roas,
      source: "api",
      quality_ranking: insight.quality_ranking ?? null,
      engagement_rate_ranking: insight.engagement_rate_ranking ?? null,
      conversion_rate_ranking: insight.conversion_rate_ranking ?? null,
      outbound_clicks:
        getActionValue(insight.outbound_clicks || [], "outbound_click") || parseInt(insight.outbound_clicks) || 0,
      video_p25_watched:
        getActionValue(insight.video_p25_watched_actions || [], "video_view") ||
        parseInt((insight.video_p25_watched_actions || [])[0]?.value) ||
        0,
      video_p50_watched:
        getActionValue(insight.video_p50_watched_actions || [], "video_view") ||
        parseInt((insight.video_p50_watched_actions || [])[0]?.value) ||
        0,
      video_p75_watched:
        getActionValue(insight.video_p75_watched_actions || [], "video_view") ||
        parseInt((insight.video_p75_watched_actions || [])[0]?.value) ||
        0,
      video_p100_watched:
        getActionValue(insight.video_p100_watched_actions || [], "video_view") ||
        parseInt((insight.video_p100_watched_actions || [])[0]?.value) ||
        0,
      hook_rate: (() => {
        const plays =
          getActionValue(insight.video_play_actions || [], "video_view") ||
          parseInt((insight.video_play_actions || [])[0]?.value) ||
          0;
        const impr = parseInt(insight.impressions) || 0;
        return impr > 0 && plays > 0 ? (plays / impr) * 100 : null;
      })(),
    };
  });

  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase
      .from("ads_data")
      .upsert(rows.slice(i, i + BATCH), { onConflict: "ad_id,data", ignoreDuplicates: false });
    if (error) throw new Error(`Supabase upsert erro: ${error.message}`);
  }

  return rows.length;
}

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
      return new Response(JSON.stringify({ error: "META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID não configurados" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let since: string;
    let until: string;
    let chunkDays = 7;

    try {
      const body = await req.json();
      const defaults = defaultDateRange();
      since = body.date_start || defaults.since;
      until = body.date_stop || defaults.until;
      if (body.chunk_days) chunkDays = Math.min(Number(body.chunk_days), 30);
    } catch {
      const defaults = defaultDateRange();
      since = defaults.since;
      until = defaults.until;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const chunks = chunkDateRange(since, until, chunkDays);

    console.log(`Sync: ${since} → ${until} | ${chunks.length} chunks de ${chunkDays} dias`);

    let totalSynced = 0;
    const chunkResults: any[] = [];

    for (const chunk of chunks) {
      console.log(`Chunk: ${chunk.since} → ${chunk.until}`);
      try {
        const count = await syncChunk(supabase, META_TOKEN, META_ACCOUNT, chunk.since, chunk.until);
        totalSynced += count;
        chunkResults.push({ ...chunk, synced: count, ok: true });
      } catch (err: any) {
        console.error(`Chunk erro: ${err.message}`);
        chunkResults.push({ ...chunk, ok: false, error: err.message });
      }
    }

    // ── Após sincronizar insights, buscar effective_status atual de cada anúncio ──
    let statusCount = 0;
    try {
      statusCount = await syncEffectiveStatus(supabase, META_TOKEN, META_ACCOUNT);
    } catch (err: any) {
      console.error(`Erro ao sincronizar effective_status: ${err.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSynced,
        status_updated: statusCount,
        period: { since, until },
        chunks: chunkResults,
        message: `${totalSynced} registros sincronizados · ${statusCount} anúncios com status atualizado`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
