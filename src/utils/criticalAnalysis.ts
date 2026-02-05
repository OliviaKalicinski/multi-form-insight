import { ExecutiveMetrics, HealthScore, MonthComparison, QuarterlyAnalysis, TrendInsight, InsightClass } from "@/types/executive";
import { SectorBenchmarks } from "@/hooks/useAppSettings";
import { 
  MetricNature, 
  ExecutiveMetricsMeta, 
  canGenerateRecommendation, 
  canGenerateAlert, 
  createDefaultAuthority,
  TemporalConfidence,
  canGenerateTemporalRecommendation,
  canGenerateTemporalAlert,
  requiresTemporalWarning
} from "@/types/metricNature";

// Calcular variação MoM
export const calcularVariacao = (atual: number, anterior: number): number => {
  if (anterior === 0) return 0;
  return ((atual - anterior) / anterior) * 100;
};

// Detectar se operações usa valores hardcoded (estimativas)
const isOperacoesEstimada = (operacoes: ExecutiveMetrics["operacoes"]): boolean => {
  // Valores hardcoded no executiveMetricsCalculator
  const tempoEnvioHardcoded = operacoes.tempoEnvio === 2.5;
  const taxaEntregaHardcoded = operacoes.taxaEntrega === 96;
  return tempoEnvioHardcoded || taxaEntregaHardcoded;
};

// Detectar se produtos usa valores hardcoded (margem estimada)
const isProdutosEstimado = (produtos: ExecutiveMetrics["produtos"]): boolean => {
  // Margem fixa de 18% é hardcoded
  return produtos.margemMedia === 18;
};

// Validar se um componente do score pode ser calculado com confiança
interface ScoreValidation {
  isValid: boolean;
  reason?: string;
}

const validateScoreComponent = (
  component: 'marketing' | 'vendas' | 'clientes' | 'produtos' | 'operacoes',
  benchmarks: SectorBenchmarks,
  meta?: ExecutiveMetricsMeta
): ScoreValidation => {
  switch (component) {
    case 'produtos':
      if (meta?.margemMedia === 'ESTIMATED') {
        return { isValid: false, reason: 'Margem média estimada (18%)' };
      }
      break;
    case 'operacoes':
      if (meta?.tempoEnvio === 'ESTIMATED' || meta?.taxaEntrega === 'ESTIMATED') {
        return { isValid: false, reason: 'Operações com dados estimados' };
      }
      break;
    case 'marketing':
      if (!benchmarks.roasMedio || !benchmarks.ctr || !benchmarks.cpc) {
        return { isValid: false, reason: 'Benchmarks de marketing incompletos' };
      }
      break;
    case 'clientes':
      if (!benchmarks.taxaRecompra || !benchmarks.taxaChurn || !benchmarks.ltv) {
        return { isValid: false, reason: 'Benchmarks de clientes incompletos' };
      }
      break;
    case 'vendas':
      if (!benchmarks.taxaConversao || !benchmarks.ticketMedio) {
        return { isValid: false, reason: 'Benchmarks de vendas incompletos' };
      }
      break;
  }
  return { isValid: true };
};

