/**
 * debug-meta-token
 *
 * Inspeciona o META_ACCESS_TOKEN ativo e retorna:
 *   - validade (is_valid, expires_at, data_access_expires_at)
 *   - app_id associado
 *   - escopos (scopes[])
 *   - tipo de usuário (user or system user)
 *   - user_id
 *
 * Usa o endpoint /debug_token da Graph API, que exige um `input_token` (o token a validar)
 * e um `access_token` (o próprio token é aceito para System User).
 *
 * Útil pra diagnosticar rapidamente: "o token tem scope X?", "quando expira?", "ainda é válido?".
 *
 * NÃO retorna o token em si — apenas metadados.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const META_API = "https://graph.facebook.com/v20.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const META_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
    if (!META_TOKEN) throw new Error("META_ACCESS_TOKEN não configurado");

    // /debug_token aceita o próprio token como credencial pra inspeção do System User.
    const url = new URL(`${META_API}/debug_token`);
    url.searchParams.set("input_token", META_TOKEN);
    url.searchParams.set("access_token", META_TOKEN);

    const res = await fetch(url.toString());
    const json = await res.json();

    if (json.error) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Meta API: ${json.error.message} (code ${json.error.code})`,
          raw_error: json.error,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const d = json.data ?? {};
    const REQUIRED_SCOPES = [
      "ads_read",
      "ads_management",
      "instagram_basic",
      "instagram_manage_insights",
      "instagram_manage_comments",
      "business_management",
      "pages_read_engagement",
      "pages_show_list",
    ];

    const scopes: string[] = d.scopes ?? [];
    const missingScopes = REQUIRED_SCOPES.filter((s) => !scopes.includes(s));

    const expiresAt = d.expires_at
      ? (d.expires_at === 0 ? "never" : new Date(d.expires_at * 1000).toISOString())
      : "unknown";
    const dataAccessExpiresAt = d.data_access_expires_at
      ? (d.data_access_expires_at === 0 ? "never" : new Date(d.data_access_expires_at * 1000).toISOString())
      : "unknown";

    return new Response(
      JSON.stringify({
        ok: true,
        valid: d.is_valid === true,
        type: d.type ?? "unknown", // "USER" or "SYSTEM_USER"
        app_id: d.app_id ?? null,
        application: d.application ?? null,
        user_id: d.user_id ?? null,
        expires_at: expiresAt,
        data_access_expires_at: dataAccessExpiresAt,
        scopes,
        scopes_count: scopes.length,
        required_scopes: REQUIRED_SCOPES,
        missing_scopes: missingScopes,
        all_scopes_present: missingScopes.length === 0,
        issued_at: d.issued_at ? new Date(d.issued_at * 1000).toISOString() : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error(err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
