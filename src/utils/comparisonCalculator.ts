import { MarketingData, FollowersData, AdsData, MonthMetric, MultiMonthMetrics, ComparisonChartData, FollowersMultiMonthMetrics, AdsMultiMonthMetrics } from "@/types/marketing";
import { calculateMonthlyMetrics } from "./metricsCalculator";
import { calculateFollowersMetrics } from "./followersCalculator";
import { calculateAdsMetrics } from "./adsCalculator";
import { filterOrdersByMonth } from "./salesCalculator";
import { calculateFinancialMetrics } from "./financialMetrics";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

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

    // Calcular métricas do mês anterior
    const prevIndex = index - 1;
    let prevMetrics = null;
    if (prevIndex >= 0) {
      const prevMonth = selectedMonths[prevIndex];
      const prevMonthData = data.filter(item => item.Data.startsWith(prevMonth));
      prevMetrics = calculateMonthlyMetrics(prevMonthData);
    }

    // VISUALIZAÇÕES - cálculo específico
    let visualizacoesChange: number | undefined = undefined;
    if (prevMetrics && prevMetrics.visualizacoesTotal > 0) {
      visualizacoesChange = ((metrics.visualizacoesTotal - prevMetrics.visualizacoesTotal) / prevMetrics.visualizacoesTotal) * 100;
    }

    visualizacoes.push({
      month,
      monthLabel,
      value: metrics.visualizacoesTotal,
      color,
      percentageChange: visualizacoesChange,
    });

    // ALCANCE - cálculo específico
    let alcanceChange: number | undefined = undefined;
    if (prevMetrics && prevMetrics.alcanceTotal > 0) {
      alcanceChange = ((metrics.alcanceTotal - prevMetrics.alcanceTotal) / prevMetrics.alcanceTotal) * 100;
    }

    alcance.push({
      month,
      monthLabel,
      value: metrics.alcanceTotal,
      color,
      percentageChange: alcanceChange,
    });

    // VISITAS - cálculo específico
    let visitasChange: number | undefined = undefined;
    if (prevMetrics && prevMetrics.visitasTotal > 0) {
      visitasChange = ((metrics.visitasTotal - prevMetrics.visitasTotal) / prevMetrics.visitasTotal) * 100;
    }

    visitas.push({
      month,
      monthLabel,
      value: metrics.visitasTotal,
      color,
      percentageChange: visitasChange,
    });

    // INTERAÇÕES - cálculo específico
    let interacoesChange: number | undefined = undefined;
    if (prevMetrics && prevMetrics.interacoesTotal > 0) {
      interacoesChange = ((metrics.interacoesTotal - prevMetrics.interacoesTotal) / prevMetrics.interacoesTotal) * 100;
    }

    interacoes.push({
      month,
      monthLabel,
      value: metrics.interacoesTotal,
      color,
      percentageChange: interacoesChange,
    });

    // CLICKS - cálculo específico
    let clicksChange: number | undefined = undefined;
    if (prevMetrics && prevMetrics.clicksTotal > 0) {
      clicksChange = ((metrics.clicksTotal - prevMetrics.clicksTotal) / prevMetrics.clicksTotal) * 100;
    }

    clicks.push({
      month,
      monthLabel,
      value: metrics.clicksTotal,
      color,
      percentageChange: clicksChange,
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

// Calcular métricas de seguidores para múltiplos meses
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

    // Calcular métricas do mês anterior
    const prevIndex = index - 1;
    let prevMetrics = null;
    if (prevIndex >= 0) {
      const prevMonth = selectedMonths[prevIndex];
      const prevMonthData = data.filter(item => item.Data.startsWith(prevMonth));
      prevMetrics = calculateFollowersMetrics(prevMonthData, data, prevMonth);
    }

    // TOTAL DE SEGUIDORES - cálculo específico
    let totalSeguidoresChange: number | undefined = undefined;
    if (prevMetrics && prevMetrics.totalSeguidores > 0) {
      totalSeguidoresChange = ((metrics.totalSeguidores - prevMetrics.totalSeguidores) / prevMetrics.totalSeguidores) * 100;
    }

    totalSeguidores.push({
      month,
      monthLabel,
      value: metrics.totalSeguidores,
      color,
      percentageChange: totalSeguidoresChange,
    });

    // NOVOS SEGUIDORES - cálculo específico
    let novosSeguidoresChange: number | undefined = undefined;
    if (prevMetrics && prevMetrics.novosSeguidoresMes > 0) {
      novosSeguidoresChange = ((metrics.novosSeguidoresMes - prevMetrics.novosSeguidoresMes) / prevMetrics.novosSeguidoresMes) * 100;
    }

    novosSeguidores.push({
      month,
      monthLabel,
      value: metrics.novosSeguidoresMes,
      color,
      percentageChange: novosSeguidoresChange,
    });

    // CRESCIMENTO - já é um percentual, não precisa comparar com mês anterior
    crescimento.push({
      month,
      monthLabel,
      value: metrics.crescimentoPercentual,
      color,
      percentageChange: undefined,
    });
  });

  return {
    totalSeguidores,
    novosSeguidores,
    crescimento,
  };
};

