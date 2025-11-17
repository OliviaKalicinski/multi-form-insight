import { MarketingData, FollowersData, AdsData, MonthMetric, MultiMonthMetrics, ComparisonChartData, FollowersMultiMonthMetrics, AdsMultiMonthMetrics } from "@/types/marketing";
import { calculateMonthlyMetrics } from "./metricsCalculator";
import { calculateFollowersMetrics } from "./followersCalculator";
import { calculateAdsMetrics } from "./adsCalculator";

export const MONTH_COLORS = [
  "hsl(217, 91%, 60%)",  // Azul
  "hsl(142, 76%, 36%)",  // Verde
  "hsl(262, 83%, 58%)",  // Roxo
  "hsl(346, 77%, 50%)",  // Vermelho
  "hsl(43, 96%, 56%)",   // Amarelo
];

export const getMonthColor = (month: string, selectedMonths: string[]): string => {
  const index = selectedMonths.indexOf(month);
  return MONTH_COLORS[index % MONTH_COLORS.length];
};

export const formatMonthLabel = (month: string): string => {
  const [year, monthNum] = month.split("-");
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const monthIndex = parseInt(monthNum) - 1;
  return `${monthNames[monthIndex]}/${year.slice(2)}`;
};

// Calcular métricas para múltiplos meses (Marketing)
export const calculateMultiMonthMetrics = (
  data: MarketingData[],
  selectedMonths: string[]
): MultiMonthMetrics => {
  const visualizacoes: MonthMetric[] = [];
  const alcance: MonthMetric[] = [];
  const visitas: MonthMetric[] = [];
  const interacoes: MonthMetric[] = [];
  const clicks: MonthMetric[] = [];

  let bestMonth = "";
  let worstMonth = "";
  let bestValue = -Infinity;
  let worstValue = Infinity;

  selectedMonths.forEach((month, index) => {
    const monthData = data.filter(item => item.Data.startsWith(month));
    const metrics = calculateMonthlyMetrics(monthData);
    const color = getMonthColor(month, selectedMonths);
    const monthLabel = formatMonthLabel(month);

    // Calcular mudança percentual em relação ao mês anterior
    const prevIndex = index - 1;
    let percentageChange: number | undefined = undefined;
    if (prevIndex >= 0) {
      const prevMonth = selectedMonths[prevIndex];
      const prevMonthData = data.filter(item => item.Data.startsWith(prevMonth));
      const prevMetrics = calculateMonthlyMetrics(prevMonthData);
      if (prevMetrics.visualizacoesTotal > 0) {
        percentageChange = ((metrics.visualizacoesTotal - prevMetrics.visualizacoesTotal) / prevMetrics.visualizacoesTotal) * 100;
      }
    }

    visualizacoes.push({
      month,
      monthLabel,
      value: metrics.visualizacoesTotal,
      color,
      percentageChange,
    });

    alcance.push({
      month,
      monthLabel,
      value: metrics.alcanceTotal,
      color,
      percentageChange,
    });

    visitas.push({
      month,
      monthLabel,
      value: metrics.visitasTotal,
      color,
      percentageChange,
    });

    interacoes.push({
      month,
      monthLabel,
      value: metrics.interacoesTotal,
      color,
      percentageChange,
    });

    clicks.push({
      month,
      monthLabel,
      value: metrics.clicksTotal,
      color,
      percentageChange,
    });

    // Identificar melhor e pior mês baseado em visualizações
    if (metrics.visualizacoesTotal > bestValue) {
      bestValue = metrics.visualizacoesTotal;
      bestMonth = monthLabel;
    }
    if (metrics.visualizacoesTotal < worstValue) {
      worstValue = metrics.visualizacoesTotal;
      worstMonth = monthLabel;
    }
  });

  return {
    visualizacoes,
    alcance,
    visitas,
    interacoes,
    clicks,
    best: bestMonth,
    worst: worstMonth,
  };
};

