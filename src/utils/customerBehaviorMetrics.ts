import { ProcessedOrder, CustomerBehaviorMetrics, ChurnRiskCustomer, SalesPeak, OrderVolumeAnalysis, CustomerSegment } from "@/types/marketing";
import { format, differenceInDays, startOfWeek, endOfWeek } from "date-fns";
import { getOfficialRevenue } from "./revenue";

/**
 * Analisa churn de clientes
 * Clientes com última compra há mais de 90 dias
 */
export const analyzeChurn = (
  orders: ProcessedOrder[], 
  churnThresholdDays: number = 90
): {
  clientesChurn: number;
  clientesEmRisco: number;
  clientesInativos: number;
  clientesAtivos: number;
  taxaChurn: number;
  taxaRetencao: number;
  churnRiskCustomers: ChurnRiskCustomer[];
} => {
  // Agrupar pedidos por cliente
  const clientesMap = new Map<string, { ultimaCompra: Date; pedidos: number; valorTotal: number; nome: string }>();
  
  orders.forEach(order => {
    const existing = clientesMap.get(order.cpfCnpj);
    if (!existing || order.dataVenda > existing.ultimaCompra) {
      clientesMap.set(order.cpfCnpj, {
        ultimaCompra: order.dataVenda,
        pedidos: (existing?.pedidos || 0) + 1,
        valorTotal: (existing?.valorTotal || 0) + order.valorTotal,
        nome: order.nomeCliente
      });
    } else {
      existing.pedidos += 1;
      existing.valorTotal += order.valorTotal;
    }
  });

  const hoje = new Date();
  let clientesChurn = 0;
  let clientesEmRisco = 0;
  let clientesInativos = 0;
  let clientesAtivos = 0;
  const churnRiskCustomers: ChurnRiskCustomer[] = [];

  clientesMap.forEach((cliente, cpfCnpj) => {
    const diasSemComprar = differenceInDays(hoje, cliente.ultimaCompra);
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    
    if (diasSemComprar <= 30) {
      clientesAtivos++;
      riskLevel = 'low';
    } else if (diasSemComprar <= 60) {
      clientesEmRisco++;
      riskLevel = 'medium';
    } else if (diasSemComprar <= 90) {
      clientesInativos++;
      riskLevel = 'high';
    } else {
      clientesChurn++;
      riskLevel = 'critical';
    }

    // Adicionar clientes em risco à lista (exceto ativos)
    if (diasSemComprar > 30) {
      churnRiskCustomers.push({
        nomeCliente: cliente.nome,
        cpfCnpj,
        ultimaCompra: cliente.ultimaCompra,
        diasSemComprar,
        totalPedidos: cliente.pedidos,
        valorTotal: cliente.valorTotal,
        riskLevel
      });
    }
  });

  const totalClientes = clientesMap.size;
  const taxaChurn = totalClientes > 0 ? (clientesChurn / totalClientes) * 100 : 0;
  const taxaRetencao = 100 - taxaChurn;

  // Ordenar clientes em risco por valor total (maior primeiro)
  churnRiskCustomers.sort((a, b) => b.valorTotal - a.valorTotal);

  return {
    clientesChurn,
    clientesEmRisco,
    clientesInativos,
    clientesAtivos,
    taxaChurn,
    taxaRetencao,
    churnRiskCustomers: churnRiskCustomers.slice(0, 50) // Top 50
  };
};

/**
 * Calcula volume de pedidos por período
 */