// Calcular Health Score
export const calcularHealthScore = (
  metrics: ExecutiveMetrics,
  benchmarks: SectorBenchmarks
): HealthScore => {
  const partialReasons: string[] = [];
  const meta = metrics._meta;

  // Validar cada componente
  const validations = {
    marketing: validateScoreComponent('marketing', benchmarks, meta),
    vendas: validateScoreComponent('vendas', benchmarks, meta),
    clientes: validateScoreComponent('clientes', benchmarks, meta),
    produtos: validateScoreComponent('produtos', benchmarks, meta),
    operacoes: validateScoreComponent('operacoes', benchmarks, meta),
  };

  // Adicionar razões de parcialidade
  Object.entries(validations).forEach(([key, validation]) => {
    if (!validation.isValid && validation.reason) {
      partialReasons.push(validation.reason);
    }
  });

  const breakdown = {
    marketing: validations.marketing.isValid 
      ? calcularScoreMarketing(metrics.marketing, benchmarks) 
      : null,
    vendas: validations.vendas.isValid 
      ? calcularScoreVendas(metrics.vendas, benchmarks) 
      : null,
    clientes: validations.clientes.isValid 
      ? calcularScoreClientes(metrics.clientes, benchmarks) 
      : null,
    produtos: validations.produtos.isValid 
      ? calcularScoreProdutos(metrics.produtos, benchmarks) 
      : null,
    operacoes: validations.operacoes.isValid 
      ? calcularScoreOperacoes(metrics.operacoes) 
      : null,
  };

  // Filtrar apenas scores válidos (exclui null)
  const validScores = Object.values(breakdown).filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v)
  );

  const overall = validScores.length > 0
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0;

  // Determinar status
  const hasNullComponents = Object.values(breakdown).some(v => v === null);
  const isPartial = hasNullComponents || partialReasons.length > 0;

  let status: HealthScore['status'];
  if (isPartial) {
    status = 'partial';
  } else if (overall >= 80) {
    status = 'excellent';
  } else if (overall >= 60) {
    status = 'good';
  } else if (overall >= 40) {
    status = 'warning';
  } else {
    status = 'critical';
  }

  return { 
    overall, 
    breakdown, 
    status, 
    isPartial, 
    partialReasons 
  };
};

const calcularScoreMarketing = (
  marketing: ExecutiveMetrics['marketing'],
  benchmarks: SectorBenchmarks
): number | null => {
  // REGRA: Sem benchmarks, não calcular score
  if (!benchmarks.roasMedio || !benchmarks.ctr || !benchmarks.cpc) {
    return null;
  }
  
  let score = 0;
  
  // ROAS (40 pontos)
  const roasScore = Math.min((marketing.roasAds / benchmarks.roasMedio) * 40, 40);
  score += roasScore;
  
  // CTR (30 pontos)
  const ctrScore = Math.min((marketing.ctr / benchmarks.ctr) * 30, 30);
  score += ctrScore;
  
  // CPC (30 pontos - invertido, menor é melhor)
  const cpcScore = Math.min((benchmarks.cpc / marketing.cpc) * 30, 30);
  score += cpcScore;
  
  return Math.round(score);
};

const calcularScoreVendas = (
  vendas: ExecutiveMetrics['vendas'],
  benchmarks: SectorBenchmarks
): number | null => {
  // REGRA: Sem benchmarks, não calcular score
  if (!benchmarks.taxaConversao || !benchmarks.ticketMedio) {
    return null;
  }
  
  let score = 0;
  
  // Conversão (50 pontos)
  const conversaoScore = Math.min((vendas.conversao / benchmarks.taxaConversao) * 50, 50);
  score += conversaoScore;
  
  // Ticket Médio (50 pontos)
  const ticketScore = Math.min((vendas.ticketMedioReal / benchmarks.ticketMedio) * 50, 50);
  score += ticketScore;
  
  return Math.round(score);
};

const calcularScoreClientes = (
  clientes: ExecutiveMetrics['clientes'],
  benchmarks: SectorBenchmarks
): number | null => {
  // REGRA: Sem benchmarks, não calcular score
  if (!benchmarks.taxaRecompra || !benchmarks.taxaChurn || !benchmarks.ltv) {
    return null;
  }
  
  let score = 0;
  
  // Taxa de Recompra (40 pontos)
  const recompraScore = Math.min((clientes.taxaRecompra / benchmarks.taxaRecompra) * 40, 40);
  score += recompraScore;
  
  // Taxa de Churn (invertida - 40 pontos)
  const churnScore = Math.min((benchmarks.taxaChurn / clientes.taxaChurn) * 40, 40);
  score += churnScore;
  
  // LTV (20 pontos)
  const ltvScore = Math.min((clientes.ltv / benchmarks.ltv) * 20, 20);
  score += ltvScore;
  
  return Math.round(score);
};