// Calcular métricas para múltiplos meses (Seguidores)
export const calculateFollowersMultiMonthMetrics = (
  data: FollowersData[],
  selectedMonths: string[]
): FollowersMultiMonthMetrics => {
  const totalSeguidores: MonthMetric[] = [];
  const novosSeguidores: MonthMetric[] = [];
  const crescimento: MonthMetric[] = [];

  selectedMonths.forEach((month, index) => {
    const monthData = data.filter(item => item.Data.startsWith(month));
    const metrics = calculateFollowersMetrics(monthData, data, month);
    const color = getMonthColor(month, selectedMonths);
    const monthLabel = formatMonthLabel(month);

    let percentageChange: number | undefined = undefined;
    if (index > 0) {
      const prevMonth = selectedMonths[index - 1];
      const prevMonthData = data.filter(item => item.Data.startsWith(prevMonth));
      const prevMetrics = calculateFollowersMetrics(prevMonthData, data, prevMonth);
      if (prevMetrics.novosSeguidoresMes > 0) {
        percentageChange = ((metrics.novosSeguidoresMes - prevMetrics.novosSeguidoresMes) / prevMetrics.novosSeguidoresMes) * 100;
      }
    }

    totalSeguidores.push({
      month,
      monthLabel,
      value: metrics.totalSeguidores,
      color,
      percentageChange,
    });

    novosSeguidores.push({
      month,
      monthLabel,
      value: metrics.novosSeguidoresMes,
      color,
      percentageChange,
    });

    crescimento.push({
      month,
      monthLabel,
      value: metrics.novosSeguidoresMes,
      color,
      percentageChange,
    });
  });

  return {
    totalSeguidores,
    novosSeguidores,
    crescimento,
  };
};

// Calcular métricas para múltiplos meses (Ads)
export const calculateAdsMultiMonthMetrics = (
  data: AdsData[],
  selectedMonths: string[],
  filterFn: (data: AdsData[], month: string) => AdsData[]
): AdsMultiMonthMetrics => {
  const investimento: MonthMetric[] = [];
  const roas: MonthMetric[] = [];
  const compras: MonthMetric[] = [];
  const cpc: MonthMetric[] = [];
  const taxaConversao: MonthMetric[] = [];

  selectedMonths.forEach((month, index) => {
    const monthData = filterFn(data, month);
    const metrics = calculateAdsMetrics(monthData);
    const color = getMonthColor(month, selectedMonths);
    const monthLabel = formatMonthLabel(month);

    let percentageChange: number | undefined = undefined;
    if (index > 0) {
      const prevMonth = selectedMonths[index - 1];
      const prevMonthData = filterFn(data, prevMonth);
      const prevMetrics = calculateAdsMetrics(prevMonthData);
      if (prevMetrics.investimentoTotal > 0) {
        percentageChange = ((metrics.investimentoTotal - prevMetrics.investimentoTotal) / prevMetrics.investimentoTotal) * 100;
      }
    }

    investimento.push({
      month,
      monthLabel,
      value: metrics.investimentoTotal,
      color,
      percentageChange,
    });

    roas.push({
      month,
      monthLabel,
      value: metrics.roas,
      color,
      percentageChange,
    });

    compras.push({
      month,
      monthLabel,
      value: metrics.comprasTotal,
      color,
      percentageChange,
    });

    cpc.push({
      month,
      monthLabel,
      value: metrics.cpcMedio,
      color,
      percentageChange,
    });

    taxaConversao.push({
      month,
      monthLabel,
      value: metrics.taxaConversao,
      color,
      percentageChange,
    });
  });

  return {
    investimento,
    roas,
    compras,
    cpc,
    taxaConversao,
  };
};

// Preparar dados para gráficos comparativos (Marketing)
export const prepareMarketingComparisonChartData = (
  data: MarketingData[],
  selectedMonths: string[],
  metric: string
): ComparisonChartData[] => {
  const chartDataMap = new Map<string, any>();

  selectedMonths.forEach((month) => {
    const monthData = data.filter(item => item.Data.startsWith(month));
    const monthLabel = formatMonthLabel(month);

    monthData.forEach((item) => {
      const day = item.Data.substring(8, 10);
      
      if (!chartDataMap.has(day)) {
        chartDataMap.set(day, { dia: day });
      }

      const entry = chartDataMap.get(day);
      let value = 0;

      switch (metric) {
        case "visualizacoes":
          value = parseInt(item.Visualizações);
          break;
        case "alcance":
          value = parseInt(item.Alcance);
          break;
        case "visitas":
          value = parseInt(item.Visitas);
          break;
        case "interacoes":
          value = parseInt(item.Interações);
          break;
        case "clicks":
          value = parseInt(item["Clicks no Link"]);
          break;
      }

      entry[monthLabel] = value;
    });
  });

  return Array.from(chartDataMap.values()).sort((a, b) => 
    parseInt(a.dia) - parseInt(b.dia)
  );
};

