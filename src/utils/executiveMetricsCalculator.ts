import { ExecutiveMetrics } from "@/types/executive";
import { AdsData, ProcessedOrder } from "@/types/marketing";
import { calculateSalesMetrics } from "./salesCalculator";
import { calculateAdsMetrics } from "./adsCalculator";
import { analyzeChurn } from "./customerBehaviorMetrics";
import { differenceInDays, parse } from "date-fns";

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

  // Calcular métricas de vendas
  const salesMetrics = orders.length > 0 ? calculateSalesMetrics(orders) : null;
  
  // Calcular métricas de ads
  const adsMetrics = adsData.length > 0 ? calculateAdsMetrics(adsData) : null;
  
  // Análise de churn
  const churnAnalysis = orders.length > 0 ? analyzeChurn(orders) : null;

  // ===== VENDAS =====
  const receita = salesMetrics?.faturamentoTotal || 0;
  const pedidos = salesMetrics?.totalPedidos || 0;
  const ticketMedio = pedidos > 0 ? receita / pedidos : 0;
  
  // Ticket médio real - exclui apenas pedidos de SOMENTE amostra
  // (pedidos que têm amostra + produto regular são mantidos)
  const pedidosReais = orders.filter(order => {
    const hasRealProduct = order.produtos.some(
      p => p.descricaoAjustada !== 'Kit de Amostras'
    );
    return hasRealProduct;
  });
  const receitaReal = pedidosReais.reduce((sum, o) => sum + o.valorTotal, 0);
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
  
  // Calcular faturamento e frete dos pedidos reais
  const faturamentoTotal = orders.reduce((sum, o) => sum + o.valorTotal, 0);
  const freteTotal = orders.reduce((sum, o) => sum + (o.valorFrete || 0), 0);
  const percentualFrete = faturamentoTotal > 0 ? freteTotal / faturamentoTotal : 0;
  
  // ROAS Meta: valor conversão Meta - frete estimado (proporcional) / investimento
  // Usamos o percentual de frete dos pedidos reais para estimar o frete do Meta
  const valorConversaoMeta = adsMetrics?.valorConversaoTotal || 0;
  const freteEstimadoMeta = valorConversaoMeta * percentualFrete;
  const faturamentoMetaExFrete = valorConversaoMeta - freteEstimadoMeta;
  const roasMeta = investimentoAds > 0 ? faturamentoMetaExFrete / investimentoAds : 0;
  
  // ROAS Real: faturamento real - frete real / investimento
  const faturamentoExFrete = faturamentoTotal - freteTotal;
  const roasReal = investimentoAds > 0 ? faturamentoExFrete / investimentoAds : 0;
  
  // roasAds mantém por retrocompatibilidade (usa roasMeta)
  const roasAds = roasMeta;
  
  const impressoes = adsMetrics?.impressoesTotal || 0;
  const cliquesTotal = adsMetrics?.cliquesTotal || 0;
  const ctr = adsMetrics?.ctrMedio || 0;
  const cpc = adsMetrics?.cpcMedio || 0;
  const cpa = compras > 0 ? investimentoAds / compras : 0;

  // ===== CLIENTES =====
  // Agrupar clientes únicos
  const clientesUnicos = new Map<string, { pedidos: number; valorTotal: number }>();
  orders.forEach(order => {
    const existing = clientesUnicos.get(order.cpfCnpj);
    if (existing) {
      existing.pedidos += 1;
      existing.valorTotal += order.valorTotal;
    } else {
      clientesUnicos.set(order.cpfCnpj, { pedidos: 1, valorTotal: order.valorTotal });
    }
  });

  const totalClientes = clientesUnicos.size;
  const novosClientes = Array.from(clientesUnicos.values()).filter(c => c.pedidos === 1).length;
  const clientesRecorrentes = totalClientes - novosClientes;
  const taxaRecompra = totalClientes > 0 ? (clientesRecorrentes / totalClientes) * 100 : 0;
  
  const clientesAtivos = churnAnalysis?.clientesAtivos || totalClientes;
  const taxaChurn = churnAnalysis?.taxaChurn || 0;
  
  const ltv = totalClientes > 0 ? receita / totalClientes : 0;
  const cac = novosClientes > 0 ? investimentoAds / novosClientes : 0;

  // ===== PRODUTOS =====
  // Agrupar produtos por nome ajustado
  const produtosMap = new Map<string, { quantidade: number; receita: number }>();
  orders.forEach(order => {
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
  
  // Margem média (estimativa conservadora de 18%)
  const margemMedia = 18;

  // ===== OPERAÇÕES =====
  // Tempo médio de emissão de NF (DADO REAL - calculado do CSV)
  const pedidosComNF = orders.filter(o => o.numeroNF && o.dataEmissao);
  const tempoEmissaoNF = pedidosComNF.length > 0
    ? pedidosComNF.reduce((sum, o) => sum + differenceInDays(o.dataEmissao, o.dataVenda), 0) / pedidosComNF.length
    : 3.0;

  // ═══════════════════════════════════════════════════════════════
  // ESTIMATIVAS (não há dados reais no CSV)
  // Esses valores NÃO são usados no HealthScore (peso zero)
  // ═══════════════════════════════════════════════════════════════
  const tempoEnvio = 2.5;      // ESTIMATIVA: dias médios até despacho
  const taxaEntrega = 96;      // ESTIMATIVA: % entregas bem-sucedidas
  const pedidosCancelados = Math.round(pedidos * 0.04); // ESTIMATIVA: 4%

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
