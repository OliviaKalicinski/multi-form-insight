export interface KPIExplanation {
  formula: string;
  description: string;
  rules?: string[];
}

export const kpiExplanations: Record<string, KPIExplanation> = {
  // === MÉTRICAS DE RECEITA ===
  faturamento_total: {
    formula: "Σ (Valor Total de cada pedido)",
    description: "Soma do valor total de todos os pedidos no período selecionado, incluindo frete.",
    rules: ["Inclui pedidos de todos os status", "Valores em R$"]
  },
  faturamento_liquido: {
    formula: "Faturamento Total - Frete Total",
    description: "Receita apenas dos produtos, excluindo custos de frete.",
  },
  receita_meta: {
    formula: "(Faturamento Atual ÷ Meta) × 100",
    description: "Progresso percentual em relação à meta de receita definida.",
    rules: ["Meta definida nas configurações", "Atualiza em tempo real"]
  },
  lucro_estimado: {
    formula: "Receita Líquida × (1 - % Custo Fixo)",
    description: "Estimativa de lucro considerando margem de custo definida.",
    rules: ["Margem padrão: 40%", "Ajustável nas configurações"]
  },
  variacao_periodo: {
    formula: "((Período Atual - Período Anterior) ÷ Período Anterior) × 100",
    description: "Variação percentual comparando com o período anterior equivalente.",
  },

  // === MÉTRICAS DE VOLUME ===
  total_pedidos: {
    formula: "COUNT(pedidos únicos)",
    description: "Contagem total de pedidos no período selecionado.",
    rules: ["Cada número de pedido conta uma vez"]
  },
  media_diaria: {
    formula: "Total de Pedidos ÷ Dias no Período",
    description: "Média de pedidos por dia no período analisado.",
  },
  pico: {
    formula: "MAX(pedidos por dia)",
    description: "Dia com o maior número de pedidos registrados no período.",
  },
  vale: {
    formula: "MIN(pedidos por dia)",
    description: "Dia com o menor número de pedidos registrados no período.",
  },
  tendencia: {
    formula: "((Período Atual - Período Anterior) ÷ Período Anterior) × 100",
    description: "Indica se o volume está crescendo ou diminuindo.",
    rules: ["Positivo = crescimento", "Negativo = queda"]
  },

  // === MÉTRICAS DE CLIENTE ===
  total_clientes: {
    formula: "COUNT(DISTINCT email ou nome do cliente)",
    description: "Contagem de clientes únicos identificados por email ou nome.",
  },
  taxa_recompra: {
    formula: "(Clientes com 2+ pedidos ÷ Total de clientes) × 100",
    description: "Percentual de clientes que compraram mais de uma vez.",
    rules: ["≥30% é considerado bom", "<30% indica necessidade de atenção"]
  },
  clientes_ativos: {
    formula: "Clientes com última compra < 30 dias",
    description: "Clientes que compraram recentemente e estão engajados.",
    rules: ["Período: últimos 30 dias a partir de hoje"]
  },
  clientes_em_risco: {
    formula: "Clientes com última compra entre 31-60 dias",
    description: "Clientes que podem estar perdendo interesse.",
    rules: ["Período: 31-60 dias sem comprar", "Recomendado: ação de reativação"]
  },
  clientes_inativos: {
    formula: "Clientes com última compra entre 61-90 dias",
    description: "Clientes que pararam de comprar há algum tempo.",
    rules: ["Período: 61-90 dias sem comprar"]
  },
  clientes_churn: {
    formula: "Clientes com última compra > 90 dias",
    description: "Clientes considerados perdidos pela inatividade prolongada.",
    rules: ["Período: mais de 90 dias sem comprar"]
  },
  taxa_retencao: {
    formula: "((Total Clientes - Clientes Churn) ÷ Total Clientes) × 100",
    description: "Percentual de clientes que não foram perdidos.",
    rules: ["≥70% é considerado bom", "<70% indica atenção"]
  },
  clv: {
    formula: "Σ(Valor dos pedidos) ÷ Total de Clientes",
    description: "Valor médio total gasto por cliente ao longo do tempo.",
  },

  // === MÉTRICAS DE MARKETING/ADS ===
  roas: {
    formula: "Faturamento Líquido ÷ Investimento em Ads",
    description: "Retorno sobre cada real investido em anúncios.",
    rules: ["≥3x é considerado bom", "≥4x é excelente", "<2x indica atenção"]
  },
  receita_liquida_ads: {
    formula: "Receita gerada pelos anúncios - Custos de frete",
    description: "Receita líquida atribuída às campanhas de ads.",
  },
  investimento_ads: {
    formula: "Σ(Gasto em todas as campanhas)",
    description: "Total investido em anúncios no período.",
  },
  roi: {
    formula: "((Receita - Investimento) ÷ Investimento) × 100",
    description: "Retorno percentual sobre o investimento em ads.",
    rules: ["Positivo = lucro", "Negativo = prejuízo"]
  },
  cpm: {
    formula: "Custo ÷ (Impressões ÷ 1000)",
    description: "Custo para atingir mil impressões.",
  },
  ctr: {
    formula: "(Cliques ÷ Impressões) × 100",
    description: "Taxa de cliques em relação às impressões.",
    rules: ["CTR alto = anúncio relevante"]
  },
  cpc: {
    formula: "Custo ÷ Cliques",
    description: "Custo médio por cada clique recebido.",
  },
  frequencia: {
    formula: "Impressões ÷ Alcance",
    description: "Média de vezes que cada pessoa viu o anúncio.",
    rules: ["Frequência alta pode causar fadiga"]
  },

  // === MÉTRICAS DE LOGÍSTICA ===
  tempo_medio_nf: {
    formula: "Média(Data NF - Data Venda)",
    description: "Tempo médio em dias entre a venda e a emissão da nota fiscal.",
    rules: ["≤2 dias é bom", "3-5 dias é aceitável", ">5 dias precisa atenção"]
  },
  mediana_nf: {
    formula: "MEDIANA(dias até NF)",
    description: "Valor central da distribuição de tempos de emissão.",
    rules: ["Menos afetada por valores extremos que a média"]
  },
  mais_rapido: {
    formula: "MIN(dias até NF)",
    description: "Menor tempo de emissão de nota fiscal registrado.",
  },
  mais_lento: {
    formula: "MAX(dias até NF)",
    description: "Maior tempo de emissão de nota fiscal registrado.",
  },

  // === MÉTRICAS DE CROSS-SELL ===
  combinacoes_detectadas: {
    formula: "COUNT(pares de produtos comprados juntos ≥ 2x)",
    description: "Número de combinações de produtos frequentemente compradas juntas.",
    rules: ["Mínimo de 2 ocorrências para considerar"]
  },
  frequencia_media: {
    formula: "Média(ocorrências de cada combinação)",
    description: "Quantas vezes em média cada combinação de produtos foi comprada.",
  },
  ticket_medio_combo: {
    formula: "Média(valor dos pedidos com a combinação)",
    description: "Valor médio dos pedidos que contêm a combinação de produtos.",
  },

  // === MÉTRICAS DE PRODUTOS ===
  total_produtos: {
    formula: "Σ(quantidade de produtos vendidos)",
    description: "Quantidade total de itens vendidos no período.",
  },
  ticket_medio: {
    formula: "Faturamento Total ÷ Total de Pedidos",
    description: "Valor médio de cada pedido realizado.",
  },
  itens_por_pedido: {
    formula: "Total de Produtos ÷ Total de Pedidos",
    description: "Quantidade média de itens por pedido.",
  },

  // === MÉTRICAS DE SEGUIDORES ===
  total_seguidores: {
    formula: "Último valor registrado de seguidores",
    description: "Total acumulado de seguidores na data mais recente.",
  },
  novos_seguidores: {
    formula: "Σ(novos seguidores no período)",
    description: "Total de novos seguidores conquistados no período.",
  },
  media_diaria_seguidores: {
    formula: "Novos Seguidores ÷ Dias no Período",
    description: "Média de novos seguidores por dia.",
  },
  crescimento_seguidores: {
    formula: "((Total Atual - Total Anterior) ÷ Total Anterior) × 100",
    description: "Variação percentual no total de seguidores.",
  },

  // === MÉTRICAS DE SAMPLES/BRINDES ===
  total_samples: {
    formula: "COUNT(produtos marcados como sample/brinde)",
    description: "Total de brindes ou amostras enviados no período.",
  },
  custo_samples: {
    formula: "Σ(custo estimado de cada sample)",
    description: "Custo total estimado com brindes e amostras.",
  },
};
