import { ExecutiveMetrics } from "@/types/executive";
import { AdsData, ProcessedOrder } from "@/types/marketing";
import { calculateSalesMetrics, calculateAverageTicket, calculateRepurchaseRate } from "./salesCalculator";
import { calculateAdsMetrics } from "./adsCalculator";
import { analyzeChurn } from "./customerBehaviorMetrics";
import { differenceInDays, parse, min, max } from "date-fns";
import { getOfficialRevenue, getRevenueOrders } from "./revenue";
import { 
  createDefaultMeta, 
  createDefaultSource, 
  createDefaultAuthority, 
  createTemporalMetadata,
  createEmptyTemporalMetadata,
  ExecutiveMetricsMeta, 
  ExecutiveMetricsSource, 
  ExecutiveMetricsAuthority,
  ExecutiveMetricsTemporal 
} from "@/types/metricNature";

/**
 * Calcula metadados temporais a partir dos dados
 */
const calculateTemporalMetadataFromData = (
  orders: ProcessedOrder[],
  adsData: AdsData[]
): ExecutiveMetricsTemporal => {
  // Vendas - extrair datas dos pedidos
  const vendasDates = orders.map(o => o.dataVenda).filter(d => d instanceof Date && !isNaN(d.getTime()));
  const vendasFirst = vendasDates.length > 0 ? min(vendasDates) : null;
  const vendasLast = vendasDates.length > 0 ? max(vendasDates) : null;
  const vendasWindowDays = vendasFirst && vendasLast 
    ? differenceInDays(vendasLast, vendasFirst) + 1 
    : 0;
  
  // Marketing - extrair datas dos ads
  const adsDates = adsData
    .map(a => {
      try {
        const dateStr = a["Início dos relatórios"];
        if (!dateStr) return null;
        return parse(dateStr.substring(0, 10), 'yyyy-MM-dd', new Date());
      } catch {
        return null;
      }
    })
    .filter((d): d is Date => d !== null && !isNaN(d.getTime()));
  
  const adsFirst = adsDates.length > 0 ? min(adsDates) : null;
  const adsLast = adsDates.length > 0 ? max(adsDates) : null;
  const adsWindowDays = adsFirst && adsLast 
    ? differenceInDays(adsLast, adsFirst) + 1 
    : 0;
  
  // Clientes, Produtos, Operações - derivados de vendas
  const vendasTemporal = createTemporalMetadata(orders.length, vendasWindowDays, vendasFirst, vendasLast);
  const marketingTemporal = createTemporalMetadata(adsData.length, adsWindowDays, adsFirst, adsLast);
  
  return {
    vendas: vendasTemporal,
    marketing: marketingTemporal,
    clientes: vendasTemporal, // Derivado de vendas
    produtos: vendasTemporal, // Derivado de vendas
    operacoes: vendasTemporal, // Derivado de vendas (NF)
  };
};

/**
 * Calcula ExecutiveMetrics a partir dos dados reais do dashboard
 */
