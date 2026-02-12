import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchDataContext(supabase: any) {
  // Sales: last 90 days aggregated
  const { data: salesSummary } = await supabase.rpc("get_sales_summary_90d").maybeSingle();

  // If rpc doesn't exist, fallback to direct query
  const { data: salesRaw } = await supabase
    .from("sales_data")
    .select("data_venda, valor_total, valor_frete, produtos, canal, status, estado, forma_envio, cupom")
    .gte("data_venda", new Date(Date.now() - 90 * 86400000).toISOString())
    .order("data_venda", { ascending: false })
    .limit(500);

  // Ads: last 90 days
  const { data: adsRaw } = await supabase
    .from("ads_data")
    .select("data, gasto, impressoes, cliques, conversoes, receita, alcance, cpc, cpm, ctr, roas_resultados, campanha, objetivo")
    .gte("data", new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0])
    .order("data", { ascending: false })
    .limit(300);

  // Followers: last 90 days
  const { data: followersRaw } = await supabase
    .from("followers_data")
    .select("data, total_seguidores, novos_seguidores, unfollows")
    .gte("data", new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0])
    .order("data", { ascending: false })
    .limit(100);

  // Marketing (Instagram metrics): last 90 days
  const { data: marketingRaw } = await supabase
    .from("marketing_data")
    .select("data, metrica, valor")
    .gte("data", new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0])
    .order("data", { ascending: false })
    .limit(300);

  // Pre-aggregate sales for compact context
  const salesContext = aggregateSales(salesRaw || []);
  const adsContext = aggregateAds(adsRaw || []);

  return {
    vendas: salesContext,
    ads: adsContext,
    seguidores: followersRaw || [],
    marketing: marketingRaw || [],
  };
}

function aggregateSales(rows: any[]) {
  if (!rows.length) return { resumo: "Sem dados de vendas nos últimos 90 dias.", detalhes: [] };

  const totalRevenue = rows.reduce((s, r) => s + Number(r.valor_total || 0), 0);
  const totalFreight = rows.reduce((s, r) => s + Number(r.valor_frete || 0), 0);
  const orderCount = rows.length;

  // Weekly breakdown
  const weekMap: Record<string, { revenue: number; orders: number; freight: number }> = {};
  for (const r of rows) {
    const d = new Date(r.data_venda);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    if (!weekMap[key]) weekMap[key] = { revenue: 0, orders: 0, freight: 0 };
    weekMap[key].revenue += Number(r.valor_total || 0);
    weekMap[key].orders += 1;
    weekMap[key].freight += Number(r.valor_frete || 0);
  }

  // Product breakdown
  const productMap: Record<string, { qty: number; revenue: number }> = {};
  for (const r of rows) {
    try {
      const produtos = typeof r.produtos === "string" ? JSON.parse(r.produtos) : r.produtos;
      if (Array.isArray(produtos)) {
        for (const p of produtos) {
          const name = p.nome || p.name || "Desconhecido";
          const qty = Number(p.quantidade || p.qty || 1);
          const price = Number(p.preco || p.price || 0);
          if (!productMap[name]) productMap[name] = { qty: 0, revenue: 0 };
          productMap[name].qty += qty;
          productMap[name].revenue += price * qty;
        }
      }
    } catch { /* skip */ }
  }

  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 15)
    .map(([name, d]) => ({ nome: name, quantidade: d.qty, receita: d.revenue.toFixed(2) }));

  // Channel breakdown
  const channelMap: Record<string, number> = {};
  for (const r of rows) {
    const ch = r.canal || "Desconhecido";
    channelMap[ch] = (channelMap[ch] || 0) + 1;
  }

  // Status breakdown
  const statusMap: Record<string, number> = {};
  for (const r of rows) {
    const st = r.status || "Desconhecido";
    statusMap[st] = (statusMap[st] || 0) + 1;
  }

  return {
    periodo: "Últimos 90 dias",
    total_pedidos: orderCount,
    receita_total: totalRevenue.toFixed(2),
    frete_total: totalFreight.toFixed(2),
    ticket_medio: (totalRevenue / orderCount).toFixed(2),
    por_semana: Object.entries(weekMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([w, d]) => ({ semana: w, pedidos: d.orders, receita: d.revenue.toFixed(2), frete: d.freight.toFixed(2) })),
    top_produtos: topProducts,
    por_canal: channelMap,
    por_status: statusMap,
  };
}

function aggregateAds(rows: any[]) {
  if (!rows.length) return { resumo: "Sem dados de ads nos últimos 90 dias." };

  const totalSpend = rows.reduce((s, r) => s + Number(r.gasto || 0), 0);
  const totalRevenue = rows.reduce((s, r) => s + Number(r.receita || 0), 0);
  const totalClicks = rows.reduce((s, r) => s + Number(r.cliques || 0), 0);
  const totalImpressions = rows.reduce((s, r) => s + Number(r.impressoes || 0), 0);
  const totalConversions = rows.reduce((s, r) => s + Number(r.conversoes || 0), 0);

  return {
    periodo: "Últimos 90 dias",
    gasto_total: totalSpend.toFixed(2),
    receita_total: totalRevenue.toFixed(2),
    roas_geral: totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : "N/A",
    cliques_total: totalClicks,
    impressoes_total: totalImpressions,
    conversoes_total: totalConversions,
    ctr_medio: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + "%" : "N/A",
    cpc_medio: totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : "N/A",
  };
}

const SYSTEM_PROMPT = `Você é um analista de dados especialista em e-commerce e marketing digital.
Você tem acesso aos dados reais do negócio (vendas, anúncios, seguidores do Instagram e métricas de marketing).

REGRAS:
- Responda SEMPRE em português brasileiro
- Use markdown para formatar: tabelas, listas, negrito, etc.
- Seja direto e analítico — foque em insights acionáveis
- Quando fizer comparações, mostre variações percentuais
- Se não tiver dados suficientes para responder, diga claramente
- Nunca invente dados — use apenas o que foi fornecido no contexto
- Quando mostrar valores monetários, use o formato R$ X.XXX,XX
- Arredonde percentuais para 1 casa decimal
- Para tabelas grandes, limite a 15 linhas e indique se há mais dados
- Considere que o negócio é de alimentos/suplementos (Comida de Dragão)
- Amostras/brindes são produtos com preço <= R$ 1,00

DADOS DO NEGÓCIO (contexto atualizado):
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Mensagens inválidas" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch data context
    const dataContext = await fetchDataContext(supabase);
    const contextString = JSON.stringify(dataContext, null, 2);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextString },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o administrador." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar sua pergunta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-with-data error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
