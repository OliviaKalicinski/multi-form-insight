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
