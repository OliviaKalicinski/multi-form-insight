import { ProcessedOrder } from "@/types/marketing";

// ===== Segment types & constants =====

export type SegmentFilter = 'all' | 'b2c' | 'b2b2c' | 'b2b';

export const SEGMENT_LABELS: Record<Exclude<SegmentFilter, 'all'>, string> = {
  b2c: 'B2C',
  b2b2c: 'B2B2C',
  b2b: 'B2B',
};

export const SEGMENT_COLORS: Record<Exclude<SegmentFilter, 'all'>, string> = {
  b2c: '#268050',
  b2b2c: '#825AED',
  b2b: '#FF6B00',
};

export const SEGMENT_ORDER: Array<Exclude<SegmentFilter, 'all'>> = ['b2c', 'b2b2c', 'b2b'];

// ===== Revenue helpers =====

/**
 * Retorna a receita fiscal oficial de um pedido.
 * - Se `totalFaturado` (NF) existir, usa como autoridade fiscal.
 * - Senão, fallback para `valorTotal + valorFrete` (aproximação fiscal).
 *
 * Essa função é o único ponto de verdade para receita fiscal no sistema.
 */
export const getOfficialRevenue = (order: ProcessedOrder): number => {
  if (order.totalFaturado != null) return order.totalFaturado;
  return (order.valorTotal || 0) + (order.valorFrete || 0);
};

/**
 * Filtro econômico: apenas pedidos do tipo 'venda' geram receita.
 * Brindes, bonificações, doações, ajustes e devoluções são excluídos.
 */
export const isRevenueOrder = (order: ProcessedOrder): boolean => {
  const tipo = order.tipoMovimento || 'venda';
  return tipo === 'venda';
};

export const getRevenueOrders = (orders: ProcessedOrder[]): ProcessedOrder[] =>
  orders.filter(isRevenueOrder);

export const getComiDaDragaoOrders = (orders: ProcessedOrder[]): ProcessedOrder[] =>
  orders.filter(o => o.segmentoCliente?.toLowerCase() !== 'b2b');

export const getB2COrders = (orders: ProcessedOrder[]): ProcessedOrder[] =>
  orders.filter(o => {
    const seg = o.segmentoCliente?.toLowerCase();
    return !seg || seg === 'b2c';
  });

export const getB2B2COrders = (orders: ProcessedOrder[]): ProcessedOrder[] =>
  orders.filter(o => o.segmentoCliente?.toLowerCase().trim() === 'b2b2c');

export const getB2BOrders = (orders: ProcessedOrder[]): ProcessedOrder[] =>
  orders.filter(o => o.segmentoCliente?.toLowerCase().trim() === 'b2b');

// ===== Segment helpers =====

export interface SegmentedOrders {
  b2c: ProcessedOrder[];
  b2b2c: ProcessedOrder[];
  b2b: ProcessedOrder[];
}

export const segmentOrders = (orders: ProcessedOrder[]): SegmentedOrders => ({
  b2c: getB2COrders(orders),
  b2b2c: getB2B2COrders(orders),
  b2b: getB2BOrders(orders),
});

export interface RevenueMixEntry {
  value: number;
  percent: number;
}

export type RevenueMix = Record<Exclude<SegmentFilter, 'all'>, RevenueMixEntry>;

export const calculateRevenueMix = (orders: ProcessedOrder[]): RevenueMix => {
  const segments = segmentOrders(orders);
  const revenueBySegment: Record<string, number> = {};
  let total = 0;

  for (const key of SEGMENT_ORDER) {
    const rev = getRevenueOrders(segments[key]).reduce((s, o) => s + getOfficialRevenue(o), 0);
    revenueBySegment[key] = rev;
    total += rev;
  }

  return SEGMENT_ORDER.reduce((acc, key) => {
    acc[key] = {
      value: revenueBySegment[key],
      percent: total > 0 ? (revenueBySegment[key] / total) * 100 : 0,
    };
    return acc;
  }, {} as RevenueMix);
};
