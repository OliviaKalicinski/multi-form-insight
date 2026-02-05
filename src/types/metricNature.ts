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

// ============================================
// Sistema de Autoridade de Métricas (Etapa 2)
// ============================================
// Define o que uma métrica pode provocar no sistema:
// - OBSERVATIONAL: apenas informa, nunca age
// - DIAGNOSTIC: pode gerar alertas, não ações
// - DECISIONAL: pode sugerir ações (recomendações)
// - RESTRICTED: nunca automatizar, sempre aviso explícito
// ============================================

export type MetricAuthority = 
  | 'OBSERVATIONAL'  // informa, nunca age
  | 'DIAGNOSTIC'     // gera alerta, não ação
  | 'DECISIONAL'     // pode sugerir ação
  | 'RESTRICTED';    // nunca automatizar

// Labels para exibição
export const MetricAuthorityLabels: Record<MetricAuthority, string> = {
  OBSERVATIONAL: 'Observacional',
  DIAGNOSTIC: 'Diagnóstico',
  DECISIONAL: 'Decisório',
  RESTRICTED: 'Restrita',
};

// Badges curtas para UI
export const MetricAuthorityBadges: Record<MetricAuthority, string> = {
  OBSERVATIONAL: 'OBS',
  DIAGNOSTIC: 'DIAG',
  DECISIONAL: 'DEC',
  RESTRICTED: 'REST',
};

// Mapeamento de autoridade por métrica
export interface ExecutiveMetricsAuthority {
  // Vendas
  receita: MetricAuthority;        // OBSERVATIONAL
  pedidos: MetricAuthority;        // OBSERVATIONAL
  ticketMedio: MetricAuthority;    // DIAGNOSTIC
  ticketMedioReal: MetricAuthority; // DIAGNOSTIC
  conversao: MetricAuthority;      // DIAGNOSTIC
  
  // Marketing
  investimentoAds: MetricAuthority; // OBSERVATIONAL
  receitaAds: MetricAuthority;      // OBSERVATIONAL
  roasAds: MetricAuthority;         // DECISIONAL
  roasBruto: MetricAuthority;       // DIAGNOSTIC
  roasReal: MetricAuthority;        // DIAGNOSTIC
  roasMeta: MetricAuthority;        // DIAGNOSTIC
  impressoes: MetricAuthority;      // OBSERVATIONAL
  cliques: MetricAuthority;         // OBSERVATIONAL
  ctr: MetricAuthority;             // DIAGNOSTIC
  cpa: MetricAuthority;             // DIAGNOSTIC
  cpc: MetricAuthority;             // DIAGNOSTIC
  
  // Clientes
  novosClientes: MetricAuthority;   // OBSERVATIONAL
  clientesAtivos: MetricAuthority;  // OBSERVATIONAL
  taxaChurn: MetricAuthority;       // DECISIONAL
  taxaRecompra: MetricAuthority;    // DIAGNOSTIC
  ltv: MetricAuthority;             // RESTRICTED
  cac: MetricAuthority;             // DECISIONAL
  
  // Produtos
  topProduto: MetricAuthority;       // OBSERVATIONAL
  receitaTopProduto: MetricAuthority; // OBSERVATIONAL
  margemMedia: MetricAuthority;      // RESTRICTED
  produtosVendidos: MetricAuthority; // OBSERVATIONAL
  sku: MetricAuthority;              // OBSERVATIONAL
  
  // Operações
  tempoEmissaoNF: MetricAuthority;   // DIAGNOSTIC
  tempoEnvio: MetricAuthority;       // RESTRICTED (estimativa)
  taxaEntrega: MetricAuthority;      // RESTRICTED (estimativa)
  pedidosCancelados: MetricAuthority; // RESTRICTED (estimativa)
  
  // Health Score
  healthScore: MetricAuthority;      // DIAGNOSTIC
}

