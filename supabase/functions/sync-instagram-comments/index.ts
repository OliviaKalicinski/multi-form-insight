import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IG_ACCOUNT_ID = "17841470017662704";
const BRAND_USERNAME = "comidadedragao";
const META_API = "https://graph.facebook.com/v19.0";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function metaGet(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`${META_API}/${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(`Meta API: ${data.error.message} (code ${data.error.code})`);
  return data;
}

/** Busca paginada: segue cursores até acabar ou atingir maxPages */
async function metaGetAll(
  path: string,
  token: string,
  params: Record<string, string>,
  maxPages: number,
): Promise<any[]> {
  const all: any[] = [];
  let nextUrl: string | null = null;
  let page = 0;

  // Primeira página
  const first = await metaGet(path, token, params);
  all.push(...(first.data ?? []));
  nextUrl = first.paging?.next ?? null;
  page++;

  // Páginas seguintes via cursor
  while (nextUrl && page < maxPages) {
    const res = await fetch(nextUrl);
    const data = await res.json();
    if (data.error) break;
    all.push(...(data.data ?? []));
    nextUrl = data.paging?.next ?? null;
    page++;
  }

  return all;
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
  "categoria": "elogio" | "reclamação" | "duvida_oportunidade" | "risco" | "outro",
  "risco": "baixo" | "medio" | "alto" | "critico",
  "risco_motivo": "breve explicação se risco for medio/alto/critico, caso contrário string vazia"
}

Categoria "duvida_oportunidade": perguntas sobre o produto, ingredientes, onde comprar, para qual pet serve, qual sabor, disponibilidade, preço — qualquer comentário que indique interesse ou curiosidade com potencial de virar venda. Ex: "onde compro?", "tem para gato?", "qual o melhor sabor?", "quero experimentar".
Categoria "elogio": comentários positivos, aprovação, agradecimento.
Categoria "reclamação": insatisfação com produto, entrega ou atendimento.
Categoria "risco": ameaças à marca, processos, órgãos reguladores.
Categoria "outro": tudo que não se encaixa acima.

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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
    const fetchAll = body.fetch_all ?? false;
    const limit = body.limit ?? 50;

    // 1. Busca posts — paginado se fetch_all=true
    let posts: any[];
    if (fetchAll) {
      // Busca até 10 páginas de 50 posts = 500 posts max
      posts = await metaGetAll(`${IG_ACCOUNT_ID}/media`, META_TOKEN, {
        fields: "id,caption,media_url,permalink,timestamp,media_type",
        limit: "50",
      }, 10);
    } else {
      const mediasData = await metaGet(`${IG_ACCOUNT_ID}/media`, META_TOKEN, {
        fields: "id,caption,media_url,permalink,timestamp,media_type",
        limit: String(limit),
      });
      posts = mediasData.data ?? [];
    }

    console.log(`Encontrados ${posts.length} posts (fetch_all=${fetchAll})`);

    let totalComments = 0, classified = 0, skipped = 0, errors = 0;

    for (const post of posts) {
      // 2. Busca comentários de cada post
      let allComments: any[];
      try {
        if (fetchAll) {
          // Pagina comentários também
          allComments = await metaGetAll(`${post.id}/comments`, META_TOKEN, {
            fields: "id,text,username,timestamp,replies{id,text,username,timestamp}",
            limit: "100",
          }, 5);
        } else {
          const commentsData = await metaGet(`${post.id}/comments`, META_TOKEN, {
            fields: "id,text,username,timestamp,replies{id,text,username,timestamp}",
            limit: "100",
          });
          allComments = commentsData.data ?? [];
        }
      } catch (e: any) {
        console.error(`Erro ao buscar comentários do post ${post.id}: ${e.message}`);
        errors++;
        continue;
      }

      for (const comment of allComments) {
        totalComments++;

        // Verifica se já existe no banco
        const { data: existing } = await (supabase as any)
          .from("instagram_comments")
          .select("id, respondido, resposta_texto, classified_at")
          .eq("id", comment.id)
          .single();

        // Detecta se a marca já respondeu este comentário (roda SEMPRE, mesmo se já classificado)
        let respondido = existing?.respondido ?? false;
        let respostaTexto = existing?.resposta_texto ?? "";
        const replies = comment.replies?.data ?? [];
        for (const reply of replies) {
          if (reply.username === BRAND_USERNAME) {
            respondido = true;
            respostaTexto = reply.text ?? "";
            break;
          }
        }

        // Se já classificado, só atualiza respondido/resposta_texto se mudou
        if (existing?.classified_at) {
          if (respondido !== (existing.respondido ?? false) || respostaTexto !== (existing.resposta_texto ?? "")) {
            await (supabase as any).from("instagram_comments")
              .update({ respondido, resposta_texto: respostaTexto })
              .eq("id", comment.id);
          }
          skipped++;
          continue;
        }

        // Classifica com Claude (só comentários novos)
        let classification = { sentimento: "neutro", categoria: "outro", risco: "baixo", risco_motivo: "" };
        let classifiedAt: string | null = null;
        try {
          classification = await classifyComment(comment.text, ANTHROPIC_KEY);
          classifiedAt = new Date().toISOString();
          classified++;
        } catch (e: any) {
          console.error(`Erro ao classificar: ${e.message}`);
          errors++;
        }

        // Salva no banco
        const row: any = {
          id: comment.id,
          media_id: post.id,
          media_caption: post.caption?.slice(0, 500) ?? "",
          media_url: post.media_url ?? "",
          media_permalink: post.permalink ?? "",
          media_timestamp: post.timestamp,
          username: comment.username,
          text: comment.text,
          timestamp: comment.timestamp,
          respondido,
          resposta_texto: respostaTexto,
          ...classification,
        };
        if (classifiedAt) row.classified_at = classifiedAt;

        await (supabase as any).from("instagram_comments").upsert(row, { onConflict: "id" });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      posts: posts.length,
      comments: totalComments,
      classified,
      skipped,
      errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
