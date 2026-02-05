// ============================================
// Sistema de Natureza de Métricas
// ============================================
// Define se uma métrica é calculada de dados REAIS,
// ESTIMADA (valor fixo/hardcoded), ou INFERIDA (derivada).
// ============================================

export type MetricNature = 'REAL' | 'ESTIMATED' | 'INFERRED';

export interface MetricWithNature<T = number> {
  value: T;
  nature: MetricNature;
  source?: string; // Origem do dado (ex: "CSV Vendas", "Hardcoded", "Derivado")
}

// Labels para exibição
export const MetricNatureLabels: Record<MetricNature, string> = {
  REAL: 'Real',
  ESTIMATED: 'Estimativa',
  INFERRED: 'Inferido',
};

// Badges curtas para UI
export const MetricNatureBadges: Record<MetricNature, string> = {
  REAL: '',      // Não exibe badge para dados reais
  ESTIMATED: 'EST',
  INFERRED: 'INF',
};

// Metadados de natureza para ExecutiveMetrics
export interface ExecutiveMetricsMeta {
  // Vendas - todas REAL quando calculadas de orders
  receita: MetricNature;
  pedidos: MetricNature;
  ticketMedio: MetricNature;
  ticketMedioReal: MetricNature;
  conversao: MetricNature;
  
  // Marketing - REAL quando calculadas de ads
  investimentoAds: MetricNature;
  receitaAds: MetricNature;
  roasAds: MetricNature;
  roasBruto: MetricNature;
  roasReal: MetricNature;
  roasMeta: MetricNature;
  impressoes: MetricNature;
  cliques: MetricNature;
  ctr: MetricNature;
  cpa: MetricNature;
  cpc: MetricNature;
  
  // Clientes
  novosClientes: MetricNature;
  clientesAtivos: MetricNature;
  taxaChurn: MetricNature;
  taxaRecompra: MetricNature;
  ltv: MetricNature;
  cac: MetricNature;
  
  // Produtos
  topProduto: MetricNature;
  receitaTopProduto: MetricNature;
  margemMedia: MetricNature;      // ESTIMATED - hardcoded 18%
  produtosVendidos: MetricNature;
  sku: MetricNature;
  
  // Operações
  tempoEmissaoNF: MetricNature;   // REAL - calculado do CSV
  tempoEnvio: MetricNature;       // ESTIMATED - hardcoded 2.5
  taxaEntrega: MetricNature;      // ESTIMATED - hardcoded 96%
  pedidosCancelados: MetricNature; // ESTIMATED - hardcoded 4%
}

// Factory para criar meta default (tudo REAL)
export const createDefaultMeta = (): ExecutiveMetricsMeta => ({
  // Vendas
  receita: 'REAL',
  pedidos: 'REAL',
  ticketMedio: 'REAL',
  ticketMedioReal: 'REAL',
  conversao: 'REAL',
  
  // Marketing
  investimentoAds: 'REAL',
  receitaAds: 'REAL',
  roasAds: 'REAL',
  roasBruto: 'REAL',
  roasReal: 'REAL',
  roasMeta: 'REAL',
  impressoes: 'REAL',
  cliques: 'REAL',
  ctr: 'REAL',
  cpa: 'REAL',
  cpc: 'REAL',
  
  // Clientes
  novosClientes: 'REAL',
  clientesAtivos: 'REAL',
  taxaChurn: 'REAL',
  taxaRecompra: 'REAL',
  ltv: 'REAL',
  cac: 'REAL',
  
  // Produtos
  topProduto: 'REAL',
  receitaTopProduto: 'REAL',
  margemMedia: 'ESTIMATED',        // Hardcoded
  produtosVendidos: 'REAL',
  sku: 'REAL',
  
  // Operações
  tempoEmissaoNF: 'REAL',
  tempoEnvio: 'ESTIMATED',         // Hardcoded
  taxaEntrega: 'ESTIMATED',        // Hardcoded
  pedidosCancelados: 'ESTIMATED',  // Hardcoded
});

// Verifica se alguma métrica crítica usa estimativas
export const hasEstimatedMetrics = (meta: ExecutiveMetricsMeta): boolean => {
  return Object.values(meta).some(nature => nature === 'ESTIMATED');
};

// Lista métricas estimadas
export const getEstimatedMetrics = (meta: ExecutiveMetricsMeta): string[] => {
  return Object.entries(meta)
    .filter(([_, nature]) => nature === 'ESTIMATED')
    .map(([key]) => key);
};

// ============================================
// Mapeamento de Origem dos Dados (_source)
// ============================================

export interface ExecutiveMetricsSource {
  // Vendas
  receita: string;
  pedidos: string;
  ticketMedio: string;
  ticketMedioReal: string;
  conversao: string;
  
  // Marketing
  investimentoAds: string;
  receitaAds: string;
  roasAds: string;
  roasBruto: string;
  roasReal: string;
  roasMeta: string;
  impressoes: string;
  cliques: string;
  ctr: string;
  cpa: string;
  cpc: string;
  
  // Clientes
  novosClientes: string;
  clientesAtivos: string;
  taxaChurn: string;
  taxaRecompra: string;
  ltv: string;
  cac: string;
  
  // Produtos
  topProduto: string;
  receitaTopProduto: string;
  margemMedia: string;
  produtosVendidos: string;
  sku: string;
  
  // Operações
  tempoEmissaoNF: string;
  tempoEnvio: string;
  taxaEntrega: string;
  pedidosCancelados: string;
}

// Factory para criar source default
export const createDefaultSource = (): ExecutiveMetricsSource => ({
  // Vendas
  receita: 'CSV Vendas (valorTotal)',
  pedidos: 'CSV Vendas (count)',
  ticketMedio: 'Derivado (receita / pedidos)',
  ticketMedioReal: 'Derivado (receita ex-amostras / pedidos)',
  conversao: 'Derivado (compras / cliques)',
  
  // Marketing
  investimentoAds: 'CSV Ads (Quantia gasta)',
  receitaAds: 'CSV Ads (Valor de conversão)',
  roasAds: 'Derivado (receitaAds / investimento)',
  roasBruto: 'Derivado (faturamento / investimento)',
  roasReal: 'Derivado (faturamento ex-frete / investimento)',
  roasMeta: 'Derivado (valorConversaoMeta / investimento)',
  impressoes: 'CSV Ads (Impressões)',
  cliques: 'CSV Ads (Cliques)',
  ctr: 'CSV Ads (CTR)',
  cpa: 'Derivado (investimento / compras)',
  cpc: 'CSV Ads (CPC)',
  
  // Clientes
  novosClientes: 'Derivado (clientes com 1 pedido)',
  clientesAtivos: 'Derivado (< 90 dias sem compra)',
  taxaChurn: 'Derivado (inativos / total)',
  taxaRecompra: 'Derivado (recorrentes / total)',
  ltv: 'Derivado (receita / clientes)',
  cac: 'Derivado (investimento / novos)',
  
  // Produtos
  topProduto: 'CSV Vendas (max receita)',
  receitaTopProduto: 'CSV Vendas (soma)',
  margemMedia: 'Hardcoded (18%)',
  produtosVendidos: 'CSV Vendas (soma quantidade)',
  sku: 'CSV Vendas (count distinct)',
  
  // Operações
  tempoEmissaoNF: 'CSV Vendas (dataEmissao - dataVenda)',
  tempoEnvio: 'Hardcoded (2.5 dias)',
  taxaEntrega: 'Hardcoded (96%)',
  pedidosCancelados: 'Hardcoded (4%)',
});