// Factory para criar autoridades default
export const createDefaultAuthority = (): ExecutiveMetricsAuthority => ({
  // Vendas - observacionais, apenas informam
  receita: 'OBSERVATIONAL',
  pedidos: 'OBSERVATIONAL',
  ticketMedio: 'DIAGNOSTIC',
  ticketMedioReal: 'DIAGNOSTIC',
  conversao: 'DIAGNOSTIC',
  
  // Marketing
  investimentoAds: 'OBSERVATIONAL',
  receitaAds: 'OBSERVATIONAL',
  roasAds: 'DECISIONAL',        // Pode gerar recomendações
  roasBruto: 'DIAGNOSTIC',
  roasReal: 'DIAGNOSTIC',
  roasMeta: 'DIAGNOSTIC',
  impressoes: 'OBSERVATIONAL',
  cliques: 'OBSERVATIONAL',
  ctr: 'DIAGNOSTIC',
  cpa: 'DIAGNOSTIC',
  cpc: 'DIAGNOSTIC',
  
  // Clientes
  novosClientes: 'OBSERVATIONAL',
  clientesAtivos: 'OBSERVATIONAL',
  taxaChurn: 'DECISIONAL',      // Pode gerar recomendações
  taxaRecompra: 'DIAGNOSTIC',
  ltv: 'RESTRICTED',            // Nunca automatizar
  cac: 'DECISIONAL',            // Pode gerar recomendações
  
  // Produtos
  topProduto: 'OBSERVATIONAL',
  receitaTopProduto: 'OBSERVATIONAL',
  margemMedia: 'RESTRICTED',    // Estimativa - nunca automatizar
  produtosVendidos: 'OBSERVATIONAL',
  sku: 'OBSERVATIONAL',
  
  // Operações
  tempoEmissaoNF: 'DIAGNOSTIC',
  tempoEnvio: 'RESTRICTED',       // Estimativa
  taxaEntrega: 'RESTRICTED',      // Estimativa
  pedidosCancelados: 'RESTRICTED', // Estimativa
  
  // Health Score
  healthScore: 'DIAGNOSTIC',
});

// ============================================
// Guardrails de Autoridade (Contrato de Ação)
// ============================================

/**
 * Verifica se métrica pode gerar alerta
 * OBSERVATIONAL e RESTRICTED não geram alertas
 */
export const canGenerateAlert = (authority: MetricAuthority): boolean => {
  return authority === 'DIAGNOSTIC' || authority === 'DECISIONAL';
};

/**
 * Verifica se métrica pode gerar recomendação
 * Apenas DECISIONAL pode sugerir ações
 */
export const canGenerateRecommendation = (authority: MetricAuthority): boolean => {
  return authority === 'DECISIONAL';
};

/**
 * Verifica se métrica requer aviso explícito
 * RESTRICTED sempre exibe warning
 */
export const requiresExplicitWarning = (authority: MetricAuthority): boolean => {
  return authority === 'RESTRICTED';
};

/**
 * Verifica se recomendação pode ser gerada (autoridade + nature + benchmark)
 * Regra completa: DECISIONAL + REAL + benchmark existe
 */
export const canGenerateFullRecommendation = (
  authority: MetricAuthority,
  nature: MetricNature,
  hasBenchmark: boolean
): { allowed: boolean; blockedReason?: string } => {
  if (authority !== 'DECISIONAL') {
    return { 
      allowed: false, 
      blockedReason: `Métrica ${MetricAuthorityLabels[authority]} não tem autoridade para gerar recomendação` 
    };
  }
  
  if (nature !== 'REAL') {
    return { 
      allowed: false, 
      blockedReason: 'Métrica usa dados estimados ou inferidos' 
    };
  }
  
  if (!hasBenchmark) {
    return { 
      allowed: false, 
      blockedReason: 'Benchmark de referência não configurado' 
    };
  }
  
  return { allowed: true };
};

// ============================================
// Sistema de Confiança Temporal (Etapa 3)
// ============================================
// Define se uma métrica tem dados suficientes para
// justificar atenção, alerta ou decisão.
// ============================================

export type TemporalConfidence = 
  | 'INSUFFICIENT'   // < 7 dias de dados
  | 'STABILIZING'    // 7-29 dias de dados
  | 'STABLE';        // >= 30 dias de dados

// Labels para exibição
export const TemporalConfidenceLabels: Record<TemporalConfidence, string> = {
  INSUFFICIENT: 'Dados Insuficientes',
  STABILIZING: 'Estabilizando',
  STABLE: 'Estável',
};

// Badges curtas para UI
export const TemporalConfidenceBadges: Record<TemporalConfidence, string> = {
  INSUFFICIENT: 'IMAT',   // Imaturo
  STABILIZING: 'ESTAB',   // Estabilizando
  STABLE: '',             // Não exibe badge
};

