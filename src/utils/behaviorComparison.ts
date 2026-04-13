/**
 * Utilitário de comparação comportamental:
 *   Caminho A  = primeiro pedido foi SÓ amostra (sem produto regular)
 *   Caminho B  = todos os demais (produto no 1º pedido, produto + amostra, nunca recebeu amostra)
 *
 * Calcula KPIs paralelos para alimentar a aba "Comparativo" da página unificada.
 */

import { ProcessedOrder } from "@/types/marketing";
import { isOnlySampleOrder, isSampleProduct, groupOrdersByCustomer } from "./samplesAnalyzer";
import { getOfficialRevenue, isRevenueOrder } from "./revenue";
import { differenceInDays } from "date-fns";

// ── Tipos ────────────────────────────────────────────────────────

export interface PathKPIs {
  label: string;
  totalCustomers: number;
  /** Clientes que fizeram 2+ pedidos (com produto regular) */
  customersWhoRepurchased: number;
  repurchaseRate: number;       // %
  avgTicketMedio: number;       // R$ médio por pedido (só vendas)
  avgDaysBetweenPurchases: number;
  avgLTV: number;               // receita total / clientes
  churnCount: number;           // >90 dias sem comprar
  churnRate: number;            // %
  avgDaysToSecondPurchase: number; // dias até o 2º pedido
  /** Distribuição de segmento dentro desse caminho */
  segments: {
    firstPurchase: number;
    recurrent: number;
    loyal: number;
    vip: number;
  };
}

export interface BehaviorComparison {
  pathA: PathKPIs;  // Começou com amostra
  pathB: PathKPIs;  // Começou com produto
  /** Insights automáticos baseados na diferença entre os dois caminhos */
  insights: string[];
}

// ── Helpers internos ─────────────────────────────────────────────

interface CustomerSummary {
  cpf: string;
  orders: ProcessedOrder[];       // todos os pedidos desse cliente, ordenados por data
  revenueOrders: ProcessedOrder[];// só vendas
  totalRevenue: number;
  firstOrderDate: Date;
  lastOrderDate: Date;
  isPathA: boolean;               // primeiro pedido foi SÓ amostra
}

function buildCustomerSummaries(orders: ProcessedOrder[]): CustomerSummary[] {
  const map = groupOrdersByCustomer(orders);
  const now = new Date();
  const summaries: CustomerSummary[] = [];

  map.forEach((hist) => {
    if (!hist.cpfCnpj || hist.orders.length === 0) return;

    // Ordenar por data
    const sorted = [...hist.orders].sort(
      (a, b) => a.dataVenda.getTime() - b.dataVenda.getTime()
    );

    const firstOrder = sorted[0];
    const isPathA = isOnlySampleOrder(firstOrder);

    const revenueOrders = sorted.filter(isRevenueOrder);
    const totalRevenue = revenueOrders.reduce((s, o) => s + getOfficialRevenue(o), 0);

    summaries.push({
      cpf: hist.cpfCnpj,
      orders: sorted,
      revenueOrders,
      totalRevenue,
      firstOrderDate: sorted[0].dataVenda,
      lastOrderDate: sorted[sorted.length - 1].dataVenda,
      isPathA,
    });
  });

  return summaries;
}

