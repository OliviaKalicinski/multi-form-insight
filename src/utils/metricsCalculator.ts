import { MarketingData, MonthlyMetrics, GrowthMetrics } from "@/types/marketing";

export const calculateMonthlyMetrics = (data: MarketingData[]): MonthlyMetrics => {
  const visualizacoesTotal = data.reduce((sum, item) => sum + parseInt(item.Visualizações), 0);
  const alcanceTotal = data.reduce((sum, item) => sum + parseInt(item.Alcance), 0);
  const visitasTotal = data.reduce((sum, item) => sum + parseInt(item.Visitas), 0);
  const interacoesTotal = data.reduce((sum, item) => sum + parseInt(item.Interações), 0);
  const clicksTotal = data.reduce((sum, item) => sum + parseInt(item["Clicks no Link"]), 0);

  const taxaAlcanceVisita = alcanceTotal > 0 ? (visitasTotal / alcanceTotal) * 100 : 0;
  const taxaEngajamento = alcanceTotal > 0 ? (interacoesTotal / alcanceTotal) * 100 : 0;

  return {
    visualizacoesTotal,
    alcanceTotal,
    visitasTotal,
    interacoesTotal,
    clicksTotal,
    taxaAlcanceVisita,
    taxaEngajamento,
  };
};

export const calculateGrowthMetrics = (
  currentMonth: MarketingData[],
  previousMonth: MarketingData[]
): GrowthMetrics => {
  const currentMetrics = calculateMonthlyMetrics(currentMonth);
  const previousMetrics = calculateMonthlyMetrics(previousMonth);

  const crescimentoVisualizacoes =
    previousMetrics.visualizacoesTotal > 0
      ? ((currentMetrics.visualizacoesTotal - previousMetrics.visualizacoesTotal) / previousMetrics.visualizacoesTotal) * 100
      : 0;

  const crescimentoAlcance =
    previousMetrics.alcanceTotal > 0
      ? ((currentMetrics.alcanceTotal - previousMetrics.alcanceTotal) / previousMetrics.alcanceTotal) * 100
      : 0;

  const crescimentoVisitas =
    previousMetrics.visitasTotal > 0
      ? ((currentMetrics.visitasTotal - previousMetrics.visitasTotal) / previousMetrics.visitasTotal) * 100
      : 0;

  return {
    crescimentoVisualizacoes,
    crescimentoAlcance,
    crescimentoVisitas,
  };
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("pt-BR").format(num);
};

export const formatPercentage = (num: number): string => {
  return `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
};
