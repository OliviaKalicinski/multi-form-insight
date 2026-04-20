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
  phone: string;
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
  customer_id: string | null;
  match_type: "shopify_id" | "email" | "phone" | "name" | "new";
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

interface Indices {
  shopifyIdIndex: Map<string, string>;
  emailIndex: Map<string, string>;
  phoneIndex: Map<string, string>;
  nameIndex: Map<string, string>;
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

// ── Paginação (default Supabase é 1000 rows) ──────────────────────────

async function fetchAllRows<T = any>(buildQuery: () => any): Promise<T[]> {
  const all: T[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

// ── Carrega índices em memória (1x por invocação) ─────────────────────

async function loadIndices(db: any): Promise<Indices> {
  const [customers, identifiers] = await Promise.all([
    fetchAllRows<{ id: string; nome: string | null; shopify_customer_id: string | null }>(
      () => db.from("customer").select("id, nome, shopify_customer_id").eq("is_active", true),
    ),
    fetchAllRows<{ customer_id: string; type: string; value: string }>(
      () => db.from("customer_identifier").select("customer_id, type, value"),
    ),
  ]);

  const shopifyIdIndex = new Map<string, string>();
  const nameIndex = new Map<string, string>();
  for (const c of customers) {
    if (c.shopify_customer_id) shopifyIdIndex.set(String(c.shopify_customer_id), c.id);
    const nn = normName(c.nome ?? "");
    if (nn && !nameIndex.has(nn)) nameIndex.set(nn, c.id);
  }

  const emailIndex = new Map<string, string>();
  const phoneIndex = new Map<string, string>();
  for (const id of identifiers) {
    if (id.type === "email" && id.value) emailIndex.set(id.value, id.customer_id);
    else if (id.type === "phone" && id.value) phoneIndex.set(id.value, id.customer_id);
  }

  return { shopifyIdIndex, emailIndex, phoneIndex, nameIndex };
}

// ── Matching (100% em memória, zero query) ─────────────────────────────

function matchRow(row: ShopifyRow, idx: Indices): MatchResult {
  if (row.shopify_id && idx.shopifyIdIndex.has(String(row.shopify_id))) {
    return { customer_id: idx.shopifyIdIndex.get(String(row.shopify_id))!, match_type: "shopify_id" };
  }
  const emailNorm = normEmail(row.email);
  if (emailNorm && idx.emailIndex.has(emailNorm)) {
    return { customer_id: idx.emailIndex.get(emailNorm)!, match_type: "email" };
  }
  const phoneNorm = normPhone(row.phone);
  if (phoneNorm.length >= 10 && idx.phoneIndex.has(phoneNorm)) {
    return { customer_id: idx.phoneIndex.get(phoneNorm)!, match_type: "phone" };
  }
  const nameNorm = normName(fullName(row.first_name, row.last_name));
  if (nameNorm && idx.nameIndex.has(nameNorm)) {
    return { customer_id: idx.nameIndex.get(nameNorm)!, match_type: "name" };
  }
  return { customer_id: null, match_type: "new" };
}

// ── Aplicação (writes) ────────────────────────────────────────────────

async function applyRow(
  row: ShopifyRow,
  match: MatchResult,
  db: any,
  counters: ImportSummary,
  idx: Indices,
): Promise<void> {
  const emailNorm = normEmail(row.email);
  const phoneNorm = normPhone(row.phone);
  let customerId = match.customer_id;

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

    // Atualiza índices pra linhas seguintes do mesmo batch
    idx.shopifyIdIndex.set(String(row.shopify_id), customerId);
    const nn = normName(nome);
    if (nn && !idx.nameIndex.has(nn)) idx.nameIndex.set(nn, customerId);
  } else {
    // Só atualiza shopify_customer_id se ainda não estiver mapeado pra esse customer
    if (idx.shopifyIdIndex.get(String(row.shopify_id)) !== customerId) {
      await db
        .from("customer")
        .update({ shopify_customer_id: row.shopify_id })
        .eq("id", customerId)
        .is("shopify_customer_id", null);
      idx.shopifyIdIndex.set(String(row.shopify_id), customerId);
    }
  }

  // Email
  if (emailNorm) {
    if (!idx.emailIndex.has(emailNorm)) {
      const { error: emailErr } = await db.from("customer_identifier").insert({
        customer_id: customerId,
        type: "email",
        value: emailNorm,
        is_primary: true,
      });
      if (!emailErr) {
        counters.emails_added += 1;
        idx.emailIndex.set(emailNorm, customerId);
      }
    }
  }

  // Telefone: sobrescreve sem SELECT prévio (usa phoneIndex em memória)
  if (phoneNorm && phoneNorm.length >= 10) {
    const alreadyMappedTo = idx.phoneIndex.get(phoneNorm);
    if (alreadyMappedTo === customerId) {
      // já tem esse telefone, nada a fazer
    } else {
      // Verifica se o customer já tem ALGUM telefone no índice (busca reversa cara, então usamos heurística:
      // tentamos update direto; se não afetou linha, inserimos)
      const { data: updated, error: updErr } = await db
        .from("customer_identifier")
        .update({ value: phoneNorm, is_primary: true })
        .eq("customer_id", customerId)
        .eq("type", "phone")
        .select("id");

      if (!updErr && updated && updated.length > 0) {
        counters.phones_overwritten += 1;
      } else {
        await db.from("customer_identifier").insert({
          customer_id: customerId,
          type: "phone",
          value: phoneNorm,
          is_primary: true,
        });
      }
      idx.phoneIndex.set(phoneNorm, customerId);
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

  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const rows: ShopifyRow[] = body.rows ?? [];
    const dryRun: boolean = body.dry_run ?? true;
    const batchInfo: { index?: number; total?: number } = body.batch ?? {};

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "rows is required (non-empty array)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startedAt = Date.now();
    const indices = await loadIndices(adminClient);
    const indexLoadMs = Date.now() - startedAt;
    console.log(
      `[import] batch ${batchInfo.index ?? "?"}/${batchInfo.total ?? "?"} — rows=${rows.length} dryRun=${dryRun} indices loaded in ${indexLoadMs}ms ` +
        `(customers=${indices.nameIndex.size} emails=${indices.emailIndex.size} phones=${indices.phoneIndex.size})`,
    );

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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const hasEmail = !!normEmail(row.email);
        const hasPhone = normPhone(row.phone).length >= 10;
        if (!hasEmail && !hasPhone) {
          summary.skipped_no_contact += 1;
          continue;
        }

        const match = matchRow(row, indices);

        switch (match.match_type) {
          case "shopify_id": summary.matched_shopify_id += 1; break;
          case "email": summary.matched_email += 1; break;
          case "phone": summary.matched_phone += 1; break;
          case "name": summary.matched_name += 1; break;
          case "new": /* incrementado no applyRow */ break;
        }

        if (!dryRun) {
          await applyRow(row, match, adminClient, summary, indices);
        } else if (match.match_type === "new") {
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

    const totalMs = Date.now() - startedAt;
    console.log(`[import] batch done in ${totalMs}ms — created=${summary.created_new} errors=${summary.errors}`);

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