export const calculateExecutiveMetrics = (
  orders: ProcessedOrder[],
  adsData: AdsData[],
  month: string
): ExecutiveMetrics | null => {
  if (orders.length === 0 && adsData.length === 0) {
    return null;
  }

  // Inicializar metadados de natureza, origem, autoridade e temporal
  const _source = createDefaultSource();
  const _meta = createDefaultMeta();
  const _authority = createDefaultAuthority();
  const _temporal = calculateTemporalMetadataFromData(orders, adsData);

  // Calcular métricas de vendas
  const salesMetrics = orders.length > 0 ? calculateSalesMetrics(orders) : null;
  
  // Calcular métricas de ads
  const adsMetrics = adsData.length > 0 ? calculateAdsMetrics(adsData) : null;
  
  // Análise de churn
  const churnAnalysis = orders.length > 0 ? analyzeChurn(orders) : null;

  // Filtro fiscal: somente vendas (exclui brindes/bonificações/devoluções)
  const revenueOrders = getRevenueOrders(orders);

  // ===== VENDAS =====
  const receita = salesMetrics?.faturamentoTotal || 0;
  const pedidos = salesMetrics?.totalPedidos || 0;
  const ticketMedio = calculateAverageTicket(orders);
  
  // Ticket médio real - exclui pedidos de SOMENTE amostra E não-vendas
  const pedidosReais = revenueOrders.filter(order => {
    return order.produtos.some(p => p.descricaoAjustada !== 'Kit de Amostras');
  });
  const receitaReal = pedidosReais.reduce((sum, o) => sum + getOfficialRevenue(o), 0);
  const ticketMedioReal = pedidosReais.length > 0 
    ? receitaReal / pedidosReais.length 
    : ticketMedio;

  // Taxa de conversão (compras / cliques)
  const compras = adsMetrics?.comprasTotal || pedidos;
  const cliques = adsMetrics?.cliquesTotal || 1;
  const conversao = (compras / cliques) * 100;

  // ===== MARKETING =====
  const investimentoAds = adsMetrics?.investimentoTotal || 0;
  const receitaAds = adsMetrics?.valorConversaoTotal || receita;
  
  // Calcular faturamento fiscal e frete (somente vendas)
  const faturamentoTotal = revenueOrders.reduce((sum, o) => sum + getOfficialRevenue(o), 0);
  const freteTotal = revenueOrders.reduce((sum, o) => sum + (o.valorFrete || 0), 0);
  const percentualFrete = faturamentoTotal > 0 ? freteTotal / faturamentoTotal : 0;
  
  // === 3 ROAS ===
  
  // 1. ROAS Bruto: Receita Total (com frete) / Investimento
  const roasBruto = investimentoAds > 0 ? faturamentoTotal / investimentoAds : 0;
  
  // 2. ROAS Real: Receita ex-frete / Investimento
  const faturamentoExFrete = faturamentoTotal - freteTotal;
  const roasReal = investimentoAds > 0 ? faturamentoExFrete / investimentoAds : 0;
  
  // 3. ROAS Meta: Valor de conversão reportado pelo Meta Ads / Investimento
  // O valor do Meta já é ex-frete (capturado pelo pixel no carrinho)
  const valorConversaoMeta = adsMetrics?.valorConversaoTotal || 0;
  const roasMeta = investimentoAds > 0 ? valorConversaoMeta / investimentoAds : 0;
  
  // roasAds mantém por retrocompatibilidade (usa roasMeta)
  const roasAds = roasMeta;
  
  const impressoes = adsMetrics?.impressoesTotal || 0;
  const cliquesTotal = adsMetrics?.cliquesTotal || 0;
  const ctr = adsMetrics?.ctrMedio || 0;
  const cpc = adsMetrics?.cpcMedio || 0;
  const cpa = compras > 0 ? investimentoAds / compras : 0;

  // ===== CLIENTES =====
  // Contagem comportamental: todos os pedidos (brindes mantêm cliente na base)
  const clientesUnicos = new Map<string, { pedidos: number; valorTotal: number }>();
  orders.forEach(order => {
    const existing = clientesUnicos.get(order.cpfCnpj);
    if (existing) {
      existing.pedidos += 1;
    } else {
      clientesUnicos.set(order.cpfCnpj, { pedidos: 1, valorTotal: 0 });
    }
  });

  // Receita fiscal: apenas vendas (para LTV correto)
  revenueOrders.forEach(order => {
    const existing = clientesUnicos.get(order.cpfCnpj);
    if (existing) {
      existing.valorTotal += getOfficialRevenue(order);
    }
  });

  const totalClientes = clientesUnicos.size;

  // Build first-purchase map from all orders
  const primeiraCompraPorCliente = new Map<string, Date>();
  orders.forEach(o => {
    const cpf = o.cpfCnpj;
    const data = new Date(o.dataVenda);
    if (isNaN(data.getTime())) return;
    if (!primeiraCompraPorCliente.has(cpf) || data < primeiraCompraPorCliente.get(cpf)!) {
      primeiraCompraPorCliente.set(cpf, data);
    }
  });

  // New customers = first purchase in selected period
  let novosClientes = 0;
  primeiraCompraPorCliente.forEach((data) => {
    if (!month || month === "all") {
      novosClientes++;
      return;
    }
    const m = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    if (m === month) novosClientes++;
  });

  // Recurrence: definição comercial (apenas pedidos de receita)
  const taxaRecompra = calculateRepurchaseRate(orders);

  const clientesAtivos = churnAnalysis?.clientesAtivos || totalClientes;
  const taxaChurn = churnAnalysis?.taxaChurn || 0;

  const ltv = totalClientes > 0 ? receita / totalClientes : 0;
  const cac = novosClientes > 0 ? investimentoAds / novosClientes : 0;

  // ===== PRODUTOS =====
  // Agrupar produtos por nome ajustado (somente vendas - receita fiscal)
  const produtosMap = new Map<string, { quantidade: number; receita: number }>();
  revenueOrders.forEach(order => {
    order.produtos.forEach(produto => {
      const existing = produtosMap.get(produto.descricaoAjustada);
      if (existing) {
        existing.quantidade += produto.quantidade;
        existing.receita += produto.preco;
      } else {
        produtosMap.set(produto.descricaoAjustada, {
          quantidade: produto.quantidade,
          receita: produto.preco
        });
      }
    });
  });

  // Remover Kit de Amostras da análise de top produtos
  produtosMap.delete('Kit de Amostras');

  // Encontrar top produto por receita
  let topProduto = "N/A";
  let receitaTopProduto = 0;
  produtosMap.forEach((data, nome) => {
    if (data.receita > receitaTopProduto) {
      topProduto = nome;
      receitaTopProduto = data.receita;
    }
  });

  const produtosVendidos = Array.from(produtosMap.values()).reduce((sum, p) => sum + p.quantidade, 0);
  const skuUnicos = produtosMap.size;
  
  // ═══════════════════════════════════════════════════════════════
  // ESTIMATIVA: Margem média (não há dados reais no CSV)
  // ═══════════════════════════════════════════════════════════════
  const margemMedia = 18;
  _meta.margemMedia = 'ESTIMATED';

  // ===== OPERAÇÕES =====
  // Tempo médio de emissão de NF (DADO REAL - calculado do CSV)
  const pedidosComNF = orders.filter(o => o.numeroNF && o.dataEmissao);
  const tempoEmissaoNF = pedidosComNF.length > 0
    ? pedidosComNF.reduce((sum, o) => sum + differenceInDays(o.dataEmissao, o.dataVenda), 0) / pedidosComNF.length
    : 3.0;

  // ═══════════════════════════════════════════════════════════════
  // ESTIMATIVAS (não há dados reais no CSV)
  // ═══════════════════════════════════════════════════════════════
  const tempoEnvio = 2.5;      // ESTIMATIVA: dias médios até despacho
  const taxaEntrega = 96;      // ESTIMATIVA: % entregas bem-sucedidas
  const pedidosCancelados = Math.round(pedidos * 0.04); // ESTIMATIVA: 4%
  
  // Marcar como estimativas no _meta
  _meta.tempoEnvio = 'ESTIMATED';
  _meta.taxaEntrega = 'ESTIMATED';
  _meta.pedidosCancelados = 'ESTIMATED';

  return {
    vendas: {
      receita,
      pedidos,
      ticketMedio,
      ticketMedioReal,
      conversao,
    },
    marketing: {
      investimentoAds,
      receitaAds,
      roasAds,
      roasBruto,
      roasReal,
      roasMeta,
      impressoes,
      cliques: cliquesTotal,
      ctr,
      cpa,
      cpc,
    },
    clientes: {
      novosClientes,
      clientesAtivos,
      taxaChurn,
      taxaRecompra,
      ltv,
      cac,
    },
    produtos: {
      topProduto,
      receitaTopProduto,
      margemMedia,
      produtosVendidos,
      sku: skuUnicos,
    },
    operacoes: {
      tempoEmissaoNF,
      tempoEnvio,
      taxaEntrega,
      pedidosCancelados,
    },
    _meta,
    _source,
    _authority,
    _temporal,
  };
};

/**
 * Filtra pedidos por mês
 */
export const filterOrdersByMonth = (orders: ProcessedOrder[], month: string): ProcessedOrder[] => {
  return orders.filter(order => {
    try {
      const orderMonth = `${order.dataVenda.getFullYear()}-${String(order.dataVenda.getMonth() + 1).padStart(2, '0')}`;
      return orderMonth === month;
    } catch {
      return false;
    }
  });
};

/**
 * Filtra dados de ads por mês
 */
export const filterAdsByMonth = (adsData: AdsData[], month: string): AdsData[] => {
  return adsData.filter(ad => {
    try {
      const adMonth = ad["Início dos relatórios"].substring(0, 7);
      return adMonth === month;
    } catch {
      return false;
    }
  });
};
