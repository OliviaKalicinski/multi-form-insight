import { ProcessedOrder } from "@/types/marketing";

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
