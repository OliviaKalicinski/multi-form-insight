import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Normalise text for fuzzy matching: lowercase, strip accents */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapse spaced-out characters (e.g. "C D _ O R I G I N A L" → "CD_ORIGINAL")
 *  Only collapses sequences of 3+ single chars separated by spaces.
 *  Does NOT collapse normal phrases like "VALOR TOTAL DA NOTA". */
function collapseSpacedText(text: string): string {
  return text.replace(/\b(?:[A-Z0-9] ){3,}[A-Z0-9]\b/g, (m) =>
    m.replace(/\s+/g, "")
  );
}

/** Map DANFE description → technical product ID */
const PRODUCT_PATTERNS: [RegExp, string][] = [
  [/comida de drag.{0,5}original.*90/i, "CD_ORIGINAL_90G"],
  [/mordida de drag.{0,5}legumes.*180/i, "CD_MORDIDA_LEGUMES_180G"],
  [/mordida de drag.{0,5}spirulina.*180/i, "CD_MORDIDA_SPIRULINA_180G"],
  [/suplemento integral.*180/i, "CD_SUPLEMENTO_INTEGRAL_180G"],
  [/suplemento concentrado.*200/i, "CD_SUPLEMENTO_CONCENTRADO_200G"],
  [/suplemento.*gatos.*180/i, "CD_SUPLEMENTO_GATOS_180G"],
  [/grub.*120/i, "CD_GRUB_120G"],
  [/kit completo/i, "CD_KIT_COMPLETO"],
  [/kit.*original.*3/i, "CD_KIT_ORIGINAL_3X"],
  [/kit.*legumes.*3/i, "CD_KIT_LEGUMES_3X"],
  [/kit.*spirulina.*3/i, "CD_KIT_SPIRULINA_3X"],
  [/kit.*gatos/i, "CD_KIT_GATOS"],
  [/kit.*amostra/i, "CD_KIT_AMOSTRAS"],
  [/amostra.*original/i, "CD_AMOSTRA_ORIGINAL"],
  [/amostra.*legumes/i, "CD_AMOSTRA_LEGUMES"],
  [/amostra.*spirulina/i, "CD_AMOSTRA_SPIRULINA"],
  [/amostra.*suplemento.*integral/i, "CD_AMOSTRA_SUPLEMENTO_INTEGRAL"],
  [/amostra.*suplemento.*concentrado/i, "CD_AMOSTRA_SUPLEMENTO_CONCENTRADO"],
  [/amostra.*gatos/i, "CD_AMOSTRA_GATOS"],
  [/amostra.*grub/i, "CD_AMOSTRA_GRUB"],
  [/infogr[aá]fico/i, "CD_INFOGRAFICO"],
  [/qr\s*code/i, "CD_QR_CODE"],
  [/caixa\s*seeding/i, "CD_CAIXA_SEEDING"],
  [/caneca/i, "CD_CANECA"],
  [/adesivo/i, "CD_ADESIVO"],
  [/farinha.*bsf.*integral/i, "LF_FARINHA_BSF_INTEGRAL"],
  [/farinha.*bsf.*desengordurada/i, "LF_FARINHA_BSF_DESENGORDURADA"],
  [/farinha.*bsf.*desidratada/i, "LF_FARINHA_BSF_DESIDRATADA"],
  [/larva.*natura/i, "LF_LARVA_IN_NATURA"],
  [/[oó]leo.*bsf/i, "LF_OLEO_BSF"],
  [/frass/i, "LF_FRASS"],
];

function matchProduct(desc: string): string | null {
  const n = norm(desc);
  for (const [pat, id] of PRODUCT_PATTERNS) {
    if (pat.test(desc) || pat.test(n)) return id;
  }
  return null;
}

interface ExtractedProduct {
  descricao: string;
  quantidade: number;
  valor_unit: number;
  valor_total: number;
  product_id: string | null;
}