// Calcular métricas de anúncios para múltiplos meses
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

    // Calcular métricas do mês anterior
    const prevIndex = index - 1;
    let prevMetrics = null;
    if (prevIndex >= 0) {
      const prevMonth = selectedMonths[prevIndex];
      const prevMonthData = filterFn(data, prevMonth);
      prevMetrics = calculateAdsMetrics(prevMonthData);
    }

    // INVESTIMENTO - cálculo específico
    let investimentoChange: number | undefined = undefined;
    if (prevMetrics && prevMetrics.investimentoTotal > 0) {
      investimentoChange = ((metrics.investimentoTotal - prevMetrics.investimentoTotal) / prevMetrics.investimentoTotal) * 100;
    }

    investimento.push({
      month,
      monthLabel,
      value: metrics.investimentoTotal,
      color,
      percentageChange: investimentoChange,
    });

    // ROAS - cálculo específico
    let roasChange: number | undefined = undefined;
    if (prevMetrics && prevMetrics.roas > 0) {
      roasChange = ((metrics.roas - prevMetrics.roas) / prevMetrics.roas) * 100;
    }

    roas.push({
      month,
      monthLabel,
      value: metrics.roas,
      color,
      percentageChange: roasChange,
    });

    // COMPRAS - cálculo específico
    let comprasChange: number | undefined = undefined;
    if (prevMetrics && prevMetrics.comprasTotal > 0) {
      comprasChange = ((metrics.comprasTotal - prevMetrics.comprasTotal) / prevMetrics.comprasTotal) * 100;
    }

    compras.push({
      month,
      monthLabel,
      value: metrics.comprasTotal,
      color,
      percentageChange: comprasChange,
    });

    // CPC - cálculo específico
    let cpcChange: number | undefined = undefined;
    if (prevMetrics && prevMetrics.cpcMedio > 0) {
      cpcChange = ((metrics.cpcMedio - prevMetrics.cpcMedio) / prevMetrics.cpcMedio) * 100;
    }

    cpc.push({
      month,
      monthLabel,
      value: metrics.cpcMedio,
      color,
      percentageChange: cpcChange,
    });

    // TAXA DE CONVERSÃO - cálculo específico
    let taxaConversaoChange: number | undefined = undefined;
    if (prevMetrics && prevMetrics.taxaConversao > 0) {
      taxaConversaoChange = ((metrics.taxaConversao - prevMetrics.taxaConversao) / prevMetrics.taxaConversao) * 100;
    }

    taxaConversao.push({
      month,
      monthLabel,
      value: metrics.taxaConversao,
      color,
      percentageChange: taxaConversaoChange,
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

// Preparar dados de comparação para gráficos de marketing
export const prepareMarketingComparisonChartData = (
  data: MarketingData[],
  selectedMonths: string[],
  metric: string
): ComparisonChartData[] => {
  const dataByDay = new Map<string, any>();

  selectedMonths.forEach((month, index) => {
    const monthData = data.filter(item => item.Data.startsWith(month));
    const color = getMonthColor(month, selectedMonths);
    const monthLabel = formatMonthLabel(month);

    monthData.forEach(item => {
      const date = new Date(item.Data);
      const day = date.getDate();
      const dayKey = `Dia ${day}`;

      if (!dataByDay.has(dayKey)) {
        dataByDay.set(dayKey, { dia: dayKey });
      }

      const dayData = dataByDay.get(dayKey);
      
      let value = 0;
      switch (metric) {
        case "Visualizações":
          value = parseInt(item.Visualizações.replace(/\./g, ''));
          break;
        case "Alcance":
          value = parseInt(item.Alcance.replace(/\./g, ''));
          break;
        case "Visitas":
          value = parseInt(item.Visitas.replace(/\./g, ''));
          break;
        case "Interações":
          value = parseInt(item.Interações.replace(/\./g, ''));
          break;
        case "Clicks":
          value = parseInt(item["Clicks no Link"].replace(/\./g, ''));
          break;
      }

      dayData[monthLabel] = value;
    });
  });

  return Array.from(dataByDay.values()).sort((a, b) => {
    const dayA = parseInt(a.dia.replace("Dia ", ""));
    const dayB = parseInt(b.dia.replace("Dia ", ""));
    return dayA - dayB;
  });
};

// Preparar dados de comparação para gráficos de seguidores
export const prepareFollowersComparisonChartData = (
  data: FollowersData[],
  selectedMonths: string[]
): ComparisonChartData[] => {
  const dataByDay = new Map<string, any>();

  selectedMonths.forEach((month, index) => {
    const monthData = data.filter(item => item.Data.startsWith(month));
    const color = getMonthColor(month, selectedMonths);
    const monthLabel = formatMonthLabel(month);

    // Calcular seguidores acumulados por dia
    let cumulativeFollowers = 0;
    monthData.forEach(item => {
      const date = new Date(item.Data);
      const day = date.getDate();
      const dayKey = `Dia ${day}`;

      const followers = parseInt(item.Seguidores.replace(/\./g, ''));
      cumulativeFollowers = followers;

      if (!dataByDay.has(dayKey)) {
        dataByDay.set(dayKey, { dia: dayKey });
      }

      const dayData = dataByDay.get(dayKey);
      dayData[monthLabel] = cumulativeFollowers;
    });
  });

  return Array.from(dataByDay.values()).sort((a, b) => {
    const dayA = parseInt(a.dia.replace("Dia ", ""));
    const dayB = parseInt(b.dia.replace("Dia ", ""));
    return dayA - dayB;
  });
};

// Calcular métricas de comparação para vendas
export const calculateComparisonMetrics = (
  orders: any[],
  selectedMonths: string[],
  availableMonths: string[]
): {
  revenue: MonthMetric[];
  averageTicket: MonthMetric[];
  totalOrders: MonthMetric[];
  totalCustomers: MonthMetric[];
  averageProducts: MonthMetric[];
} => {
  const revenue: MonthMetric[] = [];
  const averageTicket: MonthMetric[] = [];
  const totalOrders: MonthMetric[] = [];
  const totalCustomers: MonthMetric[] = [];
  const averageProducts: MonthMetric[] = [];

  const SALES_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  selectedMonths.forEach((month, index) => {
    const filteredOrders = filterOrdersByMonth(orders, month, availableMonths);
    const metrics = calculateFinancialMetrics(filteredOrders, month);
    
    const uniqueCustomers = new Set(filteredOrders.map((order: any) => order.cpfCnpj)).size;
    
    if (metrics) {
      const monthLabel = format(
        parse(month, "yyyy-MM", new Date()), 
        "MMM yyyy", 
        { locale: ptBR }
      );
      
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

      averageProducts.push({
        month,
        monthLabel,
        value: metrics.produtoMedio,
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

    const baseProducts = averageProducts[0].value;
    averageProducts.forEach((item, idx) => {
      if (idx > 0) {
        item.percentageChange = ((item.value - baseProducts) / baseProducts) * 100;
      }
    });
  }

  return {
    revenue,
    averageTicket,
    totalOrders,
    totalCustomers,
    averageProducts,
  };
};
