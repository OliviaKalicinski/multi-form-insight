import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PROPERTY_ID = "475397445";

async function getGoogleToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const enc = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600, iat: now,
  })}`;
  const pemBody = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\n/g, "");
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsigned));
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

async function ga4Report(token: string, body: object) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  const data = await res.json();
  if (data.error) throw new Error(`GA4: ${JSON.stringify(data.error)}`);
  return data;
}

function fmtDate(raw: string) { return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`; }
const num = (v: string) => parseFloat(v) || 0;

function parseSessions(data: any) {
  return (data.rows ?? []).map((row: any) => {
    const [date, sm] = row.dimensionValues.map((d: any) => d.value);
    const [sessions, users, newUsers, tx, rev, carts, chk] = row.metricValues.map((m: any) => num(m.value));
    return { date: fmtDate(date), source_medium: sm, sessions, users, new_users: newUsers, transactions: tx, purchase_revenue: rev, add_to_carts: carts, checkouts: chk };
  });
}

function parseProducts(data: any) {
  return (data.rows ?? []).map((row: any) => {
    const [date, item] = row.dimensionValues.map((d: any) => d.value);
    const [viewed, added, purchased, rev] = row.metricValues.map((m: any) => num(m.value));
    return { date: fmtDate(date), item_name: item, items_viewed: viewed, items_added_to_cart: added, items_purchased: purchased, item_revenue: rev };
  });
}

function parseBehavior(data: any, dimType: string) {
  return (data.rows ?? []).map((row: any) => {
    const [date, dimVal] = row.dimensionValues.map((d: any) => d.value);
    const [sessions, users, newUsers, bounce, avgDur, tx] = row.metricValues.map((m: any) => num(m.value));
    return { date: fmtDate(date), dimension_type: dimType, dimension_value: dimVal, sessions, users, new_users: newUsers, bounce_rate: bounce, avg_session_duration: avgDur, transactions: tx };
  });
}

// Gera chunks de 30 dias entre start e end
function dateChunks(startDate: string, endDate: string): { start: string; end: string }[] {
  const chunks = [];
  let cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    const chunkEnd = new Date(cur);
    chunkEnd.setDate(chunkEnd.getDate() + 29);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());
    chunks.push({ start: cur.toISOString().slice(0, 10), end: chunkEnd.toISOString().slice(0, 10) });
    cur = new Date(chunkEnd);
    cur.setDate(cur.getDate() + 1);
  }
  return chunks;
}

async function syncChunk(token: string, supabase: any, startDate: string, endDate: string) {
  const [sessData, prodData, devData, cityData, pageData] = await Promise.all([
    ga4Report(token, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }, { name: "sessionSourceMedium" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" }, { name: "transactions" }, { name: "purchaseRevenue" }, { name: "addToCarts" }, { name: "checkouts" }],
      limit: 10000,
    }),
    ga4Report(token, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }, { name: "itemName" }],
      metrics: [{ name: "itemsViewed" }, { name: "itemsAddedToCart" }, { name: "itemsPurchased" }, { name: "itemRevenue" }],
      limit: 10000,
    }),
    ga4Report(token, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }, { name: "deviceCategory" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" }, { name: "bounceRate" }, { name: "averageSessionDuration" }, { name: "transactions" }],
      limit: 5000,
    }),
    ga4Report(token, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }, { name: "city" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" }, { name: "bounceRate" }, { name: "averageSessionDuration" }, { name: "transactions" }],
      limit: 5000,
    }),
    ga4Report(token, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }, { name: "landingPage" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" }, { name: "bounceRate" }, { name: "averageSessionDuration" }, { name: "transactions" }],
      limit: 5000,
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
  if (sessionRows.length) upserts.push(supabase.from("ga4_sessions").upsert(sessionRows, { onConflict: "date,source_medium" }));
  if (productRows.length) upserts.push(supabase.from("ga4_products").upsert(productRows, { onConflict: "date,item_name" }));
  if (behaviorRows.length) upserts.push(supabase.from("ga4_behavior").upsert(behaviorRows, { onConflict: "date,dimension_type,dimension_value" }));

  const results = await Promise.all(upserts);
  for (const r of results) { if (r.error) throw r.error; }

  return { session_rows: sessionRows.length, product_rows: productRows.length, behavior_rows: behaviorRows.length };
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const saJson = Deno.env.get("GA4_SERVICE_ACCOUNT_JSON");
    if (!saJson) throw new Error("GA4_SERVICE_ACCOUNT_JSON not set");

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const mode = body.mode ?? "daily";

    const endD = new Date(); endD.setDate(endD.getDate() - 1);
    const startD = new Date(); startD.setDate(startD.getDate() - (mode === "full" ? 365 : 5));
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const [startDate, endDate] = [fmt(startD), fmt(endD)];

    console.log(`Sync GA4 [${mode}]: ${startDate} → ${endDate}`);
    const token = await getGoogleToken(saJson);

    const chunks = dateChunks(startDate, endDate);
    let totalSessions = 0, totalProducts = 0, totalBehavior = 0;

    for (const chunk of chunks) {
      console.log(`Chunk: ${chunk.start} → ${chunk.end}`);
      const result = await syncChunk(token, supabase, chunk.start, chunk.end);
      totalSessions += result.session_rows;
      totalProducts += result.product_rows;
      totalBehavior += result.behavior_rows;
    }

    return new Response(JSON.stringify({
      ok: true,
      chunks: chunks.length,
      session_rows: totalSessions,
      product_rows: totalProducts,
      behavior_rows: totalBehavior,
      period: `${startDate} → ${endDate}`,
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
