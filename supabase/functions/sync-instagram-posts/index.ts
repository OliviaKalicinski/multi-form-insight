import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IG_ACCOUNT_ID = "17841470017662704";

// ── Posts individuais ─────────────────────────────────────────────────
async function fetchRecentPosts(token: string, limit = 50): Promise<{ posts: any[]; error: string | null }> {
  const url = new URL(`https://graph.facebook.com/v20.0/${IG_ACCOUNT_ID}/media`);
  url.searchParams.set("fields", "id,permalink,media_type,caption,timestamp");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.error) {
    const errMsg = `${json.error.code}: ${json.error.message} (${json.error.type})`;
    console.error("Erro ao buscar posts:", errMsg);
    return { posts: [], error: errMsg };
  }
  return { posts: json.data || [], error: null };
}

async function fetchPostInsights(postId: string, mediaType: string, token: string): Promise<Record<string, number>> {
  // Métricas variam por tipo de mídia
  let metrics: string;
  if (mediaType === "VIDEO" || mediaType === "REEL") {
    metrics = "impressions,reach,saved,shares,comments,likes,plays";
  } else {
    metrics = "impressions,reach,saved,shares,comments,likes";
  }

  const url = new URL(`https://graph.facebook.com/v20.0/${postId}/insights`);
  url.searchParams.set("metric", metrics);
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString());
  const json = await res.json();

  if (json.error) {
    console.warn(`Insights indisponíveis para post ${postId} (${mediaType}):`, json.error.message);
    // Tenta buscar métricas básicas como fallback
    return await fetchPostBasicMetrics(postId, token);
  }

  const result: Record<string, number> = {};
  for (const item of json.data || []) {
    result[item.name] = item.values?.[0]?.value ?? item.value ?? 0;
  }
  return result;
}

async function fetchPostBasicMetrics(postId: string, token: string): Promise<Record<string, number>> {
  // Busca likes e comments direto no objeto de mídia (sempre disponível)
  const url = new URL(`https://graph.facebook.com/v20.0/${postId}`);
  url.searchParams.set("fields", "like_count,comments_count");
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.error) return {};

  return {
    likes: json.like_count ?? 0,
    comments: json.comments_count ?? 0,
  };
}

// ── Demographics da audiência ────────────────────────────────────────
async function fetchDemographics(token: string): Promise<Array<{ type: string; value: string; count: number }>> {
  const breakdowns = ["country", "city", "age", "gender"];
  const results: Array<{ type: string; value: string; count: number }> = [];

  for (const breakdown of breakdowns) {
    const url = new URL(`https://graph.facebook.com/v20.0/${IG_ACCOUNT_ID}/insights`);
    url.searchParams.set("metric", "reach");
    url.searchParams.set("period", "lifetime");
    url.searchParams.set("breakdown", breakdown);
    url.searchParams.set("access_token", token);

    const res = await fetch(url.toString());
    const json = await res.json();

    if (json.error) {
      console.warn(`Demographics ${breakdown} indisponível:`, json.error.message);
      continue;
    }

    // Formato v20: data[].total_value.breakdowns[].results[]
    const items = json.data?.[0]?.total_value?.breakdowns?.[0]?.results || [];
    for (const item of items) {
      results.push({
        type: breakdown,
        value: String(item.dimension_values?.[0] ?? item.value ?? ""),
        count: item.value ?? 0,
      });
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
      return new Response(JSON.stringify({ error: "META_ACCESS_TOKEN não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let postLimit = 50;
    try {
      const body = await req.json();
      postLimit = body.post_limit || 50;
    } catch {
      /* usa default */
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // ── 1. Posts ──────────────────────────────────────────────────────
    console.log(`Buscando últimos ${postLimit} posts...`);
    const { posts, error: postsError } = await fetchRecentPosts(META_TOKEN, postLimit);
    console.log(`Posts encontrados: ${posts.length}`);

    if (postsError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: postsError,
          hint: "Verifique permissões do token: instagram_basic, instagram_manage_insights",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const postRows: any[] = [];
    for (const post of posts) {
      const insights = await fetchPostInsights(post.id, post.media_type || "IMAGE", META_TOKEN);
      postRows.push({
        post_id: post.id,
        permalink: post.permalink || null,
        media_type: post.media_type || null,
        caption: post.caption ? post.caption.substring(0, 500) : null,
        published_at: post.timestamp || null,
        impressions: insights["impressions"] || 0,
        reach: insights["reach"] || 0,
        likes: insights["likes"] || 0,
        comments: insights["comments"] || 0,
        saves: insights["saved"] || 0,
        shares: insights["shares"] || 0,
        engagements: (insights["likes"] || 0) + (insights["comments"] || 0) + (insights["saved"] || 0),
        updated_at: new Date().toISOString(),
      });
      // Pequeno delay para não bater rate limit
      await new Promise((r) => setTimeout(r, 50));
    }

    if (postRows.length > 0) {
      const { error: postError } = await supabase
        .from("instagram_posts")
        .upsert(postRows, { onConflict: "post_id", ignoreDuplicates: false });
      if (postError) throw new Error(`instagram_posts: ${postError.message}`);
    }

    // ── 2. Demographics ───────────────────────────────────────────────
    console.log("Buscando demographics...");
    const demographics = await fetchDemographics(META_TOKEN);
    console.log(`Demographics encontradas: ${demographics.length} segmentos`);

    const syncedAt = new Date().toISOString();
    const demoRows = demographics.map((d) => ({
      synced_at: syncedAt,
      breakdown_type: d.type,
      breakdown_value: d.value,
      count: d.count,
    }));

    if (demoRows.length > 0) {
      const { error: demoError } = await supabase.from("instagram_demographics").insert(demoRows); // insert sempre (é snapshot)
      if (demoError) console.warn("Demographics insert error:", demoError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        posts_synced: postRows.length,
        demographics_segments: demoRows.length,
        message: `${postRows.length} posts e ${demoRows.length} segmentos de audiência sincronizados`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Erro:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
