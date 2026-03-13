import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IG_ACCOUNT_ID = "17841470017662704";
const META_API = "https://graph.facebook.com/v19.0";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

async function metaGet(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`${META_API}/${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(`Meta API: ${data.error.message} (code ${data.error.code})`);
  return data;
}

async function classifyComment(text: string, anthropicKey: string): Promise<{
  sentimento: string; categoria: string; risco: string; risco_motivo: string;
}> {
  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: `Você é um analisador de comentários de redes sociais para uma marca de petiscos premium para pets chamada Comida de Dragão. Classifique o comentário e responda APENAS com JSON válido, sem markdown.`,
      messages: [{
        role: "user",
        content: `Classifique este comentário: "${text.slice(0, 500)}"

Responda APENAS com este JSON:
{
  "sentimento": "positivo" | "negativo" | "neutro",
  "categoria": "elogio" | "reclamação" | "dúvida" | "risco" | "outro",
  "risco": "baixo" | "medio" | "alto" | "critico",
  "risco_motivo": "breve explicação se risco for medio/alto/critico, caso contrário string vazia"
}

Risco "critico": menção a doença, intoxicação, morte de animal, anvisa, procon, processo.
Risco "alto": reclamação grave de qualidade, produto estragado, alergia.
Risco "medio": reclamação de entrega, preço, atendimento.
Risco "baixo": tudo mais.`,
      }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Anthropic: ${data.error.message}`);
  const raw = data.content[0].text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    return { sentimento: "neutro", categoria: "outro", risco: "baixo", risco_motivo: "" };
  }
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const META_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!META_TOKEN) throw new Error("META_ACCESS_TOKEN não configurado");
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY não configurado");

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit = body.limit ?? 20; // posts recentes a buscar

    // 1. Busca posts recentes
    const mediasData = await metaGet(`${IG_ACCOUNT_ID}/media`, META_TOKEN, {
      fields: "id,caption,media_url,permalink,timestamp,media_type",
      limit: String(limit),
    });

    const posts = mediasData.data ?? [];
    console.log(`Encontrados ${posts.length} posts`);

    let totalComments = 0, classified = 0, errors = 0;

    for (const post of posts) {
      // 2. Busca comentários de cada post
      let commentsData;
      try {
        commentsData = await metaGet(`${post.id}/comments`, META_TOKEN, {
          fields: "id,text,username,timestamp,replies{id,text,username,timestamp}",
          limit: "100",
        });
      } catch (e: any) {
        console.error(`Erro ao buscar comentários do post ${post.id}: ${e.message}`);
        errors++;
        continue;
      }

      const comments = commentsData.data ?? [];

      for (const comment of comments) {
        totalComments++;

        // Verifica se já existe
        const { data: existing } = await supabase
          .from("instagram_comments")
          .select("id, sentimento")
          .eq("id", comment.id)
          .single();

        if (existing?.sentimento) continue; // já classificado

        // Classifica com Claude
        let classification = { sentimento: "neutro", categoria: "outro", risco: "baixo", risco_motivo: "" };
        try {
          classification = await classifyComment(comment.text, ANTHROPIC_KEY);
          classified++;
        } catch (e: any) {
          console.error(`Erro ao classificar: ${e.message}`);
        }

        // Salva no banco
        await supabase.from("instagram_comments").upsert({
          id: comment.id,
          media_id: post.id,
          media_caption: post.caption?.slice(0, 500) ?? "",
          media_url: post.media_url ?? post.permalink ?? "",
          media_timestamp: post.timestamp,
          username: comment.username,
          text: comment.text,
          timestamp: comment.timestamp,
          ...classification,
          respondido: existing?.sentimento ? existing.sentimento !== null : false,
        }, { onConflict: "id" });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      posts: posts.length,
      comments: totalComments,
      classified,
      errors,
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