const calcularScoreProdutos = (
  produtos: ExecutiveMetrics['produtos'],
  benchmarks: SectorBenchmarks
): number | null => {
  // REGRA: Sem benchmark de margem, não calcular score
  if (!benchmarks.margemLiquida) {
    return null;
  }
  
  let score = 0;
  
  // Margem (60 pontos)
  const margemScore = Math.min((produtos.margemMedia / benchmarks.margemLiquida) * 60, 60);
  score += margemScore;
  
  // Diversificação (40 pontos) - não depende de benchmark
  const diversificacaoScore = Math.min((produtos.sku / 50) * 40, 40);
  score += diversificacaoScore;
  
  return Math.round(score);
};

const calcularScoreOperacoes = (operacoes: ExecutiveMetrics['operacoes']): number | null => {
  // Retornar null se dados são estimativas (não confiáveis para score)
  if (isOperacoesEstimada(operacoes)) return null;

  let score = 0;
  
  // Taxa de Entrega (50 pontos)
  score += Math.min((operacoes.taxaEntrega / 100) * 50, 50);
  
  // Tempo de NF (25 pontos - invertido)
  const nfScore = Math.max(0, 25 - (operacoes.tempoEmissaoNF * 5));
  score += nfScore;
  
  // Tempo de Envio (25 pontos - invertido)
  const envioScore = Math.max(0, 25 - (operacoes.tempoEnvio * 5));
  score += envioScore;
  
  return Math.round(score);
};

// Gerar comparação MoM
export const gerarComparacaoMoM = (
  atual: ExecutiveMetrics,
  anterior: ExecutiveMetrics
): MonthComparison[] => {
  return [
    {
      metric: "Receita Total",
      atual: atual.vendas.receita,
      anterior: anterior.vendas.receita,
      variacao: calcularVariacao(atual.vendas.receita, anterior.vendas.receita),
      variacaoAbsoluta: atual.vendas.receita - anterior.vendas.receita,
      status: atual.vendas.receita > anterior.vendas.receita ? 'up' : 'down',
      isGood: true,
    },
    {
      metric: "Total de Pedidos",
      atual: atual.vendas.pedidos,
      anterior: anterior.vendas.pedidos,
      variacao: calcularVariacao(atual.vendas.pedidos, anterior.vendas.pedidos),
      variacaoAbsoluta: atual.vendas.pedidos - anterior.vendas.pedidos,
      status: atual.vendas.pedidos > anterior.vendas.pedidos ? 'up' : 'down',
      isGood: true,
    },
    {
      metric: "ROAS",
      atual: atual.marketing.roasAds,
      anterior: anterior.marketing.roasAds,
      variacao: calcularVariacao(atual.marketing.roasAds, anterior.marketing.roasAds),
      variacaoAbsoluta: atual.marketing.roasAds - anterior.marketing.roasAds,
      status: atual.marketing.roasAds > anterior.marketing.roasAds ? 'up' : 'down',
      isGood: true,
    },
    {
      metric: "Taxa de Churn",
      atual: atual.clientes.taxaChurn,
      anterior: anterior.clientes.taxaChurn,
      variacao: calcularVariacao(atual.clientes.taxaChurn, anterior.clientes.taxaChurn),
      variacaoAbsoluta: atual.clientes.taxaChurn - anterior.clientes.taxaChurn,
      status: atual.clientes.taxaChurn > anterior.clientes.taxaChurn ? 'up' : 'down',
      isGood: false,
    },
    {
      metric: "Ticket Médio",
      atual: atual.vendas.ticketMedioReal,
      anterior: anterior.vendas.ticketMedioReal,
      variacao: calcularVariacao(atual.vendas.ticketMedioReal, anterior.vendas.ticketMedioReal),
      variacaoAbsoluta: atual.vendas.ticketMedioReal - anterior.vendas.ticketMedioReal,
      status: atual.vendas.ticketMedioReal > anterior.vendas.ticketMedioReal ? 'up' : 'down',
      isGood: true,
    },
  ];
};

