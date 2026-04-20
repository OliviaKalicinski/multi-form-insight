import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Tipos ──────────────────────────────────────────────────────────────

interface ShopifyRow {
  shopify_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;          // melhor telefone disponível (Phone > Default Address Phone)
  total_spent: number;
  total_orders: number;
  accepts_email_marketing: boolean;
  accepts_sms_marketing: boolean;
  pet_name?: string;
  pet_age?: string;
  pet_breed?: string;
  tags?: string;
  city?: string;
  state?: string;
}

interface MatchResult {
  customer_id: string | null;          // null = cliente novo a criar
  match_type: "shopify_id" | "email" | "phone" | "name" | "new";
  existing_phone?: string | null;      // pra decidir sobrescrita
  existing_email?: string | null;
}

interface ImportSummary {
  total_rows: number;
  matched_shopify_id: number;
  matched_email: number;
  matched_phone: number;
  matched_name: number;
  created_new: number;
  errors: number;
  error_details: Array<{ row: number; shopify_id: string; error: string }>;
  phones_overwritten: number;
  emails_added: number;
  skipped_no_contact: number;
}

// ── Normalização ───────────────────────────────────────────────────────

function normEmail(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function normPhone(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

function normName(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function fullName(first: string, last: string): string {
  return `${(first ?? "").trim()} ${(last ?? "").trim()}`.trim();
}

// ── Matching ───────────────────────────────────────────────────────────

async function matchRow(
  row: ShopifyRow,
  db: any,
  nameIndex: Map<string, string>, // nome_norm → customer_id (já carregado)
): Promise<MatchResult> {
  // 1. Match por shopify_customer_id (reimportação idempotente)
  if (row.shopify_id) {
    const { data } = await db
      .from("customer")
      .select("id")
      .eq("shopify_customer_id", row.shopify_id)
      .maybeSingle();
    if (data) {
      return { customer_id: data.id, match_type: "shopify_id" };
    }
  }

  // 2. Match por email
  const emailNorm = normEmail(row.email);
  if (emailNorm) {
    const { data } = await db
      .from("customer_identifier")
      .select("customer_id")
      .eq("type", "email")
      .eq("value", emailNorm)
      .limit(1)
      .maybeSingle();
    if (data) {
      return { customer_id: data.customer_id, match_type: "email" };
    }
  }

  // 3. Match por telefone
  const phoneNorm = normPhone(row.phone);
  if (phoneNorm && phoneNorm.length >= 10) {
    const { data } = await db
      .from("customer_identifier")
      .select("customer_id")
      .eq("type", "phone")
      .eq("value", phoneNorm)
      .limit(1)
      .maybeSingle();
    if (data) {
      return { customer_id: data.customer_id, match_type: "phone" };
    }
  }

  // 4. Match por nome idêntico (normalizado)
  const nameNorm = normName(fullName(row.first_name, row.last_name));
  if (nameNorm && nameIndex.has(nameNorm)) {
    return { customer_id: nameIndex.get(nameNorm)!, match_type: "name" };
  }

  // 5. Sem match → novo
  return { customer_id: null, match_type: "new" };
}

// ── Aplicação (apenas em modo execute) ─────────────────────────────────

async function applyRow(
  row: ShopifyRow,
  match: MatchResult,
  db: any,
  counters: ImportSummary,
): Promise<void> {
  const emailNorm = normEmail(row.email);
  const phoneNorm = normPhone(row.phone);

  let customerId = match.customer_id;

  // Cria customer novo se não houve match
  if (!customerId) {
    const nome = fullName(row.first_name, row.last_name) || row.email || `Shopify ${row.shopify_id}`;
    const syntheticCpf = `shopify-${row.shopify_id}`;

    const obs: string[] = [];
    if (row.pet_name) obs.push(`Pet: ${row.pet_name}`);
    if (row.pet_breed) obs.push(`Raça: ${row.pet_breed}`);
    if (row.pet_age) obs.push(`Idade pet: ${row.pet_age}`);
    if (row.city || row.state) obs.push(`${row.city ?? ""}${row.state ? " - " + row.state : ""}`.trim());
    if (row.tags) obs.push(`Tags Shopify: ${row.tags}`);

    const { data: inserted, error: insertErr } = await db
      .from("customer")
      .insert({
        cpf_cnpj: syntheticCpf,
        nome,
        shopify_customer_id: row.shopify_id,
        is_active: true,
        observacoes: obs.length ? obs.join(" • ") : null,
        total_orders_all: 0,
        total_orders_revenue: 0,
        total_revenue: 0,
      })
      .select("id")
      .single();

    if (insertErr) throw insertErr;
    customerId = inserted.id;
    counters.created_new += 1;
  } else {
    // Garante que o customer.shopify_customer_id esteja preenchido
    await db
      .from("customer")
      .update({ shopify_customer_id: row.shopify_id })
      .eq("id", customerId)
      .is("shopify_customer_id", null);
  }

  // Email: adiciona se não existir (não sobrescreve, emails raramente mudam)
  if (emailNorm) {
    const { data: existingEmail } = await db
      .from("customer_identifier")
      .select("id")
      .eq("customer_id", customerId)
      .eq("type", "email")
      .eq("value", emailNorm)
      .maybeSingle();

    if (!existingEmail) {
      await db.from("customer_identifier").insert({
        customer_id: customerId,
        type: "email",
        value: emailNorm,
        is_primary: true,
      });
      counters.emails_added += 1;
    }
  }

  // Telefone: sobrescreve (regra decidida com a Olivia)
  if (phoneNorm && phoneNorm.length >= 10) {
    const { data: existingPhones } = await db
      .from("customer_identifier")
      .select("id, value")
      .eq("customer_id", customerId)
      .eq("type", "phone");

    const alreadyHas = existingPhones?.some((p: any) => p.value === phoneNorm);
    if (alreadyHas) {
      // Mesmo telefone, nada a fazer
    } else if (existingPhones && existingPhones.length > 0) {
      // Sobrescreve o primeiro, mantém os outros (se houver)
      await db
        .from("customer_identifier")
        .update({ value: phoneNorm, is_primary: true })
        .eq("id", existingPhones[0].id);
      counters.phones_overwritten += 1;
    } else {
      await db.from("customer_identifier").insert({
        customer_id: customerId,
        type: "phone",
        value: phoneNorm,
        is_primary: true,
      });
    }
  }
}

// ── Handler principal ──────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth: precisa estar logado
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Admin client (bypassa RLS pra escrever em customer)
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const rows: ShopifyRow[] = body.rows ?? [];
    const dryRun: boolean = body.dry_run ?? true;

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "rows is required (non-empty array)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pré-carrega índice de nomes → customer_id (1 query só, evita N+1)
    const { data: allCustomers } = await adminClient
      .from("customer")
      .select("id, nome")
      .eq("is_active", true);

    const nameIndex = new Map<string, string>();
    for (const c of allCustomers ?? []) {
      const nn = normName(c.nome ?? "");
      if (nn && !nameIndex.has(nn)) nameIndex.set(nn, c.id);
    }

    const summary: ImportSummary = {
      total_rows: rows.length,
      matched_shopify_id: 0,
      matched_email: 0,
      matched_phone: 0,
      matched_name: 0,
      created_new: 0,
      errors: 0,
      error_details: [],
      phones_overwritten: 0,
      emails_added: 0,
      skipped_no_contact: 0,
    };

    // Cria log da execução
    const { data: logRow } = await adminClient
      .from("shopify_import_log")
      .insert({
        started_at: new Date().toISOString(),
        total_rows: rows.length,
        dry_run: dryRun,
        created_by: claimsData.claims.sub,
      })
      .select("id")
      .single();

    const logId = logRow?.id;

    // Processa linhas
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Filtra linhas sem nenhum contato (a regra da Olivia)
        const hasEmail = !!normEmail(row.email);
        const hasPhone = normPhone(row.phone).length >= 10;
        if (!hasEmail && !hasPhone) {
          summary.skipped_no_contact += 1;
          continue;
        }

        const match = await matchRow(row, adminClient, nameIndex);

        switch (match.match_type) {
          case "shopify_id": summary.matched_shopify_id += 1; break;
          case "email": summary.matched_email += 1; break;
          case "phone": summary.matched_phone += 1; break;
          case "name": summary.matched_name += 1; break;
          case "new": /* summary.created_new incrementado no applyRow */ break;
        }

        if (!dryRun) {
          await applyRow(row, match, adminClient, summary);
        } else if (match.match_type === "new") {
          // No dry-run, contamos os "novos" só pra preview
          summary.created_new += 1;
        }
      } catch (err: any) {
        summary.errors += 1;
        if (summary.error_details.length < 50) {
          summary.error_details.push({
            row: i + 1,
            shopify_id: row.shopify_id ?? "",
            error: err?.message ?? String(err),
          });
        }
      }
    }

    // Atualiza o log com resultado
    if (logId) {
      await adminClient
        .from("shopify_import_log")
        .update({
          finished_at: new Date().toISOString(),
          matched_shopify_id: summary.matched_shopify_id,
          matched_email: summary.matched_email,
          matched_phone: summary.matched_phone,
          matched_name: summary.matched_name,
          created_new: summary.created_new,
          errors: summary.errors,
          error_details: summary.error_details,
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: true, dry_run: dryRun, log_id: logId, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Import error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
