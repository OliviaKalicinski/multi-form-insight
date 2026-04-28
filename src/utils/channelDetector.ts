/**
 * R26: classificação de canal/origem dos pedidos.
 *
 * Contexto: as notas fiscais importadas não trazem identificador único do
 * marketplace de origem (ML, Amazon, Petlove, Petz, Yampi). O
 * `numero_pedido_plataforma` é o ID interno do ERP (Tiny/Bling), comum a
 * todos os canais. Sem integração direta com cada marketplace, não dá pra
 * distinguir individualmente quem é quem.
 *
 * Solução pragmática: classificar em 3 buckets baseados nos sinais que
 * existem hoje no banco. Quando houver integração ERP/marketplace direta
 * (R27 backlog), substituir essa lógica pela classificação real.
 *
 * Buckets:
 * - "Vendas Online": pedidos com numero_pedido_plataforma populado.
 *   Engloba Yampi + todos os marketplaces sem distinção.
 * - "Vendas Diretas": pedidos sem id de plataforma mas natureza VENDA.
 *   Balcão, B2B, eventos, vendas locais sem marketplace.
 * - "Brindes/Remessas": natureza tipo "Bonificação", "Doação", "Brinde",
 *   "Amostra". Não é venda real — pedidos pra prospects, divulgação,
 *   reposições gratuitas. Não geram receita.
 */

const NATUREZAS_BRINDE = [
  "bonifica", // bonificação / bonificacao
  "doa", // doação / doacao
  "brinde",
  "amostra",
  "remessa", // ex.: "Remessas de bonificação, doação ou brinde"
];

const isBrindeNatureza = (natureza: string | undefined): boolean => {
  if (!natureza) return false;
  const n = natureza.toLowerCase();
  return NATUREZAS_BRINDE.some((kw) => n.includes(kw));
};

/**
 * Recebe campos brutos de uma row do banco (sales_data) e retorna a
 * classificação de canal.
 */
export const detectChannelFromRow = (row: {
  numero_pedido_plataforma?: string | null;
  natureza_operacao?: string | null;
}): string => {
  if (isBrindeNatureza(row.natureza_operacao || undefined)) {
    return "Brindes/Remessas";
  }
  if (row.numero_pedido_plataforma && row.numero_pedido_plataforma.trim() !== "") {
    return "Vendas Online";
  }
  return "Vendas Diretas";
};

/**
 * Versão pra ProcessedOrder (após mapeamento do useDataPersistence).
 * Útil em filtros downstream se ecommerce não estiver populado.
 */
export const detectChannelFromOrder = (order: {
  numeroPedidoPlataforma?: string;
  naturezaOperacao?: string;
}): string => {
  if (isBrindeNatureza(order.naturezaOperacao)) {
    return "Brindes/Remessas";
  }
  if (order.numeroPedidoPlataforma && order.numeroPedidoPlataforma.trim() !== "") {
    return "Vendas Online";
  }
  return "Vendas Diretas";
};