// Gerar análise trimestral
export const gerarAnaliseTrimestral = (
  meses: string[],
  dadosMensais: Record<string, ExecutiveMetrics>
): QuarterlyAnalysis => {
  const metricas: QuarterlyAnalysis['metricas'] = {
    receita: [],
    pedidos: [],
    roas: [],
    churn: [],
  };
  
  meses.forEach(mes => {
    const dados = dadosMensais[mes];
    if (dados) {
      metricas.receita.push(dados.vendas.receita);
      metricas.pedidos.push(dados.vendas.pedidos);
      metricas.roas.push(dados.marketing.roasAds);
      metricas.churn.push(dados.clientes.taxaChurn);
    }
  });
  
  // Calcular média de receita
  const mediaReceita = metricas.receita.reduce((a, b) => a + b, 0) / metricas.receita.length;
  
  // Detectar tendência
  const primeiraReceita = metricas.receita[0];
  const ultimaReceita = metricas.receita[metricas.receita.length - 1];
  
  let tendencia: QuarterlyAnalysis['tendencia'];
  const variacaoTotal = ((ultimaReceita - primeiraReceita) / primeiraReceita) * 100;
  
  if (variacaoTotal > 5) tendencia = 'crescente';
  else if (variacaoTotal < -5) tendencia = 'decrescente';
  else tendencia = 'estavel';
  
  const variacaoVsMedia = ((ultimaReceita - mediaReceita) / mediaReceita) * 100;
  
  return {
    meses,
    metricas,
    tendencia,
    media: mediaReceita,
    variacaoVsMedia,
  };
};