export const analyzeOrderVolume = (orders: ProcessedOrder[]): OrderVolumeAnalysis => {
  // Pedidos por dia
  const dailyMap = new Map<string, { orders: number; revenue: number }>();
  orders.forEach(order => {
    const date = format(order.dataVenda, 'yyyy-MM-dd');
    const existing = dailyMap.get(date) || { orders: 0, revenue: 0 };
    dailyMap.set(date, {
      orders: existing.orders + 1,
      revenue: existing.revenue + order.valorTotal
    });
  });

  const daily = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Pedidos por semana
  const weeklyMap = new Map<string, { orders: number; revenue: number; startDate: string; endDate: string }>();
  orders.forEach(order => {
    const weekStart = startOfWeek(order.dataVenda, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(order.dataVenda, { weekStartsOn: 0 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    const existing = weeklyMap.get(weekKey) || { 
      orders: 0, 
      revenue: 0, 
      startDate: format(weekStart, 'dd/MM'), 
      endDate: format(weekEnd, 'dd/MM') 
    };
    
    weeklyMap.set(weekKey, {
      ...existing,
      orders: existing.orders + 1,
      revenue: existing.revenue + order.valorTotal
    });
  });

  const weekly = Array.from(weeklyMap.entries())
    .map(([week, data]) => ({ week, ...data }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // Pedidos por mês
  const monthlyMap = new Map<string, { orders: number; revenue: number }>();
  orders.forEach(order => {
    const month = format(order.dataVenda, 'yyyy-MM');
    const existing = monthlyMap.get(month) || { orders: 0, revenue: 0 };
    monthlyMap.set(month, {
      orders: existing.orders + 1,
      revenue: existing.revenue + order.valorTotal
    });
  });

  const monthly = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Pedidos por trimestre
  const quarterlyMap = new Map<string, { orders: number; revenue: number }>();
  orders.forEach(order => {
    const date = order.dataVenda;
    const year = date.getFullYear();
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const quarterKey = `${year}-Q${quarter}`;
    const existing = quarterlyMap.get(quarterKey) || { orders: 0, revenue: 0 };
    quarterlyMap.set(quarterKey, {
      orders: existing.orders + 1,
      revenue: existing.revenue + order.valorTotal
    });
  });

  const quarterly = Array.from(quarterlyMap.entries())
    .map(([quarter, data]) => ({ quarter, ...data }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter));

  // Calcular médias
  const averageDaily = daily.reduce((sum, d) => sum + d.orders, 0) / (daily.length || 1);
  const averageWeekly = weekly.reduce((sum, w) => sum + w.orders, 0) / (weekly.length || 1);
  const averageMonthly = monthly.reduce((sum, m) => sum + m.orders, 0) / (monthly.length || 1);
  const averageQuarterly = quarterly.reduce((sum, q) => sum + q.orders, 0) / (quarterly.length || 1);

  // Encontrar pico e vale
  const peakDay = daily.reduce((max, curr) => curr.orders > max.orders ? curr : max, daily[0] || { date: '', orders: 0 });
  const lowDay = daily.reduce((min, curr) => curr.orders < min.orders ? curr : min, daily[0] || { date: '', orders: 0 });

  return {
    daily,
    weekly,
    monthly,
    quarterly,
    averageDaily,
    averageWeekly,
    averageMonthly,
    averageQuarterly,
    peakDay: { date: peakDay.date, orders: peakDay.orders },
    lowDay: { date: lowDay.date, orders: lowDay.orders }
  };
};

/**
 * Identifica picos de venda
 * Dias com volume > (média + 2 * desvio padrão)
 */
export const analyzeSalesPeaks = (orders: ProcessedOrder[]): SalesPeak[] => {
  const dailyMap = new Map<string, { orders: number; revenue: number }>();
  
  orders.forEach(order => {
    const date = format(order.dataVenda, 'yyyy-MM-dd');
    const existing = dailyMap.get(date) || { orders: 0, revenue: 0 };
    dailyMap.set(date, {
      orders: existing.orders + 1,
      revenue: existing.revenue + order.valorTotal
    });
  });

  const dailyOrders = Array.from(dailyMap.values()).map(d => d.orders);
  const average = dailyOrders.reduce((sum, val) => sum + val, 0) / dailyOrders.length;
  
  // Calcular desvio padrão
  const variance = dailyOrders.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / dailyOrders.length;
  const stdDev = Math.sqrt(variance);
  
  const threshold = average + (2 * stdDev);

  return Array.from(dailyMap.entries())
    .map(([date, data]) => {
      const isPeak = data.orders > threshold;
      const deviationFromAverage = data.orders - average;
      const percentageAboveAverage = ((data.orders - average) / average) * 100;
      
      return {
        date,
        orders: data.orders,
        revenue: data.revenue,
        isPeak,
        deviationFromAverage,
        percentageAboveAverage
      };
    })
    .sort((a, b) => b.orders - a.orders);
};

/**
 * Segmenta clientes por comportamento de compra
 */
export const segmentCustomers = (orders: ProcessedOrder[]): CustomerSegment[] => {
  const clientesMap = new Map<string, { pedidos: number; valorTotal: number; primeiraCompra: Date; ultimaCompra: Date }>();
  
  orders.forEach(order => {
    const existing = clientesMap.get(order.cpfCnpj);
    if (!existing) {
      clientesMap.set(order.cpfCnpj, {
        pedidos: 1,
        valorTotal: order.valorTotal,
        primeiraCompra: order.dataVenda,
        ultimaCompra: order.dataVenda
      });
    } else {
      existing.pedidos++;
      existing.valorTotal += order.valorTotal;
      if (order.dataVenda < existing.primeiraCompra) existing.primeiraCompra = order.dataVenda;
      if (order.dataVenda > existing.ultimaCompra) existing.ultimaCompra = order.dataVenda;
    }
  });

  const segments = {
    'Primeira Compra': { count: 0, totalRevenue: 0 },
    'Recorrente': { count: 0, totalRevenue: 0 },
    'Fiel': { count: 0, totalRevenue: 0 },
    'VIP': { count: 0, totalRevenue: 0 }
  };

  clientesMap.forEach(cliente => {
    let segment: 'Primeira Compra' | 'Recorrente' | 'Fiel' | 'VIP';
    
    // Nova lógica baseada em frequência de compra
    if (cliente.pedidos >= 5 || cliente.valorTotal >= 500) {
      segment = 'VIP';
    } else if (cliente.pedidos >= 3) {
      segment = 'Fiel';
    } else if (cliente.pedidos === 2) {
      segment = 'Recorrente';
    } else {
      segment = 'Primeira Compra';
    }

    segments[segment].count++;
    segments[segment].totalRevenue += cliente.valorTotal;
  });

  const totalClientes = clientesMap.size;

  return [
    {
      segment: 'Primeira Compra',
      count: segments['Primeira Compra'].count,
      percentage: totalClientes > 0 ? (segments['Primeira Compra'].count / totalClientes) * 100 : 0,
      totalRevenue: segments['Primeira Compra'].totalRevenue,
      averageTicket: segments['Primeira Compra'].count > 0 ? segments['Primeira Compra'].totalRevenue / segments['Primeira Compra'].count : 0,
      criteria: 'Apenas 1 pedido'
    },
    {
      segment: 'Recorrente',
      count: segments['Recorrente'].count,
      percentage: totalClientes > 0 ? (segments['Recorrente'].count / totalClientes) * 100 : 0,
      totalRevenue: segments['Recorrente'].totalRevenue,
      averageTicket: segments['Recorrente'].count > 0 ? segments['Recorrente'].totalRevenue / segments['Recorrente'].count : 0,
      criteria: '2 pedidos'
    },
    {
      segment: 'Fiel',
      count: segments['Fiel'].count,
      percentage: totalClientes > 0 ? (segments['Fiel'].count / totalClientes) * 100 : 0,
      totalRevenue: segments['Fiel'].totalRevenue,
      averageTicket: segments['Fiel'].count > 0 ? segments['Fiel'].totalRevenue / segments['Fiel'].count : 0,
      criteria: '3-4 pedidos'
    },
    {
      segment: 'VIP',
      count: segments['VIP'].count,
      percentage: totalClientes > 0 ? (segments['VIP'].count / totalClientes) * 100 : 0,
      totalRevenue: segments['VIP'].totalRevenue,
      averageTicket: segments['VIP'].count > 0 ? segments['VIP'].totalRevenue / segments['VIP'].count : 0,
      criteria: '5+ pedidos ou R$ 500+ gasto'
    }
  ];
};

/**
 * Calcula métricas consolidadas de comportamento
 */
export const calculateCustomerBehaviorMetrics = (orders: ProcessedOrder[]): CustomerBehaviorMetrics => {
  const churnAnalysis = analyzeChurn(orders);
  const volumeAnalysis = analyzeOrderVolume(orders);
  const peaks = analyzeSalesPeaks(orders);
  const segments = segmentCustomers(orders);
  
  // Calcular taxa de recompra
  const clientesMap = new Map<string, number>();
  orders.forEach(order => {
    clientesMap.set(order.cpfCnpj, (clientesMap.get(order.cpfCnpj) || 0) + 1);
  });
  const clientesRecompra = Array.from(clientesMap.values()).filter(count => count >= 2).length;
  const totalClientes = clientesMap.size;
  const taxaRecompra = totalClientes > 0 ? (clientesRecompra / totalClientes) * 100 : 0;

  // CLV simplificado: receita fiscal média por cliente
  const totalRevenue = orders.reduce((sum, order) => sum + getOfficialRevenue(order), 0);
  const customerLifetimeValue = totalClientes > 0 ? totalRevenue / totalClientes : 0;

  // Média de dias entre compras (clientes com 2+ pedidos)
  let totalDaysBetween = 0;
  let countIntervals = 0;
  
  const clientePedidos = new Map<string, Date[]>();
  orders.forEach(order => {
    if (!clientePedidos.has(order.cpfCnpj)) {
      clientePedidos.set(order.cpfCnpj, []);
    }
    clientePedidos.get(order.cpfCnpj)!.push(order.dataVenda);
  });

  clientePedidos.forEach(datas => {
    if (datas.length >= 2) {
      const sorted = datas.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < sorted.length; i++) {
        totalDaysBetween += differenceInDays(sorted[i], sorted[i-1]);
        countIntervals++;
      }
    }
  });

  const averageDaysBetweenPurchases = countIntervals > 0 ? totalDaysBetween / countIntervals : 0;

  return {
    totalClientes,
    taxaRecompra,
    clientesAtivos: churnAnalysis.clientesAtivos,
    clientesEmRisco: churnAnalysis.clientesEmRisco,
    clientesInativos: churnAnalysis.clientesInativos,
    clientesChurn: churnAnalysis.clientesChurn,
    taxaChurn: churnAnalysis.taxaChurn,
    taxaRetencao: churnAnalysis.taxaRetencao,
    pedidosPorDia: volumeAnalysis.daily,
    pedidosPorSemana: volumeAnalysis.weekly,
    pedidosPorMes: volumeAnalysis.monthly,
    pedidosPorTrimestre: volumeAnalysis.quarterly,
    picosVendas: peaks.filter(p => p.isPeak),
    customerSegmentation: segments,
    churnRiskCustomers: churnAnalysis.churnRiskCustomers,
    averageDaysBetweenPurchases,
    customerLifetimeValue
  };
};
