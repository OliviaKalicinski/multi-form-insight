import { MarketingData, MonthlyMetrics, GrowthMetrics } from "@/types/marketing";

// Helper: parseInt seguro (evita NaN)
const safeInt = (v?: string): number => {
  const n = parseInt((v ?? "0").trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

export const calculateMonthlyMetrics = (data: MarketingData[]): MonthlyMetrics => {
  const visualizacoesTotal = data.reduce((sum, item) => sum + safeInt(item.Visualizações), 0);
  const alcanceTotal = data.reduce((sum, item) => sum + safeInt(item.Alcance), 0);
  const visitasTotal = data.reduce((sum, item) => sum + safeInt(item.Visitas), 0);
  const interacoesTotal = data.reduce((sum, item) => sum + safeInt(item.Interações), 0);
  const clicksTotal = data.reduce((sum, item) => sum + safeInt(item["Clicks no Link"]), 0);

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

export const extractDailyValues = (
  data: MarketingData[], 
  metric: 'visualizacoes' | 'alcance' | 'visitas' | 'interacoes' | 'clicks'
): { date: string; value: number }[] => {
  return data.map(item => {
    let value = 0;
    switch(metric) {
      case 'visualizacoes': value = safeInt(item.Visualizações); break;
      case 'alcance': value = safeInt(item.Alcance); break;
      case 'visitas': value = safeInt(item.Visitas); break;
      case 'interacoes': value = safeInt(item.Interações); break;
      case 'clicks': value = safeInt(item["Clicks no Link"]); break;
    }
    return { date: item.Data.substring(0, 10), value };
  });
};
