import { ProcessedOrder, CustomerSnapshot } from "@/types/marketing";
import { isRevenueOrder, getOfficialRevenue } from "./revenue";
import { differenceInDays } from "date-fns";

/**
 * Constrói snapshots de clientes a partir de pedidos processados.
 * Função pura para uso em memória (fallback temporário e métricas filtradas).
 * NÃO calcula churn — responsabilidade da view SQL customer_full.
 */
export const buildCustomerSnapshot = (orders: ProcessedOrder[]): CustomerSnapshot[] => {
  // Guard: filtrar identidades fracas antes de qualquer agrupamento
  const validOrders = orders.filter(o =>
    o.cpfCnpj &&
    !o.cpfCnpj.startsWith('nf-') &&
    o.cpfCnpj.trim().length > 3
  );

  // Separar pedidos de venda dos demais
  const revenueOrders = validOrders.filter(isRevenueOrder);

  // Agrupar TODOS os pedidos por cpfCnpj para totalOrdersAll
  const allOrdersMap = new Map<string, number>();
  validOrders.forEach(order => {
    allOrdersMap.set(order.cpfCnpj, (allOrdersMap.get(order.cpfCnpj) || 0) + 1);
  });

  // Agrupar pedidos de venda por cpfCnpj
  const clientesMap = new Map<string, {
    nome: string;
    totalRevenue: number;
    totalOrdersRevenue: number;
    dates: Date[];
    firstDate: Date;
    lastDate: Date;
  }>();

  revenueOrders.forEach(order => {
    const revenue = getOfficialRevenue(order);
    const existing = clientesMap.get(order.cpfCnpj);

    if (!existing) {
      clientesMap.set(order.cpfCnpj, {
        nome: order.nomeCliente,
        totalRevenue: revenue,
        totalOrdersRevenue: 1,
        dates: [order.dataVenda],
        firstDate: order.dataVenda,
        lastDate: order.dataVenda,
      });
    } else {
      existing.totalRevenue += revenue;
      existing.totalOrdersRevenue++;
      existing.dates.push(order.dataVenda);
      existing.nome = order.nomeCliente; // último nome
      if (order.dataVenda < existing.firstDate) existing.firstDate = order.dataVenda;
      if (order.dataVenda > existing.lastDate) existing.lastDate = order.dataVenda;
    }
  });

  // Incluir clientes que NÃO têm pedidos de venda (só brinde/bonificação etc.)
  validOrders.forEach(order => {
    if (!clientesMap.has(order.cpfCnpj)) {
      clientesMap.set(order.cpfCnpj, {
        nome: order.nomeCliente,
        totalRevenue: 0,
        totalOrdersRevenue: 0,
        dates: [],
        firstDate: order.dataVenda,
        lastDate: order.dataVenda,
      });
    }
  });

  const snapshots: CustomerSnapshot[] = [];

  clientesMap.forEach((data, cpfCnpj) => {
    const totalOrdersAll = allOrdersMap.get(cpfCnpj) || 0;

    // Average days between purchases (NULL se < 2 pedidos de venda)
    let averageDaysBetweenPurchases: number | null = null;
    if (data.dates.length >= 2) {
      const sorted = data.dates.sort((a, b) => a.getTime() - b.getTime());
      let totalDays = 0;
      for (let i = 1; i < sorted.length; i++) {
        totalDays += differenceInDays(sorted[i], sorted[i - 1]);
      }
      averageDaysBetweenPurchases = totalDays / (sorted.length - 1);
    }

    // Segment
    let segment: CustomerSnapshot['segment'];
    if (data.totalOrdersRevenue >= 5 || data.totalRevenue >= 500) {
      segment = 'VIP';
    } else if (data.totalOrdersRevenue >= 3) {
      segment = 'Fiel';
    } else if (data.totalOrdersRevenue === 2) {
      segment = 'Recorrente';
    } else {
      segment = 'Primeira Compra';
    }

    const ticketMedio = data.totalOrdersRevenue > 0
      ? data.totalRevenue / data.totalOrdersRevenue
      : 0;

    snapshots.push({
      cpfCnpj,
      nome: data.nome,
      totalOrdersRevenue: data.totalOrdersRevenue,
      totalOrdersAll,
      totalRevenue: data.totalRevenue,
      firstOrderDate: data.firstDate,
      lastOrderDate: data.lastDate,
      averageDaysBetweenPurchases,
      segment,
      ticketMedio,
    });
  });

  return snapshots;
};