// Interface de metadados temporais
export interface TemporalMetadata {
  dataPoints: number;           // Quantidade de registros
  windowDays: number;           // Janela em dias (calculada)
  firstDate: Date | null;       // Primeiro registro
  lastDate: Date | null;        // Último registro
  confidence: TemporalConfidence;
  label: string;                // Ex: "23 dias de dados"
}

// Mapeamento de temporal por categoria
export interface ExecutiveMetricsTemporal {
  vendas: TemporalMetadata;
  marketing: TemporalMetadata;
  clientes: TemporalMetadata;
  produtos: TemporalMetadata;
  operacoes: TemporalMetadata;
}

// ============================================
// Funções de Cálculo de Confiança Temporal
// ============================================

/**
 * Calcula a confiança temporal baseada na janela de dias
 */
export const calculateTemporalConfidence = (windowDays: number): TemporalConfidence => {
  if (windowDays < 7) return 'INSUFFICIENT';
  if (windowDays < 30) return 'STABILIZING';
  return 'STABLE';
};

/**
 * Cria metadados temporais a partir de dados
 */
export const createTemporalMetadata = (
  dataPoints: number,
  windowDays: number,
  firstDate: Date | null,
  lastDate: Date | null
): TemporalMetadata => {
  const confidence = calculateTemporalConfidence(windowDays);
  
  const label = windowDays === 0 
    ? 'Sem dados' 
    : `${windowDays} dia${windowDays > 1 ? 's' : ''} de dados`;
  
  return {
    dataPoints,
    windowDays,
    firstDate,
    lastDate,
    confidence,
    label,
  };
};

/**
 * Cria temporal default (sem dados)
 */
export const createEmptyTemporalMetadata = (): TemporalMetadata => ({
  dataPoints: 0,
  windowDays: 0,
  firstDate: null,
  lastDate: null,
  confidence: 'INSUFFICIENT',
  label: 'Sem dados',
});

// ============================================
// Guardrails Temporais (Contrato de Ação)
// ============================================

/**
 * Verifica se confiança temporal permite alertas
 * INSUFFICIENT não gera alertas (apenas sinais)
 */
export const canGenerateTemporalAlert = (confidence: TemporalConfidence): boolean => {
  return confidence === 'STABILIZING' || confidence === 'STABLE';
};

/**
 * Verifica se confiança temporal permite recomendações
 * Apenas STABLE pode gerar recomendações
 */
export const canGenerateTemporalRecommendation = (confidence: TemporalConfidence): boolean => {
  return confidence === 'STABLE';
};

/**
 * Verifica se requer aviso de dados iniciais
 */
export const requiresTemporalWarning = (confidence: TemporalConfidence): boolean => {
  return confidence === 'INSUFFICIENT' || confidence === 'STABILIZING';
};

/**
 * Verifica se recomendação pode ser gerada (autoridade + nature + benchmark + temporal)
 * Regra completa: DECISIONAL + REAL + benchmark existe + STABLE
 */
export const canGenerateFullRecommendationWithTemporal = (
  authority: MetricAuthority,
  nature: MetricNature,
  hasBenchmark: boolean,
  temporalConfidence: TemporalConfidence
): { allowed: boolean; blockedReason?: string } => {
  // Checagem 1: Authority
  if (authority !== 'DECISIONAL') {
    return { 
      allowed: false, 
      blockedReason: `Métrica ${MetricAuthorityLabels[authority]} não tem autoridade para gerar recomendação` 
    };
  }
  
  // Checagem 2: Nature
  if (nature !== 'REAL') {
    return { 
      allowed: false, 
      blockedReason: 'Métrica usa dados estimados ou inferidos' 
    };
  }
  
  // Checagem 3: Benchmark
  if (!hasBenchmark) {
    return { 
      allowed: false, 
      blockedReason: 'Benchmark de referência não configurado' 
    };
  }
  
  // Checagem 4: Temporal
  if (temporalConfidence !== 'STABLE') {
    return { 
      allowed: false, 
      blockedReason: temporalConfidence === 'INSUFFICIENT' 
        ? 'Base temporal insuficiente (< 7 dias)'
        : 'Dados em estabilização (< 30 dias)'
    };
  }
  
  return { allowed: true };
};
