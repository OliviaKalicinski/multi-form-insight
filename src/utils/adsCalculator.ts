import { AdsData, AdsMetrics } from "@/types/marketing";
import { format } from "date-fns";

export const parseAdsValue = (value: string): number => {
  if (!value || value === "" || value === "N/A" || value === "-") return 0;
  // Remove pontos de milhar e substitui vírgula por ponto
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

export const filterAdsByMonth = (data: AdsData[], month: string): AdsData[] => {
  return data.filter((item) => {
    try {
      const startDate = new Date(item["Início dos relatórios"]);
      const itemMonth = format(startDate, "yyyy-MM");
      return itemMonth === month;
    } catch {
      return false;
    }
  });
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
    };
  }

  // Calcular totais
  const investimentoTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Valor usado (BRL)"]), 0);
  const impressoesTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Impressões"]), 0);
  const alcanceTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Alcance"]), 0);
  const cliquesTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Cliques (todos)"]), 0);
  const cliquesLinkTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Cliques no link"]), 0);
  const comprasTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Compras"]), 0);
  const valorConversaoTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Valor de conversão da compra"]), 0);
  const adicoesCarrinhoTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Adições ao carrinho"]), 0);
  const visualizacoesPaginaTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Visualizações da página de destino do site"]), 0);
  const engajamentosTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Engajamentos com o post"]), 0);
  const visualizacoesTotal = data.reduce((sum, item) => sum + parseAdsValue(item["Visualizações"]), 0);

  // Calcular médias
  const frequenciaMedia = data.reduce((sum, item) => sum + parseAdsValue(item["Frequência"]), 0) / data.length;
  
  const cpmMedio = impressoesTotal > 0 ? (investimentoTotal / impressoesTotal) * 1000 : 0;
  const ctrMedio = impressoesTotal > 0 ? (cliquesTotal / impressoesTotal) * 100 : 0;
  const cpcMedio = cliquesTotal > 0 ? investimentoTotal / cliquesTotal : 0;

  // Calcular KPIs de conversão
  const roas = investimentoTotal > 0 ? valorConversaoTotal / investimentoTotal : 0;
  const custoPorCompra = comprasTotal > 0 ? investimentoTotal / comprasTotal : 0;
  const taxaConversaoCarrinho = adicoesCarrinhoTotal > 0 ? (comprasTotal / adicoesCarrinhoTotal) * 100 : 0;

  return {
    investimentoTotal,
    impressoesTotal,
    alcanceTotal,
    cpmMedio,
    frequenciaMedia,
    cliquesTotal,
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
  };
};
