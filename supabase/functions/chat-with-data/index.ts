import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Pagination helper ──────────────────────────────────────────────────
async function fetchAll(
  supabase: any,
  table: string,
  select: string,
  dateCol: string,
  minDate: string,
  orderCol: string,
) {
  const PAGE = 1000;
  let all: any[] = [];
  let from = 0;
  while (true) {
    let query = supabase
      .from(table)
      .select(select)
      .order(orderCol, { ascending: false })
      .range(from, from + PAGE - 1);
    if (minDate) {
      query = query.gte(dateCol, minDate);
    }
    const { data } = await query;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// ── Upload metadata ────────────────────────────────────────────────────
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

// ── Fetch all data context ─────────────────────────────────────────────
async function fetchDataContext(supabase: any) {
  // Fetch ALL data — no 90-day filter
  const [salesRaw, adsRaw, followersRaw, marketingRaw, uploadMeta] = await Promise.all([
    fetchAll(
      supabase, "sales_data",
      "data_venda, valor_total, valor_frete, produtos, canal, status, estado, forma_envio, cupom, cliente_email, cpf_cnpj",
      "data_venda", "", "data_venda",
    ),
    fetchAll(
      supabase, "ads_data",
      "data, gasto, impressoes, cliques, conversoes, receita, alcance, cpc, cpm, ctr, roas_resultados, campanha, conjunto, anuncio, objetivo, status_veiculacao",
      "data", "", "data",
    ),
    fetchAll(
      supabase, "followers_data",
      "data, total_seguidores, novos_seguidores, unfollows",
      "data", "", "data",
    ),
    fetchAll(
      supabase, "marketing_data",
      "data, metrica, valor",
      "data", "", "data",
    ),
    fetchUploadMeta(supabase),
  ]);

  const salesContext = aggregateSales(salesRaw);
  const adsContext = aggregateAds(adsRaw);

  return {
    ultimo_upload: uploadMeta,
    vendas: salesContext,
    ads: adsContext,
    seguidores: { dados: followersRaw },
    marketing: { dados: marketingRaw },
  };
}

// ── Sales aggregation ──────────────────────────────────────────────────
function aggregateSales(rows: any[]) {
  if (!rows.length) return { resumo: "Sem dados de vendas.", detalhes: [] };

  const totalRevenue = rows.reduce((s, r) => s + Number(r.valor_total || 0), 0);
  const totalFreight = rows.reduce((s, r) => s + Number(r.valor_frete || 0), 0);
  const orderCount = rows.length;
  const now = Date.now();
  const d30 = now - 30 * 86400000;
  const d90 = now - 90 * 86400000;

  // Daily breakdown (last 30 days)
  const dayMap: Record<string, { revenue: number; orders: number; freight: number }> = {};
  // Weekly breakdown (30-90 days)
  const weekMap: Record<string, { revenue: number; orders: number; freight: number }> = {};
  // Monthly breakdown (all data)
  const monthMap: Record<string, { revenue: number; orders: number; freight: number }> = {};

  for (const r of rows) {
    const d = new Date(r.data_venda);
    const ts = d.getTime();
    const monthKey = d.toISOString().slice(0, 7); // YYYY-MM

    // Always add to monthly
    if (!monthMap[monthKey]) monthMap[monthKey] = { revenue: 0, orders: 0, freight: 0 };
    monthMap[monthKey].revenue += Number(r.valor_total || 0);
    monthMap[monthKey].orders += 1;
    monthMap[monthKey].freight += Number(r.valor_frete || 0);

    if (ts >= d30) {
      const key = d.toISOString().split("T")[0];
      if (!dayMap[key]) dayMap[key] = { revenue: 0, orders: 0, freight: 0 };
      dayMap[key].revenue += Number(r.valor_total || 0);
      dayMap[key].orders += 1;
      dayMap[key].freight += Number(r.valor_frete || 0);
    } else if (ts >= d90) {
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
  const monthlyProductMap: Record<string, Record<string, { qty: number; revenue: number }>> = {};
  let sampleOrders = 0;
  let sampleDog = 0;
  let sampleCat = 0;
  let sampleExotic = 0;
  let sampleMultiple = 0;
  let sampleUnidentified = 0;

  for (const r of rows) {
    try {
      const produtos = typeof r.produtos === "string" ? JSON.parse(r.produtos) : r.produtos;
      if (!Array.isArray(produtos)) continue;

      let hasProduct = false;
      let hasSample = false;
      let hasDog = false;
      let hasCat = false;
      let hasExotic = false;

      const month = new Date(r.data_venda).toISOString().slice(0, 7);

      for (const p of produtos) {
        const name = p.descricaoAjustada || p.descricao || p.nome || p.name || "Desconhecido";
        const qty = Number(p.quantidade || p.qty || 1);
        const price = Number(p.preco || p.price || 0);
        const isSample = price <= 1;

        if (isSample) {
          hasSample = true;
          const desc = (name + " " + (p.descricao || "")).toLowerCase();
          if (desc.includes("gato") || desc.includes("gatos")) hasCat = true;
          else if (desc.includes("cachorro") || desc.includes("caes") || desc.includes("cães")) hasDog = true;
          else hasDog = true;
        } else {
          hasProduct = true;
        }

        if (!productMap[name]) productMap[name] = { qty: 0, revenue: 0 };
        productMap[name].qty += qty;
        productMap[name].revenue += price * qty;

        if (!monthlyProductMap[month]) monthlyProductMap[month] = {};
        if (!monthlyProductMap[month][name]) monthlyProductMap[month][name] = { qty: 0, revenue: 0 };
        monthlyProductMap[month][name].qty += qty;
        monthlyProductMap[month][name].revenue += price * qty;
      }

      if (hasSample && !hasProduct) {
        sampleOrders++;
        if (hasDog && hasCat) sampleBoth++;
        else if (hasCat) sampleCat++;
        else sampleDog++;
      }
    } catch { /* skip */ }
  }

  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 20)
    .map(([name, d]) => ({ nome: name, quantidade: d.qty, receita: d.revenue.toFixed(2) }));

  const topProductsByMonth: Record<string, any[]> = {};
  for (const [month, prods] of Object.entries(monthlyProductMap)) {
    topProductsByMonth[month] = Object.entries(prods)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10)
      .map(([name, d]) => ({ nome: name, quantidade: d.qty, receita: d.revenue.toFixed(2) }));
  }

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

  // ── Customer aggregation ──────────────────────────────────────────────
  const customerMap: Record<string, { orders: number; revenue: number; firstOrder: string; lastOrder: string }> = {};
  for (const r of rows) {
    const key = (r.cpf_cnpj || r.cliente_email || "").toLowerCase().trim();
    if (!key) continue;

    if (!customerMap[key]) {
      customerMap[key] = { orders: 0, revenue: 0, firstOrder: r.data_venda, lastOrder: r.data_venda };
    }
    customerMap[key].orders += 1;
    customerMap[key].revenue += Number(r.valor_total || 0);
    const dv = r.data_venda;
    if (dv < customerMap[key].firstOrder) customerMap[key].firstOrder = dv;
    if (dv > customerMap[key].lastOrder) customerMap[key].lastOrder = dv;
  }

  const topClientes = Object.values(customerMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 30)
    .map((c, i) => ({
      cliente: `Cliente #${i + 1}`,
      total_pedidos: c.orders,
      receita_total: c.revenue.toFixed(2),
      ticket_medio: (c.revenue / c.orders).toFixed(2),
      primeiro_pedido: c.firstOrder?.split("T")[0] || "",
      ultimo_pedido: c.lastOrder?.split("T")[0] || "",
    }));

  const allCustomers = Object.values(customerMap);
  const totalClientes = allCustomers.length;
  const clientesNovos = allCustomers.filter(c => c.orders === 1).length;
  const clientesRecorrentes = allCustomers.filter(c => c.orders >= 2).length;
  const clientesFieis = allCustomers.filter(c => c.orders >= 3 && c.orders <= 4).length;
  const clientesVIP = allCustomers.filter(c => c.orders >= 5 || c.revenue >= 500).length;
  const taxaRecompra = totalClientes > 0 ? ((clientesRecorrentes / totalClientes) * 100).toFixed(1) : "0";

  // Dates for first/last purchase range
  const dates = rows.map(r => r.data_venda).filter(Boolean).sort();
  const periodo_dados = dates.length > 0
    ? `${dates[0]?.split("T")[0]} a ${dates[dates.length - 1]?.split("T")[0]}`
    : "Sem dados";

  return {
    periodo: `Todos os dados disponíveis (${periodo_dados})`,
    total_registros: orderCount,
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
    por_mes: Object.entries(monthMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([m, d]) => ({ mes: m, pedidos: d.orders, receita: d.revenue.toFixed(2), frete: d.freight.toFixed(2), ticket_medio: (d.revenue / d.orders).toFixed(2) })),
    top_produtos: topProducts,
    top_produtos_por_mes: topProductsByMonth,
    amostras: {
      total_pedidos_somente_amostra: sampleOrders,
      cachorro: sampleDog,
      gato: sampleCat,
      cachorro_e_gato: sampleBoth,
    },
    por_canal: channelMap,
    por_status: statusMap,
    top_clientes: topClientes,
    clientes_resumo: {
      total_clientes_unicos: totalClientes,
      clientes_novos_1_pedido: clientesNovos,
      clientes_recorrentes_2_mais: clientesRecorrentes,
      clientes_fieis_3_4: clientesFieis,
      clientes_vip_5_mais_ou_500: clientesVIP,
      taxa_recompra_pct: taxaRecompra,
    },
  };
}

// ── Ads aggregation ────────────────────────────────────────────────────
function aggregateAds(rows: any[]) {
  if (!rows.length) return { resumo: "Sem dados de ads." };

  const totalSpend = rows.reduce((s, r) => s + Number(r.gasto || 0), 0);
  const totalRevenue = rows.reduce((s, r) => s + Number(r.receita || 0), 0);
  const totalClicks = rows.reduce((s, r) => s + Number(r.cliques || 0), 0);
  const totalImpressions = rows.reduce((s, r) => s + Number(r.impressoes || 0), 0);
  const totalConversions = rows.reduce((s, r) => s + Number(r.conversoes || 0), 0);

  // Daily breakdown (last 30 days)
  const now = Date.now();
  const d30 = now - 30 * 86400000;
  const dayMap: Record<string, { gasto: number; receita: number; cliques: number; impressoes: number }> = {};
  for (const r of rows) {
    const d = new Date(r.data);
    if (d.getTime() >= d30) {
      const key = r.data;
      if (!dayMap[key]) dayMap[key] = { gasto: 0, receita: 0, cliques: 0, impressoes: 0 };
      dayMap[key].gasto += Number(r.gasto || 0);
      dayMap[key].receita += Number(r.receita || 0);
      dayMap[key].cliques += Number(r.cliques || 0);
      dayMap[key].impressoes += Number(r.impressoes || 0);
    }
  }

  // Per-ad breakdown (all time) with status tracking
  const adMap: Record<string, { gasto: number; receita: number; cliques: number; impressoes: number; conversoes: number; status: string; lastDate: string }> = {};
  for (const r of rows) {
    const adName = r.anuncio || r.campanha || "Sem nome";
    if (!adMap[adName]) adMap[adName] = { gasto: 0, receita: 0, cliques: 0, impressoes: 0, conversoes: 0, status: "", lastDate: "" };
    adMap[adName].gasto += Number(r.gasto || 0);
    adMap[adName].receita += Number(r.receita || 0);
    adMap[adName].cliques += Number(r.cliques || 0);
    adMap[adName].impressoes += Number(r.impressoes || 0);
    adMap[adName].conversoes += Number(r.conversoes || 0);
    // Track most recent status
    if (r.data && r.data > adMap[adName].lastDate) {
      adMap[adName].lastDate = r.data;
      adMap[adName].status = r.status_veiculacao || "";
    }
  }

  const formatAd = (name: string, d: typeof adMap[string]) => ({
    anuncio: name,
    gasto: d.gasto.toFixed(2),
    receita: d.receita.toFixed(2),
    roas: d.gasto > 0 ? (d.receita / d.gasto).toFixed(2) : "0",
    ctr: d.impressoes > 0 ? ((d.cliques / d.impressoes) * 100).toFixed(2) + "%" : "0%",
    cliques: d.cliques,
    impressoes: d.impressoes,
    conversoes: d.conversoes,
    status: d.status || "desconhecido",
  });

  // Separate active vs inactive ads
  const activeEntries = Object.entries(adMap).filter(([, d]) => d.status === "active");
  const inactiveEntries = Object.entries(adMap).filter(([, d]) => d.status !== "active");

  const topAnunciosAtivos = activeEntries
    .sort((a, b) => b[1].receita - a[1].receita)
    .slice(0, 30)
    .map(([name, d]) => formatAd(name, d));

  const topAnunciosInativos = inactiveEntries
    .sort((a, b) => b[1].receita - a[1].receita)
    .slice(0, 15)
    .map(([name, d]) => formatAd(name, d));

  // Top 10 active ads from last 60 days (candidates to scale)
  const d60 = now - 60 * 86400000;
  const recentActiveMap: Record<string, { gasto: number; receita: number; cliques: number; impressoes: number; conversoes: number }> = {};
  for (const r of rows) {
    const ts = new Date(r.data).getTime();
    if (ts < d60) continue;
    if ((r.status_veiculacao || "") !== "active") continue;
    const adName = r.anuncio || r.campanha || "Sem nome";
    if (!recentActiveMap[adName]) recentActiveMap[adName] = { gasto: 0, receita: 0, cliques: 0, impressoes: 0, conversoes: 0 };
    recentActiveMap[adName].gasto += Number(r.gasto || 0);
    recentActiveMap[adName].receita += Number(r.receita || 0);
    recentActiveMap[adName].cliques += Number(r.cliques || 0);
    recentActiveMap[adName].impressoes += Number(r.impressoes || 0);
    recentActiveMap[adName].conversoes += Number(r.conversoes || 0);
  }

  const candidatosEscalar2m = Object.entries(recentActiveMap)
    .sort((a, b) => b[1].receita - a[1].receita)
    .slice(0, 10)
    .map(([name, d]) => ({
      anuncio: name,
      gasto: d.gasto.toFixed(2),
      receita: d.receita.toFixed(2),
      roas: d.gasto > 0 ? (d.receita / d.gasto).toFixed(2) : "0",
      ctr: d.impressoes > 0 ? ((d.cliques / d.impressoes) * 100).toFixed(2) + "%" : "0%",
      cliques: d.cliques,
      conversoes: d.conversoes,
    }));

  // Keep legacy topAds for backward compat
  const topAds = Object.entries(adMap)
    .sort((a, b) => b[1].receita - a[1].receita)
    .slice(0, 30)
    .map(([name, d]) => formatAd(name, d));

  // ── Monthly ads breakdown (top 15 per month) ─────────────────────────
  const monthAdMap: Record<string, Record<string, { gasto: number; receita: number; cliques: number; impressoes: number; conversoes: number }>> = {};
  for (const r of rows) {
    const monthKey = r.data?.slice(0, 7) || "unknown"; // YYYY-MM
    const adName = r.anuncio || r.campanha || "Sem nome";
    if (!monthAdMap[monthKey]) monthAdMap[monthKey] = {};
    if (!monthAdMap[monthKey][adName]) monthAdMap[monthKey][adName] = { gasto: 0, receita: 0, cliques: 0, impressoes: 0, conversoes: 0 };
    monthAdMap[monthKey][adName].gasto += Number(r.gasto || 0);
    monthAdMap[monthKey][adName].receita += Number(r.receita || 0);
    monthAdMap[monthKey][adName].cliques += Number(r.cliques || 0);
    monthAdMap[monthKey][adName].impressoes += Number(r.impressoes || 0);
    monthAdMap[monthKey][adName].conversoes += Number(r.conversoes || 0);
  }

  const topAnunciosPorMes: Record<string, any[]> = {};
  for (const [month, ads] of Object.entries(monthAdMap)) {
    topAnunciosPorMes[month] = Object.entries(ads)
      .sort((a, b) => b[1].receita - a[1].receita)
      .slice(0, 15)
      .map(([name, d]) => ({
        anuncio: name,
        gasto: d.gasto.toFixed(2),
        receita: d.receita.toFixed(2),
        roas: d.gasto > 0 ? (d.receita / d.gasto).toFixed(2) : "0",
        cliques: d.cliques,
        conversoes: d.conversoes,
      }));
  }

  // Per-objective breakdown
  const objectiveMap: Record<string, { gasto: number; receita: number; cliques: number; impressoes: number; conversoes: number }> = {};
  for (const r of rows) {
    const obj = r.objetivo || "Desconhecido";
    if (!objectiveMap[obj]) objectiveMap[obj] = { gasto: 0, receita: 0, cliques: 0, impressoes: 0, conversoes: 0 };
    objectiveMap[obj].gasto += Number(r.gasto || 0);
    objectiveMap[obj].receita += Number(r.receita || 0);
    objectiveMap[obj].cliques += Number(r.cliques || 0);
    objectiveMap[obj].impressoes += Number(r.impressoes || 0);
    objectiveMap[obj].conversoes += Number(r.conversoes || 0);
  }

  // Monthly totals for ads
  const monthTotalMap: Record<string, { gasto: number; receita: number; cliques: number; impressoes: number; conversoes: number }> = {};
  for (const r of rows) {
    const monthKey = r.data?.slice(0, 7) || "unknown";
    if (!monthTotalMap[monthKey]) monthTotalMap[monthKey] = { gasto: 0, receita: 0, cliques: 0, impressoes: 0, conversoes: 0 };
    monthTotalMap[monthKey].gasto += Number(r.gasto || 0);
    monthTotalMap[monthKey].receita += Number(r.receita || 0);
    monthTotalMap[monthKey].cliques += Number(r.cliques || 0);
    monthTotalMap[monthKey].impressoes += Number(r.impressoes || 0);
    monthTotalMap[monthKey].conversoes += Number(r.conversoes || 0);
  }

  const adsPorMes = Object.entries(monthTotalMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([m, d]) => ({
      mes: m,
      gasto: d.gasto.toFixed(2),
      receita: d.receita.toFixed(2),
      roas: d.gasto > 0 ? (d.receita / d.gasto).toFixed(2) : "0",
      cliques: d.cliques,
      impressoes: d.impressoes,
      conversoes: d.conversoes,
    }));

  const dates = rows.map(r => r.data).filter(Boolean).sort();
  const periodo_dados = dates.length > 0
    ? `${dates[0]} a ${dates[dates.length - 1]}`
    : "Sem dados";

  return {
    periodo: `Todos os dados disponíveis (${periodo_dados})`,
    total_registros: rows.length,
    gasto_total: totalSpend.toFixed(2),
    receita_total: totalRevenue.toFixed(2),
    roas_geral: totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : "N/A",
    cliques_total: totalClicks,
    impressoes_total: totalImpressions,
    conversoes_total: totalConversions,
    ctr_medio: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + "%" : "N/A",
    cpc_medio: totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : "N/A",
    por_dia_30d: Object.entries(dayMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([d, v]) => ({ dia: d, gasto: v.gasto.toFixed(2), receita: v.receita.toFixed(2), cliques: v.cliques, impressoes: v.impressoes })),
    por_mes: adsPorMes,
    top_anuncios: topAds,
    top_anuncios_ativos: topAnunciosAtivos,
    top_anuncios_inativos: topAnunciosInativos,
    candidatos_escalar_2m: candidatosEscalar2m,
    top_anuncios_por_mes: topAnunciosPorMes,
    por_objetivo: objectiveMap,
  };
}

// ── System prompt ──────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é um analista de dados especialista em e-commerce e marketing digital.
Você tem acesso aos dados reais do negócio (vendas, anúncios, seguidores do Instagram e métricas de marketing).

REGRAS OBRIGATÓRIAS:
- Responda SEMPRE em português brasileiro
- SEMPRE comece sua resposta informando o período coberto pelos dados e a data do último upload. Exemplo: "📊 Dados atualizados até DD/MM/AAAA (último upload em DD/MM às HH:MM)."
- NUNCA mostre JSON cru — formate SEMPRE em tabelas markdown, listas ou texto corrido
- Use markdown para formatar: tabelas, listas, negrito, etc.
- Seja direto e analítico — foque em insights acionáveis
- Quando fizer comparações, mostre variações percentuais
- Se não tiver dados suficientes para responder, diga claramente
- Nunca invente dados — use apenas o que foi fornecido no contexto
- Quando mostrar valores monetários, use o formato R$ X.XXX,XX
- Arredonde percentuais para 1 casa decimal
- Para tabelas grandes, limite a 15 linhas e indique se há mais dados
- Considere que o negócio é de alimentos/suplementos para pets (Comida de Dragão)

FORMATO DE RESPOSTA (OBRIGATÓRIO):
- Prefira bullet points curtos em vez de parágrafos longos
- Use tabelas APENAS para comparações diretas (máximo 7 linhas). Para listas maiores, use bullets
- Separe seções com títulos em **negrito**
- Para cada insight, use o formato: dado → interpretação (1 linha)
- Use ✅ ⚠️ 🔴 para sinalizar status (bom / atenção / crítico)
- Seja conciso: máximo 3-4 bullets por seção
- Evite textos explicativos longos — foque em números + insight curto
- Exemplo: "**Receita:** R$ 5.908 → ✅ 12% acima da média"
- Amostras/brindes são produtos com preço <= R$ 1,00

CAMPOS DE DADOS DISPONÍVEIS:

VENDAS:
- "por_dia": breakdown diário dos últimos 30 dias. Use para perguntas sobre dias recentes.
- "por_semana": breakdown semanal de 30-90 dias atrás. Use para tendências de médio prazo.
- "por_mes": breakdown MENSAL de TODOS os dados históricos (receita, pedidos, frete, ticket_medio por mês). Use para consultas sobre meses específicos (ex: "ticket médio de agosto", "receita de dezembro").
- "top_produtos": top 20 produtos por receita (período completo)
- "top_produtos_por_mes": top 10 produtos por mês. Use para "quais produtos mais vendidos em [mês]?"
- "amostras": breakdown de pedidos somente-amostra por tipo de pet (cachorro, gato, ambos)

CLIENTES:
- "top_clientes": top 30 clientes por receita (anonimizados — sem nome ou email por privacidade). Cada entrada tem: cliente (ex: "Cliente #1"), total_pedidos, receita_total, ticket_medio, primeiro_pedido, ultimo_pedido. Use para análise de concentração de receita e comportamento de compra.
- "clientes_resumo": métricas gerais da base de clientes:
  - total_clientes_unicos: total de clientes identificados
  - clientes_novos_1_pedido: fizeram apenas 1 pedido
  - clientes_recorrentes_2_mais: fizeram 2+ pedidos
  - clientes_fieis_3_4: fizeram 3-4 pedidos
  - clientes_vip_5_mais_ou_500: fizeram 5+ pedidos OU receita >= R$ 500
  - taxa_recompra_pct: % de clientes que compraram mais de uma vez

SEGMENTAÇÃO DE CLIENTES:
- Primeira Compra: 1 pedido
- Recorrente: 2 pedidos
- Fiel: 3-4 pedidos
- VIP: 5+ pedidos ou receita >= R$ 500

ADS:
- "por_dia_30d": breakdown diário de ads dos últimos 30 dias
- "por_mes": breakdown MENSAL de ads (gasto, receita, ROAS, cliques, impressões, conversões por mês). Use para "quanto gastamos em ads em [mês]?"
- "top_anuncios_ativos": anúncios ATIVOS com CTR e ROAS calculados. Use para recomendar pausar (ROAS baixo) ou manter. Cada anúncio tem campo "ctr" e "status".
- "candidatos_escalar_2m": top 10 anúncios ATIVOS dos últimos 2 meses por receita. Use SEMPRE para recomendar quais escalar.
- "top_anuncios_inativos": referência de anúncios já pausados/arquivados. NÃO recomende pausar estes — já estão inativos.
- "top_anuncios": top 30 anúncios por receita (período completo, inclui ativos e inativos)
- "top_anuncios_por_mes": top 15 anúncios por receita em cada mês (chave YYYY-MM). Use para "melhores anúncios de janeiro", "qual anúncio performou mais em [mês]?"
- "por_objetivo": performance agrupada por objetivo de campanha
- IMPORTANTE: só recomende PAUSAR anúncios que estão ATIVOS (campo status = "active"). Anúncios inativos já estão pausados.
- O campo "ctr" está calculado por anúncio — use para classificação nos quadrantes (Conversor, Isca, Silencioso, Ineficiente).

OUTROS:
- "ultimo_upload": data do último upload de cada tipo de dado — use para informar o usuário
- "total_registros": quantos registros foram processados

═══════════════════════════════════════════
MANUAL DO NEGÓCIO — Comida de Dragão
═══════════════════════════════════════════

1. SOBRE O NEGÓCIO
- Comida de Dragão: marca de alimentos e suplementos naturais para pets (cães e gatos)
- Canal: venda online (B2C) via e-commerce
- Modelo: venda direta + estratégia de amostras para aquisição de clientes

2. CATÁLOGO DE PRODUTOS (12 produtos padronizados)
- Comida de Dragão - Original (90g)
- Kit Comida de Dragão - Original (3x90g)
- Mordida de Dragão - Spirulina (180g)
- Kit Mordida de Dragão - Spirulina (3x180g)
- Mordida de Dragão - Legumes (180g)
- Kit Mordida de Dragão - Legumes (3x180g)
- Kit Mordida de Dragão Mix (2 produtos) — contém 1 Spirulina + 1 Legumes
- Kit Completo (3 produtos) — contém 1 Original + 1 Spirulina + 1 Legumes
- Suplemento Concentrado para Cães (200g)
- Suplemento Integral para Cães (180g)
- Suplemento para Gatos (180g)
- Kit de Amostras (preço <= R$ 1,00)
IMPORTANTE: NÃO existe "Mordida Original". A linha Mordida tem apenas Spirulina e Legumes.

3. REGRAS DE AMOSTRAS
- Produto é amostra se: nome contém "amostra" OU preço entre R$ 0,01 e R$ 1,00
- Pedido "somente amostra" = todos os produtos do pedido são amostras
- Pedido "com produto" = tem pelo menos um produto regular (preço > R$ 1,00)
- Tipo de pet: descrição contém "gato"/"gatos" → gato; senão → cachorro
- Pedido com amostras de ambos tipos → "cachorro + gato"
- Conversão de amostra: cliente cujo 1º pedido foi somente amostra e depois fez pedido com produto regular
- Janela de conversão ideal: até 45 dias após amostra

4. MÉTRICAS FINANCEIRAS
- Faturamento Total = soma de valor_total (inclui frete)
- Receita Líquida = Faturamento Total − Frete Total
- Ticket Médio = Faturamento Total / Total de Pedidos
- Ticket Médio Real = exclui pedidos 100% amostra do cálculo
- ROAS Real = Receita Líquida (ex-frete) / Investimento em Ads
- ROAS Meta = Valor de conversão reportado pelo Meta / Investimento
- ROAS Bruto = Faturamento Total / Investimento
- ROI = ((Receita − Investimento) / Investimento) × 100
- CAC = Investimento em Ads / Novos Clientes
- LTV = Receita Total / Total de Clientes
- LTV/CAC >= 3x é saudável

5. BENCHMARKS DE ADS
- ROAS >= 4x = Excelente | 3-4x = Bom | < 3x = Atenção
- CTR é métrica DIAGNÓSTICA (não decisional) — nunca usar sozinha como indicador de sucesso
- ROAS é a métrica DECISIONAL primária para ads de vendas
- Para objetivos não-vendas (Engagement, Traffic): eficiência = CPC/CPR abaixo da mediana

6. CLASSIFICAÇÃO DE CLIENTES (por recência de compra)
- Ativo: última compra < 30 dias
- Em risco: última compra 31-60 dias
- Inativo: última compra 61-90 dias
- Churn: última compra > 90 dias
- Taxa retenção >= 70% é bom | Taxa recompra >= 30% é bom

7. QUADRANTES DE CLASSIFICAÇÃO DE ANÚNCIOS
- Conversor: CTR alto + ROAS alto → melhor anúncio, escalar investimento
- Isca de Atenção: CTR alto + ROAS baixo → atrai cliques mas não converte, investigar oferta/landing page
- Conversor Silencioso: CTR baixo + ROAS alto → converte bem mas pouca atração, melhorar criativo
- Ineficiente: CTR baixo + ROAS baixo → pausar ou refazer completamente

8. LOGÍSTICA
- Tempo médio emissão NF: <= 2 dias = bom | 3-5 dias = aceitável | > 5 dias = atenção

═══════════════════════════════════════════

DADOS DO NEGÓCIO (contexto atualizado):
`;

// ── Main handler ───────────────────────────────────────────────────────
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
