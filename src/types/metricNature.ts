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
