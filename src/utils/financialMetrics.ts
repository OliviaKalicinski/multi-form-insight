import { format, parse, startOfMonth, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProcessedOrder, FinancialMetrics, SeasonalityAnalysis, OrderValueDistribution, PlatformPerformance, ProductRevenueData } from "@/types/marketing";
import { extractDailyOrders } from './salesCalculator';
import { breakdownOrders } from './orderBreakdown';

/**
 * Filtra pedidos que contêm APENAS Kit de Amostras
 * Retorna apenas pedidos com produtos reais (não apenas R$ 0,01)
 */
const filterRealOrders = (orders: ProcessedOrder[]): ProcessedOrder[] => {
  return orders.filter(order => {
    // Verificar se o pedido tem outros produtos além de Kit de Amostras
    const nonSampleProducts = order.produtos.filter(
      p => p.descricaoAjustada !== 'Kit de Amostras'
    );
    
    // Manter pedido se tiver pelo menos 1 produto que não seja Kit de Amostras
    return nonSampleProducts.length > 0;
  });
};

/**
 * Calcula faturamento total por período (dia/mês/ano)
 */
export const calculateRevenueByPeriod = (
  orders: ProcessedOrder[],
  periodType: 'day' | 'month' | 'year'
): { period: string; revenue: number }[] => {
  const revenueMap = new Map<string, number>();

  orders.forEach((order) => {
    let periodKey: string;
    switch (periodType) {
      case 'day':
        periodKey = format(order.dataVenda, "yyyy-MM-dd");
        break;
      case 'month':
        periodKey = format(order.dataVenda, "yyyy-MM");
        break;
      case 'year':
        periodKey = format(order.dataVenda, "yyyy");
        break;
    }
    revenueMap.set(periodKey, (revenueMap.get(periodKey) || 0) + order.valorTotal);
  });

  return Array.from(revenueMap.entries())
    .map(([period, revenue]) => ({ period, revenue }))
    .sort((a, b) => a.period.localeCompare(b.period));
};

/**
 * Calcula evolução do faturamento ao longo do tempo
 */
export const calculateRevenueEvolution = (
  orders: ProcessedOrder[]
): { date: string; revenue: number; cumulativeRevenue: number }[] => {
  const dailyRevenue = calculateRevenueByPeriod(orders, 'day');
  
  let cumulative = 0;
  return dailyRevenue.map((item) => {
    cumulative += item.revenue;
    return {
      date: format(parse(item.period, "yyyy-MM-dd", new Date()), "dd/MM", { locale: ptBR }),
      revenue: item.revenue,
      cumulativeRevenue: cumulative,
    };
  });
};

/**
 * Calcula volume de pedidos agregado por mês
 */
export const calculateMonthlyOrders = (
  orders: ProcessedOrder[]
): { month: string; orders: number }[] => {
  const monthlyMap = new Map<string, number>();
  
  orders.forEach(order => {
    const monthKey = format(order.dataVenda, "yyyy-MM");
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
  });
  
  return Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, orders]) => ({
      month: format(parse(month, "yyyy-MM", new Date()), "MMM/yy", { locale: ptBR }),
      orders
    }));
};

/**
 * Analisa sazonalidade nas vendas
 */
export const analyzeSeasonality = (orders: ProcessedOrder[]): SeasonalityAnalysis => {
  // Agrupar por mês
  const monthlyMap = new Map<string, { revenue: number; orders: number }>();
  orders.forEach((order) => {
    const monthKey = format(order.dataVenda, "yyyy-MM");
    const existing = monthlyMap.get(monthKey) || { revenue: 0, orders: 0 };
    monthlyMap.set(monthKey, {
      revenue: existing.revenue + order.valorTotal,
      orders: existing.orders + 1,
    });
  });

  const monthly = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      monthLabel: format(parse(month, "yyyy-MM", new Date()), "MMM yyyy", { locale: ptBR }),
      revenue: data.revenue,
      orders: data.orders,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Agrupar por trimestre
  const quarterlyMap = new Map<string, { revenue: number; orders: number }>();
  orders.forEach((order) => {
    const date = order.dataVenda;
    const year = format(date, "yyyy");
    const month = date.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    const quarterKey = `${year}-Q${quarter}`;
    
    const existing = quarterlyMap.get(quarterKey) || { revenue: 0, orders: 0 };
    quarterlyMap.set(quarterKey, {
      revenue: existing.revenue + order.valorTotal,
      orders: existing.orders + 1,
    });
  });

  const quarterly = Array.from(quarterlyMap.entries())
    .map(([quarter, data]) => ({
      quarter,
      revenue: data.revenue,
      orders: data.orders,
    }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter));

  // Identificar melhor e pior mês
  const sortedByRevenue = [...monthly].sort((a, b) => b.revenue - a.revenue);
  const bestMonth = sortedByRevenue[0]?.monthLabel || "N/A";
  const worstMonth = sortedByRevenue[sortedByRevenue.length - 1]?.monthLabel || "N/A";

  // Calcular índice de sazonalidade (desvio padrão / média)
  const revenues = monthly.map((m) => m.revenue);
  const avgRevenue = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
  const variance = revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / revenues.length;
  const stdDev = Math.sqrt(variance);
  const seasonalityIndex = avgRevenue > 0 ? (stdDev / avgRevenue) * 100 : 0;

  return {
    monthly,
    quarterly,
    bestMonth,
    worstMonth,
    seasonalityIndex,
  };
};

