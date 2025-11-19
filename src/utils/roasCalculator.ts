import { ProcessedOrder, AdsData, ROASMetrics } from "@/types/marketing";
import { parseAdsValue } from "./adsCalculator";

/**
 * Estima custo de frete com base na forma de envio
 * Valores baseados em médias do mercado brasileiro
 */
export const estimateShippingCost = (formaEnvio: string, valorPedido: number): number => {
  const forma = formaEnvio.toLowerCase();
  
  // PAC/Sedex - frete médio 10-15% do valor do pedido
  if (forma.includes('pac') || forma.includes('sedex') || forma.includes('correios')) {
    return valorPedido * 0.12; // 12% estimativa média
  }
  
  // Transportadora - frete mais alto
  if (forma.includes('transportadora') || forma.includes('jadlog') || forma.includes('tnt')) {
    return valorPedido * 0.15; // 15% estimativa
  }
  
  // Frete grátis / Retirada
  if (forma.includes('grátis') || forma.includes('gratis') || forma.includes('retirada')) {
    return 0;
  }
  
  // Frete expresso
  if (forma.includes('expresso') || forma.includes('express')) {
    return valorPedido * 0.18; // 18% estimativa
  }
  
  // Default: 12% se não identificar
  return valorPedido * 0.12;
};

/**
 * Calcula ROAS real baseado em faturamento líquido e investimento em ads
 * Agora usa valores reais de frete quando disponíveis
 */
export const calculateROAS = (
  orders: ProcessedOrder[],
  adsData: AdsData[]
): ROASMetrics => {
  // Calcular faturamento bruto
  const faturamentoBruto = orders.reduce((sum, order) => sum + order.valorTotal, 0);
  
  // Usar valores reais de frete quando disponíveis
  const custoFrete = orders.reduce((sum, order) => {
    // Se tem valor de frete real, usar ele
    if (order.valorFrete && order.valorFrete > 0) {
      return sum + order.valorFrete;
    }
    // Se não tem, estimar (fallback para CSVs antigos)
    return sum + estimateShippingCost(order.formaEnvio, order.valorTotal);
  }, 0);
  
  // Contar quantos pedidos usaram valor real vs estimado
  const pedidosComFreteReal = orders.filter(o => o.valorFrete && o.valorFrete > 0).length;
  const usandoEstimativa = pedidosComFreteReal < orders.length;
  
  console.log(`🚚 Cálculo de frete: ${pedidosComFreteReal}/${orders.length} com valores reais`);
  if (usandoEstimativa) {
    console.log(`⚠️ Alguns pedidos estão usando estimativa de frete`);
  }
  
  // Calcular faturamento líquido (sem frete)
  const faturamentoLiquido = faturamentoBruto - custoFrete;
  
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
  const margemLiquida = faturamentoBruto > 0 ? ((faturamentoLiquido - investimentoAds) / faturamentoBruto) * 100 : 0;
  
  return {
    faturamentoBruto,
    custoFrete,
    faturamentoLiquido,
    investimentoAds,
    roas,
    roi,
    margemLiquida,
    usandoEstimativa,
  };
};