function extractFromText(text: string) {
  // chave de acesso (44 digits)
  const accessKeyMatch = text.match(/\b\d{44}\b/);
  const chave_acesso = accessKeyMatch?.[0] ?? null;

  // numero_nf — tolerant regex chain
  const nfMatch = text.match(/NF-?e?\s*N[ºo°.]?\s*([\d.]+)/i)
    || text.match(/N[ºo°]\s*[:\-]?\s*(\d{3,})/i)
    || text.match(/NÚMERO\s*([\d.]+)/i);
  const numero_nf = nfMatch ? nfMatch[1].replace(/\./g, "") : null;

  // serie
  const serieMatch = text.match(/S[ÉE]RIE\s*:?\s*(\d+)/i);
  const serie = serieMatch ? serieMatch[1] : null;

  // valor_total — tolerant regex chain
  const valorMatch =
    text.match(/VALOR\s+TOTAL\s+DA\s+NOTA\s*R?\$?\s*([\d.,]+)/i)
    || text.match(/TOTAL\s+DA\s+NOTA\s*R?\$?\s*([\d.,]+)/i)
    || text.match(/VALOR\s+TOTAL\s*R?\$?\s*([\d.,]+)/i)
    || text.match(/VLR\.\s*TOTAL\s*DA\s*NF\s*[:\s]*([\d.,]+)/i);
  const valor_total = valorMatch
    ? parseFloat(valorMatch[1].replace(/\./g, "").replace(",", "."))
    : null;

  // cliente
  const clienteMatch = text.match(/DESTINAT[ÁA]RIO.*?NOME.*?[:]\s*(.+)/i);
  const cliente_nome = clienteMatch ? clienteMatch[1].trim() : null;

  // pedido ref
  const pedidoMatch = text.match(/N[ºo°.]?\s*Pedido\s*:?\s*(\d+)/i);
  const numero_pedido_ref = pedidoMatch ? pedidoMatch[1] : null;

  // products — try technical code regex first, then fallback to positional
  const produtos: ExtractedProduct[] = [];

  // Priority 1: Technical product codes (e.g. CD_ORIGINAL_90G 15 UN 25,66 384,94)
  const techProdRegex =
    /([A-Z0-9_\-]{3,})\s+(\d+(?:[.,]\d+)?)\s+(?:UN|KG|CX|PC)?\s*(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)/gi;
  let m;
  while ((m = techProdRegex.exec(text)) !== null) {
    const descricao = m[1].trim();
    const quantidade = parseFloat(m[2].replace(",", "."));
    const valor_unit = parseFloat(m[3].replace(/\./g, "").replace(",", "."));
    const valor_total_item = parseFloat(m[4].replace(/\./g, "").replace(",", "."));
    produtos.push({
      descricao,
      quantidade,
      valor_unit,
      valor_total: valor_total_item,
      product_id: matchProduct(descricao),
    });
  }

  // Priority 2: Positional fallback (code | description | unit | qty | unit_price | total_price)
  if (produtos.length === 0) {
    const prodRegex = /(\d{2,6})\s+(.+?)\s+(Un|Kg|un|kg|UN|KG)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/g;
    while ((m = prodRegex.exec(text)) !== null) {
      const descricao = m[2].trim();
      const quantidade = parseFloat(m[4].replace(",", "."));
      const valor_unit = parseFloat(m[5].replace(/\./g, "").replace(",", "."));
      const valor_total_item = parseFloat(m[6].replace(/\./g, "").replace(",", "."));
      produtos.push({
        descricao,
        quantidade,
        valor_unit,
        valor_total: valor_total_item,
        product_id: matchProduct(descricao),
      });
    }
  }

  return { numero_nf, serie, valor_total, cliente_nome, numero_pedido_ref, produtos, chave_acesso };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth check
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
    const { order_id, file_path } = await req.json();
    if (!order_id || !file_path) {
      return new Response(JSON.stringify({ error: "order_id and file_path required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set processing status
    await adminClient
      .from("operational_orders")
      .update({ reconciliacao_status: "processando" })
      .eq("id", order_id);

    // Download PDF
    const { data: fileData, error: fileError } = await adminClient.storage
      .from("operational-documents")
      .download(file_path);

    if (fileError || !fileData) {
      await adminClient
        .from("operational_orders")
        .update({ reconciliacao_status: "erro", divergencia: null })
        .eq("id", order_id);
      return new Response(JSON.stringify({ error: "Failed to download PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text from PDF
    let rawText = "";
    try {
      const pdfjsLib = await import(
        "npm:pdfjs-dist@4.0.379/legacy/build/pdf.mjs"
      );
      pdfjsLib.GlobalWorkerOptions.workerSrc = undefined;

      const buffer = await fileData.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        useWorkerFetch: false,
        isEvalSupported: false,
      }).promise;

      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str).filter(Boolean);
        pages.push(strings.join(" "));
      }
      rawText = pages.join("\n");
    } catch (parseErr: any) {
      console.error("PDF parse failed", {
        message: parseErr?.message,
        stack: parseErr?.stack,
      });
      await adminClient
        .from("operational_orders")
        .update({ reconciliacao_status: "erro", divergencia: null })
        .eq("id", order_id);

      // Log event
      await adminClient.from("order_events").insert({
        order_id,
        tipo_evento: "reconciliacao_erro",
        payload: { erro: "Falha ao extrair texto do PDF", detail: parseErr?.message },
      });

      return new Response(JSON.stringify({ error: "Failed to parse PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize spaced-out characters before extraction
    rawText = collapseSpacedText(rawText);

    // Extract structured data
    const extracted = extractFromText(rawText);

    // Get order items for comparison
    const { data: orderItems } = await adminClient
      .from("operational_order_items")
      .select("*")
      .eq("operational_order_id", order_id);

    const { data: orderData } = await adminClient
      .from("operational_orders")
      .select("valor_total_informado")
      .eq("id", order_id)
      .single();

    // Check duplicate NF
    let nfDuplicada = false;
    if (extracted.numero_nf) {
      const { data: existing } = await adminClient
        .from("nf_extracted_data")
        .select("order_id")
        .eq("numero_nf", extracted.numero_nf)
        .neq("order_id", order_id);
      nfDuplicada = (existing || []).length > 0;
    }

    // Compare
    const divergencia: Record<string, boolean> = {
      valor: false,
      produto: false,
      quantidade: false,
      nf_duplicada: nfDuplicada,
    };

    // Value comparison
    if (extracted.valor_total != null && orderData) {
      divergencia.valor = Math.abs(extracted.valor_total - orderData.valor_total_informado) > 0.01;
    }

    // Flag unrecognized products
    if (extracted.produtos.some(p => p.product_id == null)) {
      divergencia.produto = true;
    }

    // Product comparison
    if (extracted.produtos.length > 0 && orderItems && orderItems.length > 0) {
      const nfIds = new Set(extracted.produtos.map((p) => p.product_id).filter(Boolean));
      const orderIds = new Set(orderItems.map((i: any) => i.produto));

      // Check if all order products are in NF
      for (const id of orderIds) {
        if (!nfIds.has(id)) {
          divergencia.produto = true;
          break;
        }
      }
      // Check if all NF products are in order
      for (const id of nfIds) {
        if (!orderIds.has(id)) {
          divergencia.produto = true;
          break;
        }
      }

      // Quantity comparison (per product)
      if (!divergencia.produto) {
        const nfQty: Record<string, number> = {};
        for (const p of extracted.produtos) {
          if (p.product_id) nfQty[p.product_id] = (nfQty[p.product_id] || 0) + p.quantidade;
        }
        const orderQty: Record<string, number> = {};
        for (const i of orderItems as any[]) {
          orderQty[i.produto] = (orderQty[i.produto] || 0) + Number(i.quantidade);
        }
        for (const id of Object.keys(orderQty)) {
          if (Math.abs((nfQty[id] || 0) - orderQty[id]) > 0.01) {
            divergencia.quantidade = true;
            break;
          }
        }
      }
    }

    const hasDivergence = Object.values(divergencia).some(Boolean);

    // Upsert nf_extracted_data
    await adminClient.from("nf_extracted_data").upsert(
      {
        order_id,
        numero_nf: extracted.numero_nf,
        serie: extracted.serie,
        valor_total: extracted.valor_total,
        cliente_nome: extracted.cliente_nome,
        produtos: extracted.produtos,
        numero_pedido_ref: extracted.numero_pedido_ref,
        chave_acesso: extracted.chave_acesso,
        raw_text: rawText.substring(0, 20000),
      },
      { onConflict: "order_id,numero_nf" }
    );

    // Update order
    await adminClient
      .from("operational_orders")
      .update({
        reconciliado: !hasDivergence,
        divergencia: hasDivergence ? divergencia : null,
        reconciliacao_status: "concluido",
        numero_nf: extracted.numero_nf || undefined,
      })
      .eq("id", order_id);

    // Log event
    await adminClient.from("order_events").insert({
      order_id,
      tipo_evento: hasDivergence ? "reconciliacao_divergente" : "reconciliacao_ok",
      payload: {
        numero_nf: extracted.numero_nf,
        chave_acesso: extracted.chave_acesso,
        valor_nf: extracted.valor_total,
        produtos_extraidos: extracted.produtos.length,
        divergencia,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        reconciliado: !hasDivergence,
        divergencia,
        extracted: {
          numero_nf: extracted.numero_nf,
          chave_acesso: extracted.chave_acesso,
          valor_total: extracted.valor_total,
          produtos_count: extracted.produtos.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Process NF error:", err);

    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.order_id) {
        await adminClient
          .from("operational_orders")
          .update({ reconciliacao_status: "erro", divergencia: null })
          .eq("id", body.order_id);
      }
    } catch {}

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
