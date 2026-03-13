// ═══════════════════════════════════════════════════════════════════════════
// ARQUIVO 2/5 — Edge Function
// Destino: supabase/functions/sync-ga4/index.ts
// Deploy: supabase functions deploy sync-ga4 --project-ref hqpupwtddwcvakhhjvcq
// Secret necessário: GA4_SERVICE_ACCOUNT_JSON (colar o JSON inteiro)
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PROPERTY_ID = "475397445";

// ─── Auth Google via JWT nativo Deno (sem dependências externas) ──────────
async function getGoogleToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const enc = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })}`;

  const pemBody = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  const jwt = `${unsigned}.${btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const td = await tokenRes.json();
  if (!td.access_token) throw new Error(`Token error: ${JSON.stringify(td)}`);
  return td.access_token;
}

// ─── GA4 REST helper ──────────────────────────────────────────────────────
async function ga4Report(token: string, body: object) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(`GA4: ${JSON.stringify(data.error)}`);
  return data;
}

// ─── Parsers ──────────────────────────────────────────────────────────────
function fmtDate(raw: string) {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}
const num = (v: string) => parseFloat(v) || 0;

function parseSessions(data: any) {
  return (data.rows ?? []).map((row: any) => {
    const [date, sm] = row.dimensionValues.map((d: any) => d.value);
    const [sessions, users, newUsers, tx, rev, carts, chk] =
      row.metricValues.map((m: any) => num(m.value));
    return {
      date: fmtDate(date), source_medium: sm,
      sessions, users, new_users: newUsers,
      transactions: tx, purchase_revenue: rev,
      add_to_carts: carts, checkouts: chk,
    };
  });
}

function parseProducts(data: any) {
  return (data.rows ?? []).map((row: any) => {
    const [date, item] = row.dimensionValues.map((d: any) => d.value);
    const [viewed, added, purchased, rev] = row.metricValues.map((m: any) => num(m.value));
    return {
      date: fmtDate(date), item_name: item,
      items_viewed: viewed, items_added_to_cart: added,
      items_purchased: purchased, item_revenue: rev,
    };
  });
}

function parseBehavior(data: any, dimType: string) {
  return (data.rows ?? []).map((row: any) => {
    const [date, dimVal] = row.dimensionValues.map((d: any) => d.value);
    const [sessions, users, newUsers, bounce, avgDur, tx] =
      row.metricValues.map((m: any) => num(m.value));
    return {
      date: fmtDate(date), dimension_type: dimType, dimension_value: dimVal,
      sessions, users, new_users: newUsers,
      bounce_rate: bounce, avg_session_duration: avgDur, transactions: tx,
    };
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const saJson = Deno.env.get("GA4_SERVICE_ACCOUNT_JSON");
    if (!saJson) throw new Error("GA4_SERVICE_ACCOUNT_JSON not set");

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const mode = body.mode ?? "daily";
    const lookback = mode === "full" ? 365 : 5;

    const end = new Date(); end.setDate(end.getDate() - 1);
    const start = new Date(); start.setDate(start.getDate() - lookback);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const [startDate, endDate] = [fmt(start), fmt(end)];

    console.log(`Sync GA4 [${mode}]: ${startDate} → ${endDate}`);
    const token = await getGoogleToken(saJson);

    // Rodar 5 relatórios em paralelo
    const [sessData, prodData, devData, cityData, pageData] = await Promise.all([
      // 1. Sessões por source/medium
      ga4Report(token, {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }, { name: "sessionSourceMedium" }],
        metrics: [
          { name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" },
          { name: "transactions" }, { name: "purchaseRevenue" },
          { name: "addToCarts" }, { name: "checkouts" },
        ],
        limit: 50000,
      }),
      // 2. Produtos
      ga4Report(token, {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }, { name: "itemName" }],
        metrics: [
          { name: "itemsViewed" }, { name: "itemsAddedToCart" },
          { name: "itemsPurchased" }, { name: "itemRevenue" },
        ],
        limit: 50000,
      }),
      // 3. Dispositivo
      ga4Report(token, {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }, { name: "deviceCategory" }],
        metrics: [
          { name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" },
          { name: "bounceRate" }, { name: "averageSessionDuration" }, { name: "transactions" },
        ],
        limit: 10000,
      }),
      // 4. Cidade
      ga4Report(token, {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }, { name: "city" }],
        metrics: [
          { name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" },
          { name: "bounceRate" }, { name: "averageSessionDuration" }, { name: "transactions" },
        ],
        limit: 10000,
      }),
      // 5. Landing page
      ga4Report(token, {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }, { name: "landingPage" }],
        metrics: [
          { name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" },
          { name: "bounceRate" }, { name: "averageSessionDuration" }, { name: "transactions" },
        ],
        limit: 10000,
      }),
    ]);

    const sessionRows = parseSessions(sessData);
    const productRows = parseProducts(prodData);
    const behaviorRows = [
      ...parseBehavior(devData, "device"),
      ...parseBehavior(cityData, "city"),
      ...parseBehavior(pageData, "landing_page"),
    ];

    const upserts = [];
    if (sessionRows.length)
      upserts.push(supabase.from("ga4_sessions").upsert(sessionRows, { onConflict: "date,source_medium" }));
    if (productRows.length)
      upserts.push(supabase.from("ga4_products").upsert(productRows, { onConflict: "date,item_name" }));
    if (behaviorRows.length)
      upserts.push(supabase.from("ga4_behavior").upsert(behaviorRows, { onConflict: "date,dimension_type,dimension_value" }));

    const results = await Promise.all(upserts);
    for (const r of results) {
      if (r.error) throw r.error;
    }

    return new Response(JSON.stringify({
      ok: true,
      session_rows: sessionRows.length,
      product_rows: productRows.length,
      behavior_rows: behaviorRows.length,
      period: `${startDate} → ${endDate}`,
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
