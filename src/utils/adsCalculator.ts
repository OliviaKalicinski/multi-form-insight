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

// Helper para LPV com múltiplos nomes de coluna
const getLPV = (item: AdsData): number => {
  return parseAdsValue(
    item["Visualizações da página de destino do site"] ?? 
    (item as any)["Visualizações da página de destino"] ?? 
    (item as any)["Landing page views"] ?? 
    "0"
  );
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

  // Calcular totais
  const investimentoTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Valor usado (BRL)"]), 0);
  const impressoesTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Impressões"]), 0);
  const alcanceTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Alcance"]), 0);
  const cliquesTodosTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Cliques (todos)"]), 0);
  const cliquesLinkTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Cliques no link"]), 0);
  const cliquesDesaida = data.reduce((sum, item) => sum + parseAdsValue(item["Cliques de saída"]), 0);
  const comprasTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Compras"]), 0);
  const valorConversaoTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Valor de conversão da compra"]), 0);
  const adicoesCarrinhoTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Adições ao carrinho"]), 0);
  const visualizacoesPaginaTotal = data.reduce((sum, item) => sum + getLPV(item), 0);
  const engajamentosTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Engajamentos com o post"]), 0);
  const visualizacoesTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Visualizações"]), 0);

  // Métricas de Engajamento (novas)
  const resultadosTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Resultados"]), 0);
  const visitasPerfilTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Visitas ao perfil do Instagram"]), 0);
  const custoPorResultadoMedio = resultadosTotal > 0 ? investimentoTotal / resultadosTotal : 0;

  // Fonte de cliques consistente para funil (prioridade: saída > link > todos)
  const clicksForFunnel = cliquesDesaida || cliquesLinkTotal || cliquesTodosTotal;

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
  const taxaEngajamento = alcanceTotal > 0 ? (engajamentosTotal / alcanceTotal) * 100 : 0;
  
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
      case 'investimento': value = parseAdsValue(item["Valor usado (BRL)"]); break;
      case 'compras': value = parseAdsValue(item["Compras"]); break;
      case 'roas': value = parseAdsValue(item["ROAS de resultados"]); break;
    }
    
    return { date: startDate?.substring(0, 10) || "", value };
  });
};
