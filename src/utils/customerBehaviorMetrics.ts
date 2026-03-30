import { ProcessedOrder, CustomerBehaviorMetrics, ChurnRiskCustomer, SalesPeak, OrderVolumeAnalysis, CustomerSegment } from "@/types/marketing";
import { format, differenceInDays, startOfWeek, endOfWeek } from "date-fns";
import { getOfficialRevenue, isRevenueOrder } from "./revenue";
import { calculateRepurchaseRate } from "./salesCalculator";

/**
 * @deprecated Churn agora vem da view `customer_full`. Use `useCustomerData` hook.
 * Mantido apenas para `executiveMetricsCalculator.ts` (migração posterior).
 *
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
  const clientesMap = new Map<string, { ultimaCompra: Date; pedidos: number; pedidosReceita: number; valorTotal: number; nome: string }>();

  orders.forEach(order => {
    const isRevenue = isRevenueOrder(order);
    const existing = clientesMap.get(order.cpfCnpj);
    if (!existing || order.dataVenda > existing.ultimaCompra) {
      clientesMap.set(order.cpfCnpj, {
        ultimaCompra: order.dataVenda,
        pedidos: (existing?.pedidos || 0) + 1,
        pedidosReceita: (existing?.pedidosReceita || 0) + (isRevenue ? 1 : 0),
        // [FIX DIV-005] valorTotal acumula apenas receita de pedidos tipo 'venda'.
        // Brindes e bonificações não somam ao valor do cliente.
        valorTotal: (existing?.valorTotal || 0) + (isRevenueOrder(order) ? getOfficialRevenue(order) : 0),
        nome: order.nomeCliente
      });
    } else {
      existing.pedidos += 1;
      existing.pedidosReceita += isRevenue ? 1 : 0;
      existing.valorTotal += getOfficialRevenue(order);
    }
  });

  const dataReferencia = orders.length > 0
    ? new Date(Math.max(...orders.map(o => new Date(o.dataVenda).getTime())))
    : new Date();
  let clientesChurn = 0;
  let clientesEmRisco = 0;
  let clientesInativos = 0;
  let clientesAtivos = 0;
  const churnRiskCustomers: ChurnRiskCustomer[] = [];

  clientesMap.forEach((cliente, cpfCnpj) => {
    const diasSemComprar = differenceInDays(dataReferencia, cliente.ultimaCompra);

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';

    // Alinhado com a view customer_full do banco:
    // Clientes com apenas 1 pedido de receita são sempre "active"
    if (cliente.pedidosReceita <= 1) {
      clientesAtivos++;
      riskLevel = 'low';
    } else if (diasSemComprar <= 30) {
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
      orders: existing.orders + 1, // contagem operacional = todos os pedidos
      // [FIX DIV-005] revenue = somente pedidos tipo 'venda' (fiscal)
      revenue: existing.revenue + (isRevenueOrder(order) ? getOfficialRevenue(order) : 0)
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
      revenue: existing.revenue + (isRevenueOrder(order) ? getOfficialRevenue(order) : 0) // [FIX DIV-005]
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
      revenue: existing.revenue + (isRevenueOrder(order) ? getOfficialRevenue(order) : 0) // [FIX DIV-005]
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
      revenue: existing.revenue + (isRevenueOrder(order) ? getOfficialRevenue(order) : 0) // [FIX DIV-005]
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
      // [FIX DIV-005] revenue = somente pedidos tipo 'venda'
      revenue: existing.revenue + (isRevenueOrder(order) ? getOfficialRevenue(order) : 0)
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

// segmentCustomers e calculateCustomerBehaviorMetrics foram removidos.
// Segmentos vêm da tabela `customer` via useCustomerData hook.
// Métricas consolidadas vêm de useCustomerData + hooks específicos.
