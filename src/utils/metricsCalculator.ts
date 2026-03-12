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
  const taxaVisitaClique = visitasTotal > 0 ? (clicksTotal / visitasTotal) * 100 : 0;

  return {
    visualizacoesTotal,
    alcanceTotal,
    visitasTotal,
    interacoesTotal,
    clicksTotal,
    taxaAlcanceVisita,
    taxaEngajamento,
    taxaVisitaClique,
  };
};

export const calculateGrowthMetrics = (
  currentMonth: MarketingData[],
  previousMonth: MarketingData[],
): GrowthMetrics => {
  const currentMetrics = calculateMonthlyMetrics(currentMonth);
  const previousMetrics = calculateMonthlyMetrics(previousMonth);

  const crescimentoVisualizacoes =
    previousMetrics.visualizacoesTotal > 0
      ? ((currentMetrics.visualizacoesTotal - previousMetrics.visualizacoesTotal) /
          previousMetrics.visualizacoesTotal) *
        100
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
  metric: "visualizacoes" | "alcance" | "visitas" | "interacoes" | "clicks",
): { date: string; value: number }[] => {
  return data.map((item) => {
    let value = 0;
    switch (metric) {
      case "visualizacoes":
        value = safeInt(item.Visualizações);
        break;
      case "alcance":
        value = safeInt(item.Alcance);
        break;
      case "visitas":
        value = safeInt(item.Visitas);
        break;
      case "interacoes":
        value = safeInt(item.Interações);
        break;
      case "clicks":
        value = safeInt(item["Clicks no Link"]);
        break;
    }
    return { date: item.Data.substring(0, 10), value };
  });
};

// ── Instagram Funnel ──────────────────────────────────────────────────────────

export interface FunnelStep {
  label: string;
  value: number;
  rate: number | null; // % vs step anterior
  color: string;
}

export function buildInstagramFunnel(data: import("@/types/marketing").MarketingData[]): FunnelStep[] {
  if (!data.length) return [];

  const impressoes = data.reduce((s, d) => s + safeInt(d.Visualizações), 0);
  const alcance = data.reduce((s, d) => s + safeInt(d.Alcance), 0);
  const visitas = data.reduce((s, d) => s + safeInt(d.Visitas), 0);
  const interacoes = data.reduce((s, d) => s + safeInt(d.Interações), 0);
  const cliques = data.reduce((s, d) => s + safeInt(d["Clicks no Link"]), 0);

  const steps = [
    { label: "Impressões", value: impressoes },
    { label: "Alcance", value: alcance },
    { label: "Visitas ao Perfil", value: visitas },
    { label: "Interações", value: interacoes },
    { label: "Cliques no Link", value: cliques },
  ];

  const colors = [
    "hsl(var(--chart-4))",
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-5))",
  ];

  return steps.map((step, i) => ({
    ...step,
    color: colors[i],
    rate: i === 0 || steps[i - 1].value === 0 ? null : (step.value / steps[i - 1].value) * 100,
  }));
}

// ── Historical Benchmarks ─────────────────────────────────────────────────────

export interface HistoricalBenchmark {
  metric: string;
  currentValue: number;
  avg3months: number;
  avg6months: number;
  vsAvg3: number; // % difference
  vsAvg6: number;
}

export function calculateHistoricalBenchmarks(
  allData: import("@/types/marketing").MarketingData[],
  currentMonth: string, // "YYYY-MM"
): HistoricalBenchmark[] {
  if (!allData.length) return [];

  const getMonthData = (month: string) => allData.filter((d) => d.Data.startsWith(month));

  const sumMetric = (
    data: import("@/types/marketing").MarketingData[],
    key: keyof import("@/types/marketing").MarketingData,
  ) => data.reduce((s, d) => s + safeInt(d[key]), 0);

  // Build last N months before currentMonth
  const getPastMonths = (n: number): string[] => {
    const [y, m] = currentMonth.split("-").map(Number);
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(y, m - 2 - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  };

  const months3 = getPastMonths(3);
  const months6 = getPastMonths(6);

  const avg = (months: string[], key: keyof import("@/types/marketing").MarketingData) => {
    const totals = months.map((mo) => sumMetric(getMonthData(mo), key)).filter((v) => v > 0);
    return totals.length > 0 ? totals.reduce((s, v) => s + v, 0) / totals.length : 0;
  };

  const currentData = getMonthData(currentMonth);

  const metrics: { label: string; key: keyof import("@/types/marketing").MarketingData }[] = [
    { label: "Visualizações", key: "Visualizações" },
    { label: "Alcance", key: "Alcance" },
    { label: "Visitas", key: "Visitas" },
    { label: "Interações", key: "Interações" },
    { label: "Cliques no Link", key: "Clicks no Link" },
  ];

  return metrics.map(({ label, key }) => {
    const currentValue = sumMetric(currentData, key);
    const avg3 = avg(months3, key);
    const avg6 = avg(months6, key);
    return {
      metric: label,
      currentValue,
      avg3months: Math.round(avg3),
      avg6months: Math.round(avg6),
      vsAvg3: avg3 > 0 ? ((currentValue - avg3) / avg3) * 100 : 0,
      vsAvg6: avg6 > 0 ? ((currentValue - avg6) / avg6) * 100 : 0,
    };
  });
}
