// Interfaces para análise executiva

import { ExecutiveMetricsMeta, ExecutiveMetricsSource, ExecutiveMetricsAuthority } from './metricNature';

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
  roasBruto: number;    // ROAS Bruto: Receita Total (com frete) / Investimento
  roasReal: number;     // ROAS Real: Receita ex-frete / Investimento
  roasMeta: number;     // ROAS Meta: Valor de conversão Meta / Investimento (já ex-frete)
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
  _meta?: ExecutiveMetricsMeta;
  _source?: ExecutiveMetricsSource;
  _authority?: ExecutiveMetricsAuthority; // Autoridade de cada métrica
}

export interface HealthScore {
  overall: number; // 0-100
  breakdown: {
    marketing: number | null;
    vendas: number | null;
    clientes: number | null;
    produtos: number | null;
    operacoes: number | null;
  };
  status: 'critical' | 'warning' | 'good' | 'excellent' | 'partial';
  isPartial: boolean;
  partialReasons: string[];
}

export interface CriticalAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'marketing' | 'vendas' | 'clientes' | 'produtos' | 'operacoes';
  alertType: 'benchmark' | 'temporal'; // benchmark = vs setor, temporal = vs período anterior
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
  basedOnMetric?: string; // Métrica que fundamenta a recomendação (DECISIONAL)
}

// Classificação de insights separando sinal de decisão
export type InsightClass = 'signal' | 'context' | 'recommendation';

export interface TrendInsight {
  type: 'sucesso' | 'atencao' | 'oportunidade';
  insightClass: InsightClass; // Classificação: sinal, contexto ou recomendação
  title: string;
  description: string;
  metrics: {
    label: string;
    value: string;
    trend: number;
  }[];
  blockedReason?: string; // Explica por que ação não foi gerada
  basedOnMetric?: string; // Métrica que fundamenta o insight
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
