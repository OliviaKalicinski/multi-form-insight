import { ProcessedOrder, AdsData, ROASMetrics } from "@/types/marketing";
import { parseAdsValue } from "./adsCalculator";
import { getOfficialRevenue } from "./revenue";

/**
 * Calcula ROAS real baseado em receita fiscal e investimento em ads
 * Receita fiscal = getOfficialRevenue (totalFaturado ou valorTotal + frete)
 */
export const calculateROAS = (
  orders: ProcessedOrder[],
  adsData: AdsData[]
): ROASMetrics => {
  // Receita fiscal (inclui frete)
  const faturamentoLiquido = orders.reduce((sum, order) => sum + getOfficialRevenue(order), 0);
  
  // Calcular investimento total em ads
  const investimentoAds = adsData.reduce(
    (sum, item) => sum + parseAdsValue(item["Valor usado (BRL)"]), 
    0
  );
  
  // Calcular ROAS (retorno sobre investimento em ads)
  const roas = investimentoAds > 0 ? faturamentoLiquido / investimentoAds : 0;
  
  // Calcular ROI em % = ((Receita - Custo) / Custo) * 100
  const roi = investimentoAds > 0 ? ((faturamentoLiquido - investimentoAds) / investimentoAds) * 100 : 0;
  
  // Calcular margem líquida = ((Receita - Custo) / Receita) * 100
  const margemLiquida = faturamentoLiquido > 0 ? ((faturamentoLiquido - investimentoAds) / faturamentoLiquido) * 100 : 0;
  
  return {
    faturamentoLiquido,
    investimentoAds,
    roas,
    roi,
    margemLiquida,
  };
};
