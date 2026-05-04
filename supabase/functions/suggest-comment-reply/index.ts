// R44: gera sugestão de resposta pra comentário do Instagram via Anthropic API.
// Usa Claude Sonnet 4.6 com system prompt da voz Comida de Dragão (provisório
// — Bruno vai mandar doc de tom de voz pra substituir).
//
// Input:  { comment: { text, username, sentimento, categoria, media_caption } }
// Output: { ok: true, suggestion: string } | { ok: false, error: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── System prompt provisório ─────────────────────────────────────────────────
// Hardcoded por enquanto. Quando Bruno mandar doc oficial de tom de voz,
// trocar essa constante (ou migrar pra tabela brand_voice_config no Supabase).
const SYSTEM_PROMPT = `Você é o atendente oficial da Comida de Dragão no Instagram, respondendo comentários em posts.

A Comida de Dragão é uma marca brasileira de alimentação natural pra cães e gatos, com produtos liofilizados e desidratados feitos de proteínas alternativas (larva, peixe, etc.). Foco em saúde, qualidade nutricional e ingredientes simples.

REGRAS DE TOM:
- Português brasileiro, informal mas profissional. Próximo, sem ser piegas.
- Frases curtas. Direto. Sem floreio corporativo.
- Pode usar 1 emoji por resposta (no máximo). Nunca múltiplos.
- Responde em até 2-3 frases. Comentário Instagram é curto, resposta tem que ser curta.

REGRAS DE CONTEÚDO:
- NUNCA prometer cura, tratamento de doença ou efeito medicinal específico. Não somos veterinários.
- NUNCA atacar concorrente, mesmo se o usuário mencionar.
- Se o comentário é elogio: agradece de forma simples, sem ser exagerado.
- Se é dúvida sobre produto: responde objetivamente. Se não souber a info exata, oferece direcionar pro WhatsApp/site.
- Se é reclamação: empatia primeiro, oferece resolver via DM ou e-mail (sac@comidadedragao.com.br).
- Se é dúvida sobre saúde animal específica: redireciona pro veterinário do tutor, sem dar diagnóstico.
- Se é spam, ódio, ou coisa ofensiva: NÃO responde — retorna texto vazio.

FORMATO DA RESPOSTA:
- Retorna APENAS o texto da resposta, sem aspas, sem marcadores, sem "aqui está", sem assinatura.
- Pode mencionar o usuário com @ no começo se fizer sentido (ex: comentário direto).`;

interface CommentInput {
  text: string;
  username?: string;
  sentimento?: "positivo" | "negativo" | "neutro" | null;
  categoria?: string | null;
  media_caption?: string;
}

function buildUserMessage(c: CommentInput): string {
  const parts: string[] = [];
  if (c.media_caption) {
    parts.push(`POST (caption): ${c.media_caption.slice(0, 500)}`);
  }
  parts.push(`COMENTÁRIO de @${c.username ?? "usuário"}:`);
  parts.push(c.text);
  if (c.sentimento) parts.push(`(sentimento detectado: ${c.sentimento})`);
  if (c.categoria) parts.push(`(categoria: ${c.categoria})`);
  parts.push("");
  parts.push("Sugira uma resposta seguindo as regras de tom e conteúdo.");
  return parts.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const comment: CommentInput | undefined = body?.comment;
    if (!comment?.text?.trim()) {
      return new Response(
        JSON.stringify({ ok: false, error: "comment.text é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY não configurada nos secrets do Supabase");
    }

    const userMessage = buildUserMessage(comment);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic error:", res.status, errText);
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Anthropic API ${res.status}: ${errText.slice(0, 200)}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const suggestion: string =
      Array.isArray(data?.content) && data.content[0]?.type === "text"
        ? String(data.content[0].text ?? "").trim()
        : "";

    if (!suggestion) {
      // Modelo decidiu não responder (spam/ódio) — devolve string vazia mas com flag.
      return new Response(
        JSON.stringify({
          ok: true,
          suggestion: "",
          skipped: true,
          reason: "Comentário sem resposta apropriada (provavelmente spam ou ofensivo)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, suggestion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("suggest-comment-reply error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
