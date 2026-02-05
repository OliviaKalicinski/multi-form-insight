import { Recommendation, ExecutiveMetrics } from "@/types/executive";
import { SectorBenchmarks } from "@/hooks/useAppSettings";

/**
 * Gera recomendações baseadas nas métricas executivas
 * REGRA: Se benchmark necessário === null → NÃO gerar recomendação
 * @param atual - Métricas do período atual
 * @param anterior - Métricas do período anterior
 * @param benchmarks - Benchmarks do setor (de app_settings)
 */
export const gerarRecomendacoes = (
  atual: ExecutiveMetrics,
  anterior: ExecutiveMetrics,
  benchmarks: SectorBenchmarks
): Recommendation[] => {
  const recomendacoes: Recommendation[] = [];
  
  // Rec 1: Otimizar ROAS (não depende de benchmark específico - threshold fixo 1.5)
  if (atual.marketing.roasAds < 1.5) {
    const campanhasBaixas = Math.round(atual.marketing.investimentoAds * 0.6 / 100);
    const economia = campanhasBaixas * 100 * 0.4;
    
    recomendacoes.push({
      id: 'otimizar-roas',
      title: 'Otimizar Portfolio de Campanhas META',
      category: 'marketing',
      actions: [
        `Pausar ${campanhasBaixas} anúncios com investimento < R$ 50/mês (economia: R$ ${(economia / 1000).toFixed(1)}K)`,
        'Realocar 70% do budget para top 10 anúncios com ROAS > 2.5x',
        'Criar 3 campanhas de remarketing para 68K cliques sem conversão',
        'Testar variações de copy/criativo nos top performers',
      ],
      impact: `+R$ ${(economia * 1.5 / 1000).toFixed(0)}K/mês`,
      roi: 2.5,
      prazo: '14 dias',
      responsavel: 'Marketing',
      custo: 0,
      prioridade: 0,
      facilidade: 'alta',
    });
  }
  
  // Rec 2: Programa de Retenção
  // REGRA: Só gera se benchmark.taxaRecompra existir
  if (benchmarks.taxaRecompra && atual.clientes.taxaRecompra < benchmarks.taxaRecompra) {
    const gap = benchmarks.taxaRecompra - atual.clientes.taxaRecompra;
    const potencial = (atual.vendas.receita / atual.clientes.taxaRecompra) * gap;
    
    recomendacoes.push({
      id: 'programa-retencao',
      title: 'Lançar Programa de Fidelidade e Retenção',
      category: 'clientes',
      actions: [
        'Criar clube de assinatura com 10% desconto (meta: 50 assinantes no 1º mês)',
        'Implementar email marketing automatizado (D+7, D+30, D+60 pós-compra)',
        'Oferecer cupom de R$ 20 para 2ª compra (válido 30 dias)',
        'WhatsApp personalizado para clientes em risco de churn',
      ],
      impact: `+R$ ${(potencial / 1000).toFixed(1)}K/mês`,
      roi: 3.8,
      prazo: '30 dias',
      responsavel: 'CRM + Marketing',
      custo: 2500,
      prioridade: 0,
      facilidade: 'media',
    });
  }
  
  // Rec 3: Estratégia de Upsell
  // REGRA: Só gera se benchmark.ticketMedio existir
  if (benchmarks.ticketMedio && atual.vendas.ticketMedioReal < benchmarks.ticketMedio) {
    const incremento = benchmarks.ticketMedio - atual.vendas.ticketMedioReal;
    const impacto = incremento * atual.vendas.pedidos;
    
    recomendacoes.push({
      id: 'upsell-estrategia',
      title: 'Implementar Estratégia de Upsell e Cross-sell',
      category: 'vendas',
      actions: [
        'Criar 5 combos de produtos complementares (ex: Ração + Snack + Brinquedo)',
        'Oferecer frete grátis acima de R$ 200 (vs atual R$ 150)',
        'Popup de "Complete seu pedido" com sugestões personalizadas',
        'Desconto progressivo: Leve 3, Pague 2.5',
      ],
      impact: `+R$ ${(impacto / 1000).toFixed(1)}K/mês`,
      roi: 4.2,
      prazo: '21 dias',
      responsavel: 'E-commerce + Produtos',
      custo: 1200,
      prioridade: 0,
      facilidade: 'alta',
    });
  }
  
  // Rec 4: Otimizar Operações (não depende de benchmark - threshold fixo 3.0 dias)
  if (atual.operacoes.tempoEmissaoNF > 3.0) {
    recomendacoes.push({
      id: 'otimizar-operacoes',
      title: 'Acelerar Fulfillment e Reduzir Tempo de NF',
      category: 'operacoes',
      actions: [
        'Automatizar emissão de NF para pedidos < R$ 500 (meta: 80% automático)',
        'Integrar sistema de picking com código de barras',
        'Contratar 1 auxiliar de expedição part-time (picos de demanda)',
        'Meta: Reduzir tempo médio de NF de 3.2 para 2.0 dias',
      ],
      impact: '+12% satisfação cliente',
      roi: 2.1,
      prazo: '45 dias',
      responsavel: 'Operações',
      custo: 4500,
      prioridade: 0,
      facilidade: 'baixa',
    });
  }
  
  // Rec 5: Testar Novos Canais (não depende de benchmark - threshold fixo CAC > 350)
  if (atual.clientes.cac > 350) {
    recomendacoes.push({
      id: 'novos-canais',
      title: 'Diversificar Canais de Aquisição',
      category: 'marketing',
      actions: [
        'Testar Google Ads (budget: R$ 3K/mês por 60 dias)',
        'Parcerias com influencers pet (micro: 10-50K seguidores)',
        'Programa de indicação: R$ 30 crédito para ambos',
        'Marketplace Magalu/Mercado Livre (teste com 10 SKUs)',
      ],
      impact: '+R$ 6K/mês',
      roi: 2.0,
      prazo: '60 dias',
      responsavel: 'Marketing',
      custo: 5000,
      prioridade: 0,
      facilidade: 'media',
    });
  }
  
  // Calcular scores de priorização
  return recomendacoes.map(rec => {
    const roiScore = rec.roi * 0.4;
    const impactoNumerico = parseFloat(rec.impact.replace(/[^0-9.]/g, '')) || 0;
    const impactoScore = (impactoNumerico / 1000) * 0.3;
    const urgenciaScore = rec.facilidade === 'alta' ? 0.2 : rec.facilidade === 'media' ? 0.15 : 0.1;
    const facilidadeScore = rec.facilidade === 'alta' ? 0.1 : rec.facilidade === 'media' ? 0.07 : 0.05;
    
    rec.prioridade = roiScore + impactoScore + urgenciaScore + facilidadeScore;
    return rec;
  }).sort((a, b) => b.prioridade - a.prioridade);
};
