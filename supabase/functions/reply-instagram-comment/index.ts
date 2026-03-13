import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const META_API = "https://graph.facebook.com/v19.0";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { status: 405 });
    }

    const { comment_id, message } = await req.json();
    if (!comment_id || !message?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "comment_id e message são obrigatórios" }), { status: 400 });
    }

    const META_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
    if (!META_TOKEN) throw new Error("META_ACCESS_TOKEN não configurado");

    // Envia resposta via Meta API
    const url = `${META_API}/${comment_id}/replies`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim(), access_token: META_TOKEN }),
    });

    const data = await res.json();
    if (data.error) throw new Error(`Meta API: ${data.error.message} (code ${data.error.code})`);

    return new Response(JSON.stringify({ ok: true, reply_id: data.id }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
