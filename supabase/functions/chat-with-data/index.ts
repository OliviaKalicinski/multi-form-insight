import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SALES_LIMIT = 1000;
const ADS_LIMIT = 300;
const FOLLOWERS_LIMIT = 100;
const MARKETING_LIMIT = 300;

async function fetchUploadMeta(supabase: any) {
  const { data } = await supabase
    .from("upload_history")
    .select("data_type, created_at, date_range_end")
    .order("created_at", { ascending: false });

  const meta: Record<string, { ultimo_upload: string; dados_ate: string | null }> = {};
  for (const row of data || []) {
    if (!meta[row.data_type]) {
      meta[row.data_type] = {
        ultimo_upload: row.created_at,
        dados_ate: row.date_range_end,
      };
    }
  }
  return meta;
}

async function fetchDataContext(supabase: any) {
  const now = Date.now();
  const d90 = new Date(now - 90 * 86400000).toISOString();
  const d90Date = d90.split("T")[0];

  const [salesRes, adsRes, followersRes, marketingRes, uploadMeta] = await Promise.all([
    supabase
      .from("sales_data")
      .select("data_venda, valor_total, valor_frete, produtos, canal, status, estado, forma_envio, cupom")
      .gte("data_venda", d90)
      .order("data_venda", { ascending: false })
      .limit(SALES_LIMIT),
    supabase
      .from("ads_data")
      .select("data, gasto, impressoes, cliques, conversoes, receita, alcance, cpc, cpm, ctr, roas_resultados, campanha, objetivo")
      .gte("data", d90Date)
      .order("data", { ascending: false })
      .limit(ADS_LIMIT),
    supabase
      .from("followers_data")
      .select("data, total_seguidores, novos_seguidores, unfollows")
      .gte("data", d90Date)
      .order("data", { ascending: false })
      .limit(FOLLOWERS_LIMIT),
    supabase
      .from("marketing_data")
      .select("data, metrica, valor")
      .gte("data", d90Date)
      .order("data", { ascending: false })
      .limit(MARKETING_LIMIT),
    fetchUploadMeta(supabase),
  ]);

  const salesRaw = salesRes.data || [];
  const adsRaw = adsRes.data || [];
  const followersRaw = followersRes.data || [];
  const marketingRaw = marketingRes.data || [];

  const salesContext = aggregateSales(salesRaw);
  const adsContext = aggregateAds(adsRaw);

  return {
    ultimo_upload: uploadMeta,
    vendas: {
      ...salesContext,
      dados_truncados: salesRaw.length >= SALES_LIMIT,
    },
    ads: {
      ...adsContext,
      dados_truncados: adsRaw.length >= ADS_LIMIT,
    },
    seguidores: {
      dados: followersRaw,
      dados_truncados: followersRaw.length >= FOLLOWERS_LIMIT,
    },
    marketing: {
      dados: marketingRaw,
      dados_truncados: marketingRaw.length >= MARKETING_LIMIT,
    },
  };
}

function aggregateSales(rows: any[]) {
  if (!rows.length) return { resumo: "Sem dados de vendas nos últimos 90 dias.", detalhes: [] };

  const totalRevenue = rows.reduce((s, r) => s + Number(r.valor_total || 0), 0);
  const totalFreight = rows.reduce((s, r) => s + Number(r.valor_frete || 0), 0);
  const orderCount = rows.length;
  const now = Date.now();
  const d30 = now - 30 * 86400000;

  // Daily breakdown (last 30 days)
  const dayMap: Record<string, { revenue: number; orders: number; freight: number }> = {};
  // Weekly breakdown (30-90 days)
  const weekMap: Record<string, { revenue: number; orders: number; freight: number }> = {};

  for (const r of rows) {
    const d = new Date(r.data_venda);
    const ts = d.getTime();
    if (ts >= d30) {
      const key = d.toISOString().split("T")[0];
      if (!dayMap[key]) dayMap[key] = { revenue: 0, orders: 0, freight: 0 };
      dayMap[key].revenue += Number(r.valor_total || 0);
      dayMap[key].orders += 1;
      dayMap[key].freight += Number(r.valor_frete || 0);
    } else {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split("T")[0];
      if (!weekMap[key]) weekMap[key] = { revenue: 0, orders: 0, freight: 0 };
      weekMap[key].revenue += Number(r.valor_total || 0);
      weekMap[key].orders += 1;
      weekMap[key].freight += Number(r.valor_frete || 0);
    }
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
    por_dia: Object.entries(dayMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([d, v]) => ({ dia: d, pedidos: v.orders, receita: v.revenue.toFixed(2), frete: v.freight.toFixed(2) })),
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

  // Daily breakdown (last 14 days)
  const now = Date.now();
  const d14 = now - 14 * 86400000;
  const dayMap: Record<string, { gasto: number; receita: number; cliques: number; impressoes: number }> = {};
  for (const r of rows) {
    const d = new Date(r.data);
    if (d.getTime() >= d14) {
      const key = r.data;
      if (!dayMap[key]) dayMap[key] = { gasto: 0, receita: 0, cliques: 0, impressoes: 0 };
      dayMap[key].gasto += Number(r.gasto || 0);
      dayMap[key].receita += Number(r.receita || 0);
      dayMap[key].cliques += Number(r.cliques || 0);
      dayMap[key].impressoes += Number(r.impressoes || 0);
    }
  }

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
    por_dia_14d: Object.entries(dayMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([d, v]) => ({ dia: d, gasto: v.gasto.toFixed(2), receita: v.receita.toFixed(2), cliques: v.cliques, impressoes: v.impressoes })),
  };
}

const SYSTEM_PROMPT = `Você é um analista de dados especialista em e-commerce e marketing digital.
Você tem acesso aos dados reais do negócio (vendas, anúncios, seguidores do Instagram e métricas de marketing).

REGRAS OBRIGATÓRIAS:
- Responda SEMPRE em português brasileiro
- SEMPRE comece sua resposta informando o período coberto pelos dados e a data do último upload. Exemplo: "📊 Dados atualizados até DD/MM/AAAA (último upload em DD/MM às HH:MM)."
- Se o campo "dados_truncados" for true para algum tipo de dado, AVISE CLARAMENTE: "⚠️ Atenção: o volume de dados de [tipo] excede o limite que consigo processar. A análise abaixo cobre apenas parte do período."
- NUNCA mostre JSON cru — formate SEMPRE em tabelas markdown, listas ou texto corrido
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
- Use o campo "por_dia" para responder perguntas sobre períodos curtos (até 30 dias)
- Use o campo "por_semana" para tendências de médio prazo (30-90 dias)
- O campo "ultimo_upload" contém a data do último upload de cada tipo de dado — use-o para informar o usuário

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
