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
  roas_real: {
    formula: "Faturamento Total (ex-frete) ÷ Investimento em Ads",
    description: "Retorno real baseado no dinheiro que entrou no caixa, excluindo frete. Mostra o retorno efetivo do investimento em anúncios.",
    rules: ["≥4x = Excelente", "≥3x = Bom", "<3x = Atenção", "Baseado em vendas reais"]
  },
  roas_meta: {
    formula: "Valor de Conversão (Meta) ÷ Investimento em Ads",
    description: "ROAS reportado pela plataforma Meta Ads. Baseado na atribuição de conversão do Facebook/Instagram, que pode diferir do faturamento real.",
    rules: ["≥4x = Excelente", "≥3x = Bom", "<3x = Atenção", "Pode diferir do real devido à atribuição"]
  },
  cac: {
    formula: "Investimento Total em Ads ÷ Número de Novos Clientes",
    description: "Custo médio para adquirir cada novo cliente através de anúncios.",
    rules: ["Quanto menor, melhor", "Deve ser significativamente menor que o LTV", "Benchmark varia por segmento"]
  },
  ltv: {
    formula: "Receita Média por Cliente × Frequência de Compra",
    description: "Valor total esperado que um cliente gera ao longo do relacionamento.",
    rules: ["Simplificado: Receita Total ÷ Total de Clientes", "Quanto maior, melhor", "Deve ser ≥3x o CAC"]
  },
  ltv_cac: {
    formula: "LTV ÷ CAC",
    description: "Relação entre o valor do cliente e o custo para adquiri-lo.",
    rules: ["≥4x = Excelente (margem para investir mais)", "3-4x = Bom (negócio saudável)", "<3x = Atenção (risco de prejuízo)"]
  },
  margem_estimada: {
    formula: "((Receita - Custo Estimado) ÷ Receita) × 100",
    description: "Margem bruta estimada considerando custo médio dos produtos.",
    rules: ["≥35% = Saudável", "30-35% = Aceitável", "<30% = Atenção"]
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

  // === MÉTRICAS DE PERFORMANCE FINANCEIRA ===
  pedidos: {
    formula: "COUNT(pedidos únicos no período)",
    description: "Total de pedidos realizados no período selecionado.",
    rules: ["Cada número de pedido é contado uma única vez"]
  },
  margem_bruta: {
    formula: "(1 - % Custo Fixo) × 100",
    description: "Margem bruta percentual configurada nas metas do sistema.",
    rules: ["Padrão: 60%", "Ajustável em Configurações"]
  },
  itens_pedido: {
    formula: "Total de Produtos ÷ Total de Pedidos",
    description: "Quantidade média de itens em cada pedido.",
    rules: ["Maior = mais cross-sell", "Menor = compras focadas"]
  },
  receita_liquida: {
    formula: "Faturamento Total - Frete Total",
    description: "Receita apenas dos produtos, excluindo custos de frete.",
  },
  crescimento: {
    formula: "((Período Atual - Anterior) ÷ Anterior) × 100",
    description: "Variação percentual comparado ao período anterior.",
    rules: [">10% = Excelente", "<-10% = Crítico"]
  },

  // === MÉTRICAS DE ANÁLISE DE AMOSTRAS ===
  clientes_qualificados: {
    formula: "COUNT(clientes cujo 1º pedido foi só amostra)",
    description: "Clientes que iniciaram relacionamento com pedido exclusivo de amostras.",
    rules: ["Primeiro pedido deve ser 100% amostras", "Base para análise de conversão"]
  },
  converteram_regular: {
    formula: "COUNT(qualificados que compraram produto regular)",
    description: "Clientes que após receberem amostra, fizeram pedido com produto pago.",
    rules: ["Exclui novos pedidos só de amostra"]
  },
  ticket_medio_recompra: {
    formula: "Σ(valor pedidos regulares) ÷ Clientes que recompraram",
    description: "Valor médio gasto por cliente que converteu após amostra.",
  },
  tempo_ate_recompra: {
    formula: "Média(dias entre amostra e 1º pedido regular)",
    description: "Tempo médio em dias para conversão após receber amostra.",
    rules: ["≤45 dias = Bom", ">45 dias = Lento"]
  },
  ltv_medio_samples: {
    formula: "Σ(todas compras do cliente) ÷ Clientes convertidos",
    description: "Valor total médio que cada cliente convertido gerou.",
  },
  conversao_60d: {
    formula: "(Conversões em 60 dias ÷ Qualificados com 60+ dias) × 100",
    description: "Taxa de conversão considerando clientes com tempo suficiente para converter.",
    rules: ["Mais confiável que taxa geral", "Exclui clientes muito recentes"]
  },

  // === MÉTRICAS DE CHURN ===
  taxa_churn: {
    formula: "(Clientes Churn ÷ Total Clientes) × 100",
    description: "Percentual de clientes perdidos (sem compras há mais de 90 dias).",
    rules: ["<10% = Bom", "10-20% = Atenção", ">20% = Crítico"]
  },
  valor_em_risco: {
    formula: "Σ(Valor Total dos clientes em risco de churn)",
    description: "Receita potencial que pode ser perdida se os clientes em risco não forem reativados.",
    rules: ["Baseado no histórico de compras", "Indica urgência de reativação"]
  },

  // === MÉTRICAS DE PRODUTOS (PÁGINA PRODUTOS) ===
  produto_campeao: {
    formula: "TOP 1(produtos por [critério selecionado])",
    description: "Produto com maior volume ou faturamento no período, dependendo do critério de ordenação selecionado.",
    rules: ["Ordenação por quantidade = mais unidades", "Ordenação por faturamento = maior receita"]
  },
  receita_total_produtos: {
    formula: "Σ(faturamento de todos os produtos)",
    description: "Soma do faturamento gerado por todos os produtos vendidos no período.",
  },
  unidades_vendidas: {
    formula: "Σ(quantidades vendidas de cada produto)",
    description: "Total de unidades de produtos vendidas no período selecionado.",
  },
  skus_unicos: {
    formula: "COUNT(DISTINCT SKU)",
    description: "Quantidade de produtos diferentes (SKUs únicos) vendidos no período.",
    rules: ["Cada código de produto conta uma vez"]
  },
  combinacoes_produtos: {
    formula: "COUNT(pares de produtos com ≥2 ocorrências)",
    description: "Número de combinações de produtos que foram comprados juntos pelo menos 2 vezes.",
    rules: ["Mínimo de 2 ocorrências para considerar", "Indica oportunidades de cross-sell"]
  },
  brindes: {
    formula: "COUNT(produtos com valor R$0,01)",
    description: "Produtos distribuídos como cortesia, amostras ou brindes promocionais.",
  },

  // === MÉTRICAS DE OPERAÇÕES (PÁGINA OPERAÇÕES) ===
  forma_envio_principal: {
    formula: "TOP 1(métodos de envio por volume)",
    description: "Método de entrega mais utilizado no período em número de pedidos.",
    rules: ["Inclui todos os pedidos processados"]
  },
  total_pedidos_ops: {
    formula: "COUNT(pedidos únicos no período)",
    description: "Total de pedidos processados no período selecionado.",
  },
  formas_envio_total: {
    formula: "COUNT(DISTINCT formas de envio)",
    description: "Quantidade de métodos de envio diferentes utilizados no período.",
  },
  faturamento_periodo: {
    formula: "Σ(valor total dos pedidos)",
    description: "Faturamento total do período, incluindo todos os pedidos processados.",
  },

  // === MÉTRICAS DE ADS (PÁGINA MARKETING) ===
  alcance_ads: {
    formula: "COUNT(DISTINCT pessoas atingidas)",
    description: "Número de pessoas únicas que viram pelo menos uma vez os anúncios.",
    rules: ["Cada pessoa é contada uma única vez", "Diferente de impressões que conta visualizações"]
  },
  impressoes_ads: {
    formula: "Σ(visualizações dos anúncios)",
    description: "Total de vezes que os anúncios foram exibidos, incluindo repetições.",
    rules: ["Uma pessoa pode gerar múltiplas impressões"]
  },
  cliques_ads: {
    formula: "Σ(cliques nos anúncios)",
    description: "Total de cliques recebidos nos anúncios.",
  },
  taxa_engajamento: {
    formula: "(Engajamentos ÷ Alcance) × 100",
    description: "Percentual de pessoas que interagiram com o conteúdo em relação ao alcance.",
    rules: ["≥5% = Excelente", "3-5% = Bom", "1-3% = Médio", "<1% = Baixo"]
  },
  resultados_engagement: {
    formula: "Σ(resultados por objetivo de engajamento)",
    description: "Total de resultados obtidos conforme o objetivo definido na campanha.",
    rules: ["Tipo de resultado varia conforme configuração da campanha"]
  },
  custo_por_resultado: {
    formula: "Investimento ÷ Resultados",
    description: "Custo médio para obter cada resultado da campanha de engajamento.",
    rules: ["Quanto menor, mais eficiente a campanha"]
  },
  conversoes_total: {
    formula: "COUNT(compras atribuídas aos anúncios)",
    description: "Total de compras realizadas e atribuídas às campanhas de anúncios.",
  },
  lucro_liquido_ads: {
    formula: "Receita de Conversões - Investimento em Ads",
    description: "Lucro ou prejuízo líquido após descontar o investimento em anúncios.",
    rules: ["Positivo = lucro", "Negativo = prejuízo"]
  },
};