/**
 * Calcula distribuição de valores de pedidos
 */
export const getOrderValueDistribution = (orders: ProcessedOrder[]): OrderValueDistribution[] => {
  const ranges = [
    { min: 0, max: 50, label: "R$ 0-50" },
    { min: 51, max: 100, label: "R$ 51-100" },
    { min: 101, max: 200, label: "R$ 101-200" },
    { min: 201, max: 500, label: "R$ 201-500" },
    { min: 501, max: Infinity, label: "R$ 500+" },
  ];

  const distribution = ranges.map((range) => {
    const ordersInRange = orders.filter(
      (order) => order.valorTotal >= range.min && order.valorTotal <= range.max
    );
    return {
      range: range.label,
      count: ordersInRange.length,
      percentage: (ordersInRange.length / orders.length) * 100,
      totalRevenue: ordersInRange.reduce((sum, order) => sum + order.valorTotal, 0),
    };
  });

  return distribution;
};

/**
 * Calcula performance por plataforma de e-commerce
 */
export const getPlatformPerformance = (orders: ProcessedOrder[]): PlatformPerformance[] => {
  const platformMap = new Map<string, { revenue: number; orders: number }>();

  orders.forEach((order) => {
    const platform = order.ecommerce;
    const existing = platformMap.get(platform) || { revenue: 0, orders: 0 };
    platformMap.set(platform, {
      revenue: existing.revenue + order.valorTotal,
      orders: existing.orders + 1,
    });
  });

  const totalRevenue = orders.reduce((sum, order) => sum + order.valorTotal, 0);

  const performance = Array.from(platformMap.entries())
    .map(([platform, data]) => ({
      platform,
      revenue: data.revenue,
      orders: data.orders,
      averageTicket: data.orders > 0 ? data.revenue / data.orders : 0,
      marketShare: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return performance;
};

/**
 * Compara diferentes plataformas de e-commerce
 */
export const compareEcommercePlatforms = (orders: ProcessedOrder[]) => {
  const platforms = getPlatformPerformance(orders);
  const totalRevenue = platforms.reduce((sum, p) => sum + p.revenue, 0);
  
  return {
    platforms,
    topPerformer: platforms[0]?.platform || "N/A",
    lowPerformer: platforms[platforms.length - 1]?.platform || "N/A",
    totalRevenue,
  };
};

/**
 * Calcula taxa de crescimento do faturamento
 */
const calculateGrowthRate = (orders: ProcessedOrder[], selectedMonth: string): number => {
  if (orders.length === 0) return 0;

  // Se não for um mês válido (ex: "last-12-months"), retornar 0
  if (!selectedMonth || selectedMonth === "last-12-months" || !selectedMonth.match(/^\d{4}-\d{2}$/)) {
    return 0;
  }

  const currentMonthOrders = orders.filter(
    (order) => format(order.dataVenda, "yyyy-MM") === selectedMonth
  );
  
  const currentRevenue = currentMonthOrders.reduce((sum, order) => sum + order.valorTotal, 0);

  // Mês anterior
  const currentDate = parse(selectedMonth, "yyyy-MM", new Date());
  const previousDate = new Date(currentDate);
  previousDate.setMonth(previousDate.getMonth() - 1);
  const previousMonth = format(previousDate, "yyyy-MM");

  const previousMonthOrders = orders.filter(
    (order) => format(order.dataVenda, "yyyy-MM") === previousMonth
  );
  
  const previousRevenue = previousMonthOrders.reduce((sum, order) => sum + order.valorTotal, 0);

  if (previousRevenue === 0) return 0;
  
  return ((currentRevenue - previousRevenue) / previousRevenue) * 100;
};

/**
 * Calcula o faturamento acumulado por produto individual
 * Desmembra kits em produtos individuais
 */
export const calculateAccumulatedRevenueByProduct = (
  orders: ProcessedOrder[],
  topN: number = 15
): ProductRevenueData[] => {
  // Desmembrar kits em produtos individuais
  const brokenDownOrders = breakdownOrders(orders);
  
  const productMap = new Map<string, number>();
  let totalRevenue = 0;
  
  brokenDownOrders.forEach(order => {
    order.produtos.forEach(produto => {
      const productName = produto.descricaoAjustada;
      const revenue = produto.preco * produto.quantidade;
      
      // Acumular faturamento
      productMap.set(
        productName,
        (productMap.get(productName) || 0) + revenue
      );
      
      totalRevenue += revenue;
    });
  });
  
  // Converter para array e ordenar
  const productRevenues: ProductRevenueData[] = Array.from(productMap.entries())
    .map(([product, revenue]) => ({
      product,
      revenue,
      percentage: (revenue / totalRevenue) * 100
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN);
  
  return productRevenues;
};

/**
 * Calcula todas as métricas financeiras
 */
export const calculateFinancialMetrics = (
  orders: ProcessedOrder[],
  selectedMonth?: string
): FinancialMetrics => {
  // Detectar se é período multi-mês
  const isMultiMonth = selectedMonth === "last-12-months" || !selectedMonth;
  
  // ===== CÁLCULOS DE FRETE =====
  const freteTotal = orders.reduce((sum, order) => sum + order.valorFrete, 0);
  
  // ===== CÁLCULOS GERAIS (todos os pedidos) =====
  const totalRevenue = orders.reduce((sum, order) => sum + order.valorTotal, 0);
  const faturamentoBruto = totalRevenue + freteTotal;
  const faturamentoLiquido = totalRevenue;
  const percentualFrete = faturamentoBruto > 0 ? (freteTotal / faturamentoBruto) * 100 : 0;
  
  const totalOrders = orders.length;
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const ticketMedioBruto = totalOrders > 0 ? faturamentoBruto / totalOrders : 0;
  
  // ===== CÁLCULOS REAIS (sem pedidos de apenas samples) =====
  const realOrders = filterRealOrders(orders);
  const realRevenue = realOrders.reduce((sum, order) => sum + order.valorTotal, 0);
  const totalRealOrders = realOrders.length;
  const realAverageTicket = totalRealOrders > 0 ? realRevenue / totalRealOrders : 0;
  
  // Calcular produto médio REAL (média de produtos individuais, excluindo amostras)
  const brokenDownOrders = breakdownOrders(realOrders);
  
  // Contar quantidade total de produtos individuais (EXCLUINDO Kit de Amostras)
  const totalIndividualItems = brokenDownOrders.reduce((sum, order) => {
    return sum + order.produtos.reduce((pSum, produto) => {
      // Excluir "Kit de Amostras" da contagem
      if (produto.descricaoAjustada === 'Kit de Amostras') {
        return pSum;
      }
      return pSum + produto.quantidade;
    }, 0);
  }, 0);
  
  // Calcular média de produtos individuais por pedido REAL
  const produtoMedio = totalRealOrders > 0 ? totalIndividualItems / totalRealOrders : 0;

  const revenueEvolution = calculateRevenueEvolution(orders);
  const revenueByMonth = calculateRevenueByPeriod(orders, 'month').map((item) => ({
    month: item.period,
    revenue: item.revenue,
    orders: orders.filter((o) => format(o.dataVenda, "yyyy-MM") === item.period).length,
  }));

  // Calcular pedidos diários
  const ordersByDay = extractDailyOrders(orders).map(item => ({
    date: item.date,
    orders: item.value
  }));
  
  // Calcular pedidos por mês (agregado)
  const ordersByMonth = calculateMonthlyOrders(orders);
  
  // Calcular faturamento por produto
  const revenueByProduct = calculateAccumulatedRevenueByProduct(orders, 15);

  const seasonality = analyzeSeasonality(orders);
  const orderDistribution = getOrderValueDistribution(orders);
  const platformPerformance = getPlatformPerformance(orders);
  const topPlatform = platformPerformance[0]?.platform || "N/A";

  // Calcular crescimento apenas se um mês específico foi selecionado
  const growthRate = selectedMonth ? calculateGrowthRate(orders, selectedMonth) : 0;

  return {
    faturamentoTotal: totalRevenue,
    faturamentoBruto,
    faturamentoLiquido,
    freteTotal,
    percentualFrete,
    ticketMedio: averageTicket,
    ticketMedioReal: realAverageTicket,
    ticketMedioBruto,
    totalPedidos: totalOrders,
    totalPedidosReais: totalRealOrders,
    totalPedidosApenasAmostras: totalOrders - totalRealOrders,
    produtoMedio,
    revenueByDay: revenueEvolution,
    ordersByDay,
    revenueByProduct,
    revenueByMonth,
    ordersByMonth,
    seasonality,
    orderDistribution,
    isMultiMonth,
    platformPerformance,
    topPlatform,
    growthRate,
  };
};
