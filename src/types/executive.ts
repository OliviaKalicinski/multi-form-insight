// Interfaces para análise executiva

export interface VendasMetrics {
  receita: number;
  pedidos: number;
  ticketMedio: number;
  ticketMedioReal: number;
  conversao: number;
}

export interface MarketingMetrics {
  investimentoAds: number;
  receitaAds: number;
  roasAds: number;      // Mantém por retrocompatibilidade
  roasReal: number;     // ROAS baseado no faturamento real (ex-frete)
  roasMeta: number;     // ROAS reportado pelo Meta Ads
  impressoes: number;
  cliques: number;
  ctr: number;
  cpa: number;
  cpc: number;
}

export interface ClientesMetrics {
  novosClientes: number;
  clientesAtivos: number;
  taxaChurn: number;
  taxaRecompra: number;
  ltv: number;
  cac: number;
}

export interface ProdutosMetrics {
  topProduto: string;
  receitaTopProduto: number;
  margemMedia: number;
  produtosVendidos: number;
  sku: number;
}

export interface OperacoesMetrics {
  tempoEmissaoNF: number;
  tempoEnvio: number;
  taxaEntrega: number;
  pedidosCancelados: number;
}

export interface ExecutiveMetrics {
  vendas: VendasMetrics;
  marketing: MarketingMetrics;
  clientes: ClientesMetrics;
  produtos: ProdutosMetrics;
  operacoes: OperacoesMetrics;
}

export interface HealthScore {
  overall: number; // 0-100
  breakdown: {
    marketing: number;
    vendas: number;
    clientes: number;
    produtos: number;
    operacoes: number | null; // null = dados estimados/não confiáveis
  };
  status: 'critical' | 'warning' | 'good' | 'excellent';
}

export interface CriticalAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'marketing' | 'vendas' | 'clientes' | 'produtos' | 'operacoes';
  title: string;
  metric: string;
  current: number;
  benchmark: number;
  gap: number; // % difference
  impact: string;
  action: string;
  priority: 'urgent' | 'high' | 'medium';
  estimatedFix: string;
  deadline: Date;
}

export interface Recommendation {
  id: string;
  title: string;
  category: string;
  actions: string[];
  impact: string;
  roi: number;
  prazo: string;
  responsavel: string;
  custo: number;
  prioridade: number;
  facilidade: 'baixa' | 'media' | 'alta';
}

export interface TrendInsight {
  type: 'sucesso' | 'atencao' | 'oportunidade';
  title: string;
  description: string;
  metrics: {
    label: string;
    value: string;
    trend: number;
  }[];
}

export interface MonthComparison {
  metric: string;
  atual: number;
  anterior: number;
  variacao: number;
  variacaoAbsoluta: number;
  status: 'up' | 'down' | 'neutral';
  isGood: boolean;
}

export interface QuarterlyAnalysis {
  meses: string[];
  metricas: {
    [key: string]: number[];
  };
  tendencia: 'crescente' | 'decrescente' | 'estavel';
  media: number;
  variacaoVsMedia: number;
}
