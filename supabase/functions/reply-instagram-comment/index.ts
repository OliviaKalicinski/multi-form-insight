import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_API = "https://graph.facebook.com/v20.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { comment_id, message } = await req.json();
    if (!comment_id || !message?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "comment_id e message são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const META_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
    if (!META_TOKEN) throw new Error("META_ACCESS_TOKEN não configurado");

    // R72: log do input pra debug (sem o token)
    console.log("[reply] input", { comment_id, message_preview: message.slice(0, 50) });

    // Envia resposta via Meta API
    const url = `${META_API}/${comment_id}/replies`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim(), access_token: META_TOKEN }),
    });

    const data = await res.json();
    // R72: log da resposta crua da Meta pra debug do bug 1eec8fad
    console.log("[reply] meta_status", res.status, "meta_body", JSON.stringify(data));

    // R72: validacao tripla — Meta retornou erro OU status nao-2xx OU sem id de resposta
    if (data?.error) {
      throw new Error(`Meta API: ${data.error.message} (code ${data.error.code})`);
    }
    if (!res.ok) {
      throw new Error(`Meta API HTTP ${res.status}: ${JSON.stringify(data)}`);
    }
    if (!data?.id) {
      throw new Error(`Meta API nao retornou reply_id. Resposta: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ ok: true, reply_id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