// Preparar dados para gráficos comparativos (Seguidores)
export const prepareFollowersComparisonChartData = (
  data: FollowersData[],
  selectedMonths: string[]
): ComparisonChartData[] => {
  const chartDataMap = new Map<string, any>();

  selectedMonths.forEach((month) => {
    const monthData = data.filter(item => item.Data.startsWith(month));
    const monthLabel = formatMonthLabel(month);

    // Calcular acumulado para cada dia do mês
    let accumulated = 0;
    const allDataUpToMonth = data.filter(item => item.Data <= `${month}-31`);
    const baseAccumulated = allDataUpToMonth
      .filter(item => !item.Data.startsWith(month))
      .reduce((sum, item) => sum + parseInt(item.Seguidores), 0);

    monthData.forEach((item) => {
      const day = item.Data.substring(8, 10);
      accumulated += parseInt(item.Seguidores);
      
      if (!chartDataMap.has(day)) {
        chartDataMap.set(day, { dia: day });
      }

      const entry = chartDataMap.get(day);
      entry[monthLabel] = baseAccumulated + accumulated;
    });
  });

  return Array.from(chartDataMap.values()).sort((a, b) => 
    parseInt(a.dia) - parseInt(b.dia)
  );
};

// Calcular métricas de comparação para vendas
export const calculateComparisonMetrics = (
  orders: any[], // ProcessedOrder
  selectedMonths: string[],
  availableMonths: string[]
): {
  revenue: MonthMetric[];
  averageTicket: MonthMetric[];
  totalOrders: MonthMetric[];
  totalCustomers: MonthMetric[];
} => {
  const revenue: MonthMetric[] = [];
  const averageTicket: MonthMetric[] = [];
  const totalOrders: MonthMetric[] = [];
  const totalCustomers: MonthMetric[] = [];

  selectedMonths.forEach((month, index) => {
    const { filterOrdersByMonth } = require("./salesCalculator");
    const { calculateFinancialMetrics } = require("./financialMetrics");
    const { format: formatDate, parse } = require("date-fns");
    const { ptBR } = require("date-fns/locale");
    
    const filteredOrders = filterOrdersByMonth(orders, month, availableMonths);
    const metrics = calculateFinancialMetrics(filteredOrders, month);
    
    // Calcular total de clientes únicos
    const uniqueCustomers = new Set(filteredOrders.map((order: any) => order.cpfCnpj)).size;
    
    if (metrics) {
      const monthLabel = formatDate(
        parse(month, "yyyy-MM", new Date()), 
        "MMM yyyy", 
        { locale: ptBR }
      );
      
      const SALES_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
      const color = SALES_COLORS[index % SALES_COLORS.length];

      revenue.push({
        month,
        monthLabel,
        value: metrics.faturamentoTotal,
        color,
      });

      averageTicket.push({
        month,
        monthLabel,
        value: metrics.ticketMedio,
        color,
      });

      totalOrders.push({
        month,
        monthLabel,
        value: metrics.totalPedidos,
        color,
      });

      totalCustomers.push({
        month,
        monthLabel,
        value: uniqueCustomers,
        color,
      });
    }
  });

  // Calcular variação percentual em relação ao primeiro mês
  if (revenue.length > 1) {
    const baseRevenue = revenue[0].value;
    revenue.forEach((item, idx) => {
      if (idx > 0) {
        item.percentageChange = ((item.value - baseRevenue) / baseRevenue) * 100;
      }
    });

    const baseTicket = averageTicket[0].value;
    averageTicket.forEach((item, idx) => {
      if (idx > 0) {
        item.percentageChange = ((item.value - baseTicket) / baseTicket) * 100;
      }
    });

    const baseOrders = totalOrders[0].value;
    totalOrders.forEach((item, idx) => {
      if (idx > 0) {
        item.percentageChange = ((item.value - baseOrders) / baseOrders) * 100;
      }
    });

    const baseCustomers = totalCustomers[0].value;
    totalCustomers.forEach((item, idx) => {
      if (idx > 0) {
        item.percentageChange = ((item.value - baseCustomers) / baseCustomers) * 100;
      }
    });
  }

  return {
    revenue,
    averageTicket,
    totalOrders,
    totalCustomers,
  };
};
