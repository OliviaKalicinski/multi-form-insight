import { AdsData, AdsMetrics } from "@/types/marketing";

export const parseAdsValue = (value: string): number => {
  if (!value || value === "" || value === "N/A" || value === "-") return 0;
  
  const stringValue = String(value).trim();
  
  // Remover caracteres não numéricos (%, x, R$, BRL, espaços)
  let cleaned = stringValue.replace(/[^\d.,-]/g, "");
  
  if (!cleaned) return 0;
  
  // Detectar formato baseado na presença de vírgula e ponto
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  if (hasComma && hasDot) {
    // Determinar qual é o separador de milhar e qual é o decimal
    const lastCommaPos = cleaned.lastIndexOf(',');
    const lastDotPos = cleaned.lastIndexOf('.');
    
    if (lastDotPos > lastCommaPos) {
      // Formato americano: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    } else {
      // Formato brasileiro: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma) {
    // Apenas vírgula - formato brasileiro: 1234,56
    cleaned = cleaned.replace(',', '.');
  } else if (hasDot) {
    // Apenas ponto - formato americano: 1234.56 ou 1.56
    // Já está no formato correto
  }
  
  return parseFloat(cleaned) || 0;
};

/**
 * Helper para buscar valor em múltiplos nomes de coluna possíveis
 * Retorna o primeiro valor encontrado, ou 0 se nenhum existir
 */
export const getValue = (item: AdsData, keys: string[]): number => {
  for (const key of keys) {
    const value = (item as unknown as Record<string, string>)[key];
    if (value !== undefined && value !== "" && value !== null) {
      return parseAdsValue(value);
    }
  }
  return 0;
};

// Helper para LPV com múltiplos nomes de coluna
const getLPV = (item: AdsData): number => {
  return getValue(item, [
    "Visualizações da página de destino do site",
    "Visualizações da página de destino",
    "Landing page views",
    "Website landing page views",
  ]);
};

export const calculateAdsMetrics = (data: AdsData[]): AdsMetrics => {
  if (data.length === 0) {
    return {
      investimentoTotal: 0,
      impressoesTotal: 0,
      alcanceTotal: 0,
      cpmMedio: 0,
      frequenciaMedia: 0,
      cliquesTotal: 0,
      cliquesTodosTotal: 0,
      clicksForFunnel: 0,
      ctrMedio: 0,
      cpcMedio: 0,
      cliquesLinkTotal: 0,
      comprasTotal: 0,
      valorConversaoTotal: 0,
      roas: 0,
      custoPorCompra: 0,
      visualizacoesPaginaTotal: 0,
      adicoesCarrinhoTotal: 0,
      taxaConversaoCarrinho: 0,
      engajamentosTotal: 0,
      visualizacoesTotal: 0,
      roi: 0,
      ticketMedio: 0,
      taxaEngajamento: 0,
      taxaConversaoResultados: 0,
      cliquesDesaida: 0,
      taxaConversao: 0,
      taxaAddCarrinho: 0,
      taxaAbandonoCarrinho: 0,
      // Métricas de Engajamento
      resultadosTotal: 0,
      custoPorResultadoMedio: 0,
      visitasPerfilTotal: 0,
    };
  }

  // Calcular totais com suporte a múltiplos nomes de coluna (PT/EN)
  const investimentoTotal = data.reduce((sum, item) => 
    sum + getValue(item, [
      "Valor usado (BRL)",
      "Amount spent (BRL)",
      "Amount spent",
      "Valor gasto",
      "Spent",
    ]), 0);

  const impressoesTotal = data.reduce((sum, item) => 
    sum + getValue(item, [
      "Impressões",
      "Impressions",
    ]), 0);

  const alcanceTotal = data.reduce((sum, item) => 
    sum + getValue(item, [
      "Alcance",
      "Reach",
      "Alcance (pessoas)",
      "Alcance único",
      "Accounts reached",
      "People reached",
    ]), 0);

  const cliquesTodosTotal = data.reduce((sum, item) => 
    sum + getValue(item, [
      "Cliques (todos)",
      "Clicks (all)",
      "All clicks",
    ]), 0);

  const cliquesLinkTotal = data.reduce((sum, item) => 
    sum + getValue(item, [
      "Cliques no link",
      "Link clicks",
      "Cliques de link",
    ]), 0);

  const cliquesDesaida = data.reduce((sum, item) => 
    sum + getValue(item, [
      "Cliques de saída",
      "Outbound clicks",
      "Cliques externos",
    ]), 0);

  const comprasTotal = data.reduce((sum, item) => 
    sum + getValue(item, [
      "Compras",
      "Purchases",
      "Purchase",
    ]), 0);

  const valorConversaoTotal = data.reduce((sum, item) => 
    sum + getValue(item, [
      "Valor de conversão da compra",
      "Purchase conversion value",
      "Conversion value",
      "Valor de conversão",
    ]), 0);

  const adicoesCarrinhoTotal = data.reduce((sum, item) => 
    sum + getValue(item, [
      "Adições ao carrinho",
      "Adds to cart",
      "Add to cart",
    ]), 0);

  const visualizacoesPaginaTotal = data.reduce((sum, item) => sum + getLPV(item), 0);

  const engajamentosTotal = data.reduce((sum, item) => 
    sum + getValue(item, [
      "Engajamentos com o post",
      "Post engagements",
      "Engagements",
      "Post engagement",
      "Engajamentos",
    ]), 0);

  const visualizacoesTotal = data.reduce((sum, item) => 
    sum + getValue(item, [
      "Visualizações",
      "Views",
      "Video views",
      "ThruPlays",
    ]), 0);

  // Métricas de Engajamento (novas)
  const resultadosTotal = data.reduce((sum, item) => 
    sum + getValue(item, [
      "Resultados",
      "Results",
      "Resultado",
      "Result",
    ]), 0);

  const visitasPerfilTotal = data.reduce((sum, item) => 
    sum + getValue(item, [
      "Visitas ao perfil do Instagram",
      "Instagram profile visits",
      "Profile visits",
      "Visitas ao perfil",
    ]), 0);

  const custoPorResultadoMedio = resultadosTotal > 0 ? investimentoTotal / resultadosTotal : 0;

  // Fonte de cliques consistente para funil (prioridade: saída > link > todos)
  // Campanhas puramente de engajamento usam cliques (todos) diretamente
  const hasEngagementOnly = engajamentosTotal > 0 && comprasTotal === 0 && cliquesLinkTotal === 0;
  const clicksForFunnel = hasEngagementOnly
    ? cliquesTodosTotal
    : (cliquesDesaida || cliquesLinkTotal || cliquesTodosTotal);

  // Frequência = Impressões / Alcance (ponderada automaticamente)
  const frequenciaMedia = alcanceTotal > 0 ? impressoesTotal / alcanceTotal : 0;
  
  const cpmMedio = impressoesTotal > 0 ? (investimentoTotal / impressoesTotal) * 1000 : 0;
  
  // KPIs de clique usando fonte padronizada de funil
  const ctrMedio = impressoesTotal > 0 ? (clicksForFunnel / impressoesTotal) * 100 : 0;
  const cpcMedio = clicksForFunnel > 0 ? investimentoTotal / clicksForFunnel : 0;

  // Calcular KPIs de conversão
  const roas = investimentoTotal > 0 ? valorConversaoTotal / investimentoTotal : 0;
  const custoPorCompra = comprasTotal > 0 ? investimentoTotal / comprasTotal : 0;
  const taxaConversaoCarrinho = adicoesCarrinhoTotal > 0 ? (comprasTotal / adicoesCarrinhoTotal) * 100 : 0;
  
  // Novos KPIs
  const roi = investimentoTotal > 0 ? ((valorConversaoTotal - investimentoTotal) / investimentoTotal) * 100 : 0;
  const ticketMedio = comprasTotal > 0 ? valorConversaoTotal / comprasTotal : 0;
  
  // Taxa de engajamento pura (engajamentos / alcance)
  const taxaEngajamento = alcanceTotal > 0 ? (engajamentosTotal / alcanceTotal) * 100 : 0;
  // Taxa de conversão por resultados (resultados / alcance)
  const taxaConversaoResultados = alcanceTotal > 0 ? (resultadosTotal / alcanceTotal) * 100 : 0;
  
  // Taxa de conversão consistente com CTR/CPC (usa clicksForFunnel)
  const taxaConversao = clicksForFunnel > 0 ? (comprasTotal / clicksForFunnel) * 100 : 0;
  const taxaAddCarrinho = visualizacoesPaginaTotal > 0 ? (adicoesCarrinhoTotal / visualizacoesPaginaTotal) * 100 : 0;
  const taxaAbandonoCarrinho = adicoesCarrinhoTotal > 0 ? 100 - ((comprasTotal / adicoesCarrinhoTotal) * 100) : 0;

  return {
    investimentoTotal,
    impressoesTotal,
    alcanceTotal,
    cpmMedio,
    frequenciaMedia,
    cliquesTotal: clicksForFunnel, // Mantém retrocompatibilidade, agora é o valor de funil
    cliquesTodosTotal,             // Cliques (todos) para referência
    clicksForFunnel,               // Cliques usados para CTR/CPC/Conversão
    ctrMedio,
    cpcMedio,
    cliquesLinkTotal,
    comprasTotal,
    valorConversaoTotal,
    roas,
    custoPorCompra,
    visualizacoesPaginaTotal,
    adicoesCarrinhoTotal,
    taxaConversaoCarrinho,
    engajamentosTotal,
    visualizacoesTotal,
    roi,
    ticketMedio,
    taxaEngajamento,
    taxaConversaoResultados,
    cliquesDesaida,
    taxaConversao,
    taxaAddCarrinho,
    taxaAbandonoCarrinho,
    // Métricas de Engajamento
    resultadosTotal,
    custoPorResultadoMedio,
    visitasPerfilTotal,
  };
};

export const extractDailyAdsMetrics = (
  data: AdsData[], 
  metric: 'investimento' | 'compras' | 'roas'
): { date: string; value: number }[] => {
  return data.map(item => {
    let value = 0;
    const startDate = item["Início dos relatórios"];
    
    switch(metric) {
      case 'investimento': value = getValue(item, ["Valor usado (BRL)", "Amount spent (BRL)", "Amount spent", "Amount Spent", "Valor gasto", "Spent"]); break;
      case 'compras': value = getValue(item, ["Compras", "Purchases", "Purchase"]); break;
      case 'roas': value = getValue(item, ["ROAS de resultados", "ROAS (results)", "Result ROAS"]); break;
    }
    
    return { date: startDate?.substring(0, 10) || "", value };
  });
};