function calculatePathKPIs(customers: CustomerSummary[], label: string): PathKPIs {
  const total = customers.length;
  if (total === 0) {
    return {
      label,
      totalCustomers: 0,
      customersWhoRepurchased: 0,
      repurchaseRate: 0,
      avgTicketMedio: 0,
      avgDaysBetweenPurchases: 0,
      avgLTV: 0,
      churnCount: 0,
      churnRate: 0,
      avgDaysToSecondPurchase: 0,
      segments: { firstPurchase: 0, recurrent: 0, loyal: 0, vip: 0 },
    };
  }

  const now = new Date();

  // Recompra = clientes com 2+ pedidos que tenham pelo menos 1 produto regular
  // (para caminho A, o primeiro pedido é amostra, então o 2º com produto = recompra)
  // (para caminho B, o primeiro já é produto, então 2º pedido = recompra)
  const withRepurchase = customers.filter((c) => {
    // Pedidos com pelo menos 1 produto regular
    const regularOrders = c.orders.filter((o) =>
      o.produtos.some((p) => !isSampleProduct(p))
    );
    return regularOrders.length >= 2;
  });

  // Para caminho A, "recompra" = pelo menos 1 pedido com produto regular (conversão)
  // Ajuste: caminho A conta como recompra se tem pelo menos 1 pedido APÓS o primeiro que contenha produto regular
  const customersWhoRepurchased = customers.filter((c) => {
    if (c.isPathA) {
      // Caminho A: conversão = tem algum pedido depois do primeiro que tem produto regular
      return c.orders.slice(1).some((o) => o.produtos.some((p) => !isSampleProduct(p)));
    } else {
      // Caminho B: recompra = tem 2+ pedidos com produto regular
      const regularOrders = c.orders.filter((o) =>
        o.produtos.some((p) => !isSampleProduct(p))
      );
      return regularOrders.length >= 2;
    }
  });

  const repurchaseRate = (customersWhoRepurchased.length / total) * 100;

  // Ticket médio (pedidos de venda, excluindo amostras puras)
  const allRevenueOrders = customers.flatMap((c) => c.revenueOrders);
  const avgTicketMedio =
    allRevenueOrders.length > 0
      ? allRevenueOrders.reduce((s, o) => s + getOfficialRevenue(o), 0) / allRevenueOrders.length
      : 0;

  // LTV médio
  const avgLTV = customers.reduce((s, c) => s + c.totalRevenue, 0) / total;

  // Dias entre compras (só pra quem tem 2+ pedidos)
  const multiOrderCustomers = customers.filter((c) => c.orders.length >= 2);
  let totalDaysBetween = 0;
  let countIntervals = 0;
  for (const c of multiOrderCustomers) {
    for (let i = 1; i < c.orders.length; i++) {
      const diff = differenceInDays(c.orders[i].dataVenda, c.orders[i - 1].dataVenda);
      if (diff > 0) {
        totalDaysBetween += diff;
        countIntervals++;
      }
    }
  }
  const avgDaysBetweenPurchases = countIntervals > 0 ? totalDaysBetween / countIntervals : 0;

  // Dias até o 2º pedido (pra quem tem 2+)
  let totalDaysToSecond = 0;
  let countSecond = 0;
  for (const c of multiOrderCustomers) {
    const diff = differenceInDays(c.orders[1].dataVenda, c.orders[0].dataVenda);
    if (diff >= 0) {
      totalDaysToSecond += diff;
      countSecond++;
    }
  }
  const avgDaysToSecondPurchase = countSecond > 0 ? totalDaysToSecond / countSecond : 0;

  // Churn (>90 dias sem comprar)
  const churnCount = customers.filter(
    (c) => differenceInDays(now, c.lastOrderDate) > 90
  ).length;
  const churnRate = (churnCount / total) * 100;

  // Segmentação interna
  const segments = { firstPurchase: 0, recurrent: 0, loyal: 0, vip: 0 };
  for (const c of customers) {
    const revenueCount = c.revenueOrders.length;
    if (revenueCount >= 5 || c.totalRevenue >= 500) segments.vip++;
    else if (revenueCount >= 3) segments.loyal++;
    else if (revenueCount >= 2) segments.recurrent++;
    else segments.firstPurchase++;
  }

  return {
    label,
    totalCustomers: total,
    customersWhoRepurchased: customersWhoRepurchased.length,
    repurchaseRate,
    avgTicketMedio,
    avgDaysBetweenPurchases,
    avgLTV,
    churnCount,
    churnRate,
    avgDaysToSecondPurchase,
    segments,
  };
}

// ── Função principal ─────────────────────────────────────────────

export function calculateBehaviorComparison(orders: ProcessedOrder[]): BehaviorComparison {
  const summaries = buildCustomerSummaries(orders);

  const pathACustomers = summaries.filter((c) => c.isPathA);
  const pathBCustomers = summaries.filter((c) => !c.isPathA);

  const pathA = calculatePathKPIs(pathACustomers, "Começou com Amostra");
  const pathB = calculatePathKPIs(pathBCustomers, "Começou com Produto");

  // Gerar insights automáticos
  const insights: string[] = [];

  if (pathA.totalCustomers > 0 && pathB.totalCustomers > 0) {
    // Recompra
    const repDiff = pathA.repurchaseRate - pathB.repurchaseRate;
    if (Math.abs(repDiff) > 2) {
      const winner = repDiff > 0 ? "Amostra" : "Produto";
      insights.push(
        `Clientes que começam com ${winner} têm taxa de recompra ${Math.abs(repDiff).toFixed(1)}pp maior.`
      );
    }

    // Ticket
    if (pathA.avgTicketMedio > 0 && pathB.avgTicketMedio > 0) {
      const ticketDiff = ((pathA.avgTicketMedio - pathB.avgTicketMedio) / pathB.avgTicketMedio) * 100;
      if (Math.abs(ticketDiff) > 5) {
        const higher = ticketDiff > 0 ? "Amostra" : "Produto";
        insights.push(
          `Ticket médio ${Math.abs(ticketDiff).toFixed(0)}% maior no caminho "${higher}".`
        );
      }
    }

    // LTV
    if (pathA.avgLTV > 0 && pathB.avgLTV > 0) {
      const ltvDiff = ((pathA.avgLTV - pathB.avgLTV) / pathB.avgLTV) * 100;
      if (Math.abs(ltvDiff) > 10) {
        const higher = ltvDiff > 0 ? "Amostra" : "Produto";
        insights.push(
          `LTV médio ${Math.abs(ltvDiff).toFixed(0)}% maior no caminho "${higher}".`
        );
      }
    }

    // Churn
    const churnDiff = pathA.churnRate - pathB.churnRate;
    if (Math.abs(churnDiff) > 3) {
      const lower = churnDiff < 0 ? "Amostra" : "Produto";
      insights.push(
        `Taxa de churn ${Math.abs(churnDiff).toFixed(1)}pp menor no caminho "${lower}".`
      );
    }

    // Velocidade
    if (pathA.avgDaysToSecondPurchase > 0 && pathB.avgDaysToSecondPurchase > 0) {
      const daysDiff = pathA.avgDaysToSecondPurchase - pathB.avgDaysToSecondPurchase;
      if (Math.abs(daysDiff) > 5) {
        const faster = daysDiff < 0 ? "Amostra" : "Produto";
        insights.push(
          `Caminho "${faster}" converte ${Math.abs(daysDiff).toFixed(0)} dias mais rápido para a 2ª compra.`
        );
      }
    }
  }

  if (insights.length === 0) {
    insights.push("Dados insuficientes para gerar insights comparativos.");
  }

  return { pathA, pathB, insights };
}
