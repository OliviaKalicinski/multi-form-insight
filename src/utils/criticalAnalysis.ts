import { ExecutiveMetrics, HealthScore, MonthComparison, QuarterlyAnalysis, TrendInsight } from "@/types/executive";
import { benchmarksPetFood } from "@/data/executiveData";

// Calcular variação MoM
export const calcularVariacao = (atual: number, anterior: number): number => {
  if (anterior === 0) return 0;
  return ((atual - anterior) / anterior) * 100;
};

// Calcular Health Score
export const calcularHealthScore = (metrics: ExecutiveMetrics): HealthScore => {
  const scores = {
    marketing: calcularScoreMarketing(metrics.marketing),
    vendas: calcularScoreVendas(metrics.vendas),
    clientes: calcularScoreClientes(metrics.clientes),
    produtos: calcularScoreProdutos(metrics.produtos),
    operacoes: calcularScoreOperacoes(metrics.operacoes),
  };
  
  const overall = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) / 5
  );
  
  let status: HealthScore['status'];
  if (overall >= 80) status = 'excellent';
  else if (overall >= 60) status = 'good';
  else if (overall >= 40) status = 'warning';
  else status = 'critical';
  
  return { overall, breakdown: scores, status };
};

const calcularScoreMarketing = (marketing: ExecutiveMetrics['marketing']): number => {
  let score = 0;
  
  // ROAS (40 pontos)
  const roasScore = Math.min((marketing.roasAds / benchmarksPetFood.roasMedio) * 40, 40);
  score += roasScore;
  
  // CTR (30 pontos)
  const ctrScore = Math.min((marketing.ctr / benchmarksPetFood.ctr) * 30, 30);
  score += ctrScore;
  
  // CPC (30 pontos)
  const cpcScore = Math.min((benchmarksPetFood.cpc / marketing.cpc) * 30, 30);
  score += cpcScore;
  
  return Math.round(score);
};

const calcularScoreVendas = (vendas: ExecutiveMetrics['vendas']): number => {
  let score = 0;
  
  // Conversão (50 pontos)
  const conversaoScore = Math.min((vendas.conversao / benchmarksPetFood.taxaConversao) * 50, 50);
  score += conversaoScore;
  
  // Ticket Médio (50 pontos)
  const ticketScore = Math.min((vendas.ticketMedioReal / benchmarksPetFood.ticketMedio) * 50, 50);
  score += ticketScore;
  
  return Math.round(score);
};

const calcularScoreClientes = (clientes: ExecutiveMetrics['clientes']): number => {
  let score = 0;
  
  // Taxa de Recompra (40 pontos)
  const recompraScore = Math.min((clientes.taxaRecompra / benchmarksPetFood.taxaRecompra) * 40, 40);
  score += recompraScore;
  
  // Taxa de Churn (invertida - 40 pontos)
  const churnScore = Math.min((benchmarksPetFood.taxaChurn / clientes.taxaChurn) * 40, 40);
  score += churnScore;
  
  // LTV (20 pontos)
  const ltvScore = Math.min((clientes.ltv / benchmarksPetFood.ltv) * 20, 20);
  score += ltvScore;
  
  return Math.round(score);
};

const calcularScoreProdutos = (produtos: ExecutiveMetrics['produtos']): number => {
  let score = 0;
  
  // Margem (60 pontos)
  const margemScore = Math.min((produtos.margemMedia / benchmarksPetFood.margemLiquida) * 60, 60);
  score += margemScore;
  
  // Diversificação (40 pontos)
  const diversificacaoScore = Math.min((produtos.sku / 50) * 40, 40);
  score += diversificacaoScore;
  
  return Math.round(score);
};

const calcularScoreOperacoes = (operacoes: ExecutiveMetrics['operacoes']): number => {
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

// Gerar insights principais
export const gerarInsights = (
  atual: ExecutiveMetrics,
  anterior: ExecutiveMetrics,
  healthScore: HealthScore
): TrendInsight[] => {
  const insights: TrendInsight[] = [];
  
  // Sucessos
  if (atual.vendas.pedidos > anterior.vendas.pedidos) {
    const crescimento = calcularVariacao(atual.vendas.pedidos, anterior.vendas.pedidos);
    insights.push({
      type: 'sucesso',
      title: 'Volume de Pedidos em Alta',
      description: `Total de pedidos cresceu ${crescimento.toFixed(1)}% vs mês anterior, indicando expansão da base de clientes. Mantenha a estratégia atual de aquisição.`,
      metrics: [
        { label: 'Pedidos Atual', value: atual.vendas.pedidos.toString(), trend: crescimento },
        { label: 'Pedidos Anterior', value: anterior.vendas.pedidos.toString(), trend: 0 },
      ],
    });
  }
  
  // Atenções
  if (atual.marketing.roasAds < 0.8) {
    const prejuizo = atual.marketing.investimentoAds - atual.marketing.receitaAds;
    insights.push({
      type: 'atencao',
      title: 'ROAS Crítico - Operação em Prejuízo',
      description: `ROAS de ${atual.marketing.roasAds.toFixed(2)}x está ${((benchmarksPetFood.roasMedio - atual.marketing.roasAds) / benchmarksPetFood.roasMedio * 100).toFixed(0)}% abaixo do benchmark do setor (${benchmarksPetFood.roasMedio}x). Prejuízo operacional de R$ ${(prejuizo / 1000).toFixed(1)}K no mês. Urgente: revisar campanhas com baixo ROI e realocar budget.`,
      metrics: [
        { label: 'ROAS Atual', value: atual.marketing.roasAds.toFixed(2) + 'x', trend: calcularVariacao(atual.marketing.roasAds, anterior.marketing.roasAds) },
        { label: 'Benchmark', value: benchmarksPetFood.roasMedio.toFixed(2) + 'x', trend: 0 },
      ],
    });
  }
  
  // Oportunidades
  if (atual.clientes.taxaRecompra < benchmarksPetFood.taxaRecompra) {
    const gap = benchmarksPetFood.taxaRecompra - atual.clientes.taxaRecompra;
    const potencial = (atual.vendas.receita / atual.clientes.taxaRecompra) * gap;
    insights.push({
      type: 'oportunidade',
      title: 'Potencial de Reativação Não Explorado',
      description: `Taxa de recompra de ${atual.clientes.taxaRecompra}% está ${gap.toFixed(0)}pp abaixo do setor. Implementar programa de fidelidade + email marketing pode gerar +R$ ${(potencial / 1000).toFixed(1)}K/mês em receita recorrente.`,
      metrics: [
        { label: 'Recompra Atual', value: atual.clientes.taxaRecompra + '%', trend: 0 },
        { label: 'Potencial', value: benchmarksPetFood.taxaRecompra + '%', trend: 0 },
      ],
    });
  }
  
  return insights;
};
