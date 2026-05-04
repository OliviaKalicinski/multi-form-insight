/**
 * Computa métricas de comportamento do cliente diretamente a partir de orders filtrados.
 * Isso permite que o filtro de data do dashboard afete as métricas de recompra, CLV, segmentos, etc.
 *
 * Nota: Churn (dias sem comprar) é inerentemente lifecycle e deve usar dados do banco.
 */

import type { ProcessedOrder, CustomerSegment } from "@/types/marketing";
import { isRevenueOrder, getOfficialRevenue } from "./revenue";

export interface BehaviorSummary {
  totalClientes: number;
  clientesNovos: number;       // 1 pedido no período
  clientesRecorrentes: number; // 2+ pedidos no período
  taxaRecompra: number;        // % com 2+ pedidos
  customerLifetimeValue: number;
  averageDaysBetweenPurchases: number;
  ticketMedio: number;
  totalRevenue: number;
  totalOrders: number;
}

export interface BehaviorMetrics {
  summary: BehaviorSummary;
  segments: CustomerSegment[];
}

interface CustomerGroup {
  cpfCnpj: string;
  nome: string;
  orders: ProcessedOrder[];
  totalRevenue: number;
  orderCount: number;
}

const isValidIdentity = (cpf: string | null | undefined): cpf is string =>
  !!cpf && !cpf.startsWith("nf-") && cpf.trim().length > 3;

function groupByCustomer(orders: ProcessedOrder[]): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>();

  // R45: filtra fora brindes/bonificações/doações/ajustes/devoluções.
  // Antes: brinde com valorTotal R$200 inflava receita VIP.
  // Agora: só pedidos do tipo 'venda' contam pra agregação por cliente.
  const onlyRevenue = orders.filter(isRevenueOrder);

  for (const o of onlyRevenue) {
    if (!isValidIdentity(o.cpfCnpj)) continue;
    const key = o.cpfCnpj;
    let group = map.get(key);
    if (!group) {
      group = { cpfCnpj: key, nome: o.nomeCliente, orders: [], totalRevenue: 0, orderCount: 0 };
      map.set(key, group);
    }
    group.orders.push(o);
    // R45: usa getOfficialRevenue (totalFaturado da NF, ou valorTotal+frete como fallback).
    // Coerência fiscal com o resto do sistema (RevenueHeroCard, DRE, etc.).
    group.totalRevenue += getOfficialRevenue(o);
    group.orderCount++;
  }

  return Array.from(map.values());
}

function getSegmentName(orderCount: number, totalRevenue: number): CustomerSegment["segment"] {
  if (orderCount >= 5 || totalRevenue >= 500) return "VIP";
  if (orderCount >= 3) return "Fiel";
  if (orderCount >= 2) return "Recorrente";
  return "Primeira Compra";
}

function avgDaysBetweenPurchases(groups: CustomerGroup[]): number {
  const intervals: number[] = [];

  for (const g of groups) {
    if (g.orders.length < 2) continue;
    const sorted = [...g.orders].sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime());
    for (let i = 1; i < sorted.length; i++) {
      const diff = (sorted[i].dataVenda.getTime() - sorted[i - 1].dataVenda.getTime()) / (1000 * 60 * 60 * 24);
      if (diff > 0) intervals.push(diff);
    }
  }

  if (intervals.length === 0) return 0;
  return intervals.reduce((a, b) => a + b, 0) / intervals.length;
}

export function computeBehaviorMetrics(orders: ProcessedOrder[]): BehaviorMetrics {
  const groups = groupByCustomer(orders);
  const totalClientes = groups.length;

  if (totalClientes === 0) {
    return {
      summary: {
        totalClientes: 0,
        clientesNovos: 0,
        clientesRecorrentes: 0,
        taxaRecompra: 0,
        customerLifetimeValue: 0,
        averageDaysBetweenPurchases: 0,
        ticketMedio: 0,
        totalRevenue: 0,
        totalOrders: 0,
      },
      segments: [],
    };
  }

  const withRecompra = groups.filter((g) => g.orderCount >= 2).length;
  const totalRevenue = groups.reduce((sum, g) => sum + g.totalRevenue, 0);
  const totalOrders = groups.reduce((sum, g) => sum + g.orderCount, 0);

  const summary: BehaviorSummary = {
    totalClientes,
    clientesNovos: totalClientes - withRecompra,
    clientesRecorrentes: withRecompra,
    taxaRecompra: (withRecompra / totalClientes) * 100,
    customerLifetimeValue: totalRevenue / totalClientes,
    averageDaysBetweenPurchases: avgDaysBetweenPurchases(groups),
    ticketMedio: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    totalRevenue,
    totalOrders,
  };

  // ── Segmentos ──
  // R42-fix-2: removido "no período" — info redundante (header da página
  // já fala que tudo respeita o filtro de datas). Reduz tamanho da legenda.
  const criteriaMap: Record<string, string> = {
    "Primeira Compra": "1 pedido",
    Recorrente: "2 pedidos",
    Fiel: "3-4 pedidos",
    VIP: "5+ pedidos ou R$ 500+",
  };

  const segMap = new Map<string, { count: number; totalRevenue: number; totalOrders: number }>();
  for (const g of groups) {
    const seg = getSegmentName(g.orderCount, g.totalRevenue);
    const existing = segMap.get(seg) || { count: 0, totalRevenue: 0, totalOrders: 0 };
    existing.count++;
    existing.totalRevenue += g.totalRevenue;
    existing.totalOrders += g.orderCount;
    segMap.set(seg, existing);
  }

  const segmentOrder: CustomerSegment["segment"][] = ["Primeira Compra", "Recorrente", "Fiel", "VIP"];
  const segments: CustomerSegment[] = segmentOrder
    .filter((name) => segMap.has(name))
    .map((name) => {
      const s = segMap.get(name)!;
      return {
        segment: name,
        count: s.count,
        percentage: totalClientes > 0 ? (s.count / totalClientes) * 100 : 0,
        totalRevenue: s.totalRevenue,
        totalOrders: s.totalOrders,
        ticketMedio: s.totalOrders > 0 ? s.totalRevenue / s.totalOrders : 0,
        arpu: s.count > 0 ? s.totalRevenue / s.count : 0,
        criteria: criteriaMap[name] || "",
      };
    });

  return { summary, segments };
}