// Gerar insights principais com classificação de autoridade e temporal
export const gerarInsights = (
  atual: ExecutiveMetrics,
  anterior: ExecutiveMetrics,
  healthScore: HealthScore,
  benchmarks: SectorBenchmarks
): TrendInsight[] => {
  const insights: TrendInsight[] = [];
  const meta = atual._meta;
  const authority = atual._authority || createDefaultAuthority();
  const temporal = atual._temporal;
  
  // Sucessos - Pedidos (OBSERVATIONAL → apenas signal)
  if (atual.vendas.pedidos > anterior.vendas.pedidos) {
    const crescimento = calcularVariacao(atual.vendas.pedidos, anterior.vendas.pedidos);
    const vendasConfidence = temporal?.vendas.confidence || 'STABLE';
    
    // Pedidos é OBSERVATIONAL, só pode emitir signal
    // Mas verificar temporal para adicionar contexto
    let blockedReason: string | undefined;
    if (!canGenerateTemporalAlert(vendasConfidence)) {
      blockedReason = `Aguardando maturação temporal (${temporal?.vendas.label || 'dados iniciais'})`;
    }
    
    insights.push({
      type: 'sucesso',
      insightClass: 'signal', // OBSERVATIONAL → apenas sinal
      title: 'Volume de Pedidos em Alta',
      description: `Total de pedidos cresceu ${crescimento.toFixed(1)}% vs mês anterior, indicando expansão da base de clientes. Mantenha a estratégia atual de aquisição.`,
      metrics: [
        { label: 'Pedidos Atual', value: atual.vendas.pedidos.toString(), trend: crescimento },
        { label: 'Pedidos Anterior', value: anterior.vendas.pedidos.toString(), trend: 0 },
      ],
      blockedReason,
      basedOnMetric: 'pedidos',
    });
  }
  
  // Atenções - ROAS (DECISIONAL → pode gerar recommendation se REAL + benchmark + STABLE)
  if (benchmarks.roasMedio && atual.marketing.roasAds < 0.8) {
    const prejuizo = atual.marketing.investimentoAds - atual.marketing.receitaAds;
    const roasNature = meta?.roasAds || 'REAL';
    const roasAuthority = authority.roasAds;
    const marketingConfidence = temporal?.marketing.confidence || 'STABLE';
    
    // Determinar classe do insight baseado em autoridade + nature + benchmark + temporal
    let insightClass: InsightClass = 'signal';
    let blockedReason: string | undefined;
    
    // Verificar todos os requisitos para recommendation
    if (
      canGenerateRecommendation(roasAuthority) && 
      roasNature === 'REAL' && 
      benchmarks.roasMedio &&
      canGenerateTemporalRecommendation(marketingConfidence)
    ) {
      insightClass = 'recommendation';
    } else if (canGenerateAlert(roasAuthority) && canGenerateTemporalAlert(marketingConfidence)) {
      insightClass = 'context';
      // Determinar razão do bloqueio
      if (!canGenerateRecommendation(roasAuthority)) {
        blockedReason = 'Métrica diagnóstica não tem autoridade para gerar recomendação';
      } else if (roasNature !== 'REAL') {
        blockedReason = 'Dados estimados não permitem recomendação';
      } else if (!canGenerateTemporalRecommendation(marketingConfidence)) {
        blockedReason = `Dados em ${marketingConfidence === 'INSUFFICIENT' ? 'maturação' : 'estabilização'} (${temporal?.marketing.label})`;
      }
    } else if (!canGenerateTemporalAlert(marketingConfidence)) {
      blockedReason = `Aguardando maturação temporal (${temporal?.marketing.label || 'dados iniciais'})`;
    } else {
      blockedReason = 'Métrica não tem autoridade para alertar';
    }
    
    insights.push({
      type: 'atencao',
      insightClass,
      title: 'ROAS Crítico - Operação em Prejuízo',
      description: `ROAS de ${atual.marketing.roasAds.toFixed(2)}x está ${((benchmarks.roasMedio - atual.marketing.roasAds) / benchmarks.roasMedio * 100).toFixed(0)}% abaixo do benchmark do setor (${benchmarks.roasMedio}x). Prejuízo operacional de R$ ${(prejuizo / 1000).toFixed(1)}K no mês.${insightClass === 'recommendation' ? ' Urgente: revisar campanhas com baixo ROI e realocar budget.' : ''}`,
      metrics: [
        { label: 'ROAS Atual', value: atual.marketing.roasAds.toFixed(2) + 'x', trend: calcularVariacao(atual.marketing.roasAds, anterior.marketing.roasAds) },
        { label: 'Benchmark', value: benchmarks.roasMedio.toFixed(2) + 'x', trend: 0 },
      ],
      blockedReason,
      basedOnMetric: 'roasAds',
    });
  }
  
  // Oportunidades - Taxa Recompra (DIAGNOSTIC → apenas signal/context, não recommendation)
  if (benchmarks.taxaRecompra && atual.clientes.taxaRecompra < benchmarks.taxaRecompra) {
    const gap = benchmarks.taxaRecompra - atual.clientes.taxaRecompra;
    const potencial = (atual.vendas.receita / atual.clientes.taxaRecompra) * gap;
    const recompraAuthority = authority.taxaRecompra;
    const clientesConfidence = temporal?.clientes.confidence || 'STABLE';
    
    // Taxa Recompra é DIAGNOSTIC, não pode gerar recommendation
    let insightClass: InsightClass = 'signal';
    let blockedReason: string | undefined;
    
    if (canGenerateAlert(recompraAuthority) && canGenerateTemporalAlert(clientesConfidence)) {
      insightClass = 'context';
      blockedReason = 'Métrica diagnóstica não tem autoridade para gerar recomendação';
    } else if (!canGenerateTemporalAlert(clientesConfidence)) {
      blockedReason = `Aguardando maturação temporal (${temporal?.clientes.label || 'dados iniciais'})`;
    } else {
      blockedReason = 'Métrica não tem autoridade para alertar';
    }
    
    insights.push({
      type: 'oportunidade',
      insightClass,
      title: 'Potencial de Reativação Não Explorado',
      description: `Taxa de recompra de ${atual.clientes.taxaRecompra}% está ${gap.toFixed(0)}pp abaixo do setor. Potencial de +R$ ${(potencial / 1000).toFixed(1)}K/mês em receita recorrente.`,
      metrics: [
        { label: 'Recompra Atual', value: atual.clientes.taxaRecompra + '%', trend: 0 },
        { label: 'Potencial', value: benchmarks.taxaRecompra + '%', trend: 0 },
      ],
      blockedReason,
      basedOnMetric: 'taxaRecompra',
    });
  }
  
  return insights;
};
