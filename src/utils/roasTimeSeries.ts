/**
 * R35 — Série temporal de ROAS por mês (4 séries: Bruto, Real, Meta, Venda).
 *
 * Reusa exatamente as mesmas fórmulas de PerformanceFinanceira.tsx para
 * cada mês isolado. Saída pronta pra LineChart Recharts.
 */

import { format, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { AdsData, ProcessedOrder } from "@/types/marketing";
import { calculateAdsMetrics } from "./adsCalculator";
import { filterAdsByMonth, filterAdsByObjective } from "./adsParserV2";
import { getRevenueOrders, getOfficialRevenue } from "./revenue";

export interface RoasMonthlyPoint {
  /** Label "MMM/yy" pra eixo X */
  label: string;
  /** "yyyy-MM" — ordenação interna */
  month: string;
  roasBruto: number;
  roasReal: number;
  roasMeta: number;
  roasVenda: number;
}

/**
 * Calcula 4 ROAS por mês para os últimos `monthsBack` meses.
 *
 * - roasBruto = Faturamento total (com frete) ÷ Investimento
 * - roasReal  = Faturamento ex-frete ÷ Investimento
 * - roasMeta  = Valor de conversão Meta ÷ Investimento (só Meta)
 * - roasVenda = Valor conversão (só campanhas VENDAS) ÷ Investimento (só VENDAS)
 *
 * Mês sem investimento → ROAS = 0 nesse mês (não dá NaN).
 */
export function buildRoasTimeSeries(
  salesData: ProcessedOrder[],
  adsData: AdsData[],
  monthsBack = 12,
): RoasMonthlyPoint[] {
  if (!adsData.length && !salesData.length) return [];

  const today = new Date();
  const start = startOfMonth(new Date(today.getFullYear(), today.getMonth() - (monthsBack - 1), 1));
  const end = endOfMonth(today);
  const months = eachMonthOfInterval({ start, end });

  return months.map((monthDate) => {
    const monthStr = format(monthDate, "yyyy-MM");
    const monthAds = filterAdsByMonth(adsData, monthStr);
    const monthSales = salesData.filter(
      (o) => format(o.dataVenda, "yyyy-MM") === monthStr,
    );

    const adsMetrics = monthAds.length > 0 ? calculateAdsMetrics(monthAds) : null;
    const investimento = adsMetrics?.investimentoTotal || 0;
    const valorConversaoMeta = adsMetrics?.valorConversaoTotal || 0;

    const vendasAds = filterAdsByObjective(monthAds, "VENDAS");
    const vendasMetrics = vendasAds.length > 0 ? calculateAdsMetrics(vendasAds) : null;
    const investimentoVendas = vendasMetrics?.investimentoTotal || 0;
    const valorConversaoVendas = vendasMetrics?.valorConversaoTotal || 0;

    const revenueOrders = getRevenueOrders(monthSales);
    const faturamentoTotal = revenueOrders.reduce((s, o) => s + getOfficialRevenue(o), 0);
    const freteTotal = revenueOrders.reduce((s, o) => s + (o.valorFrete || 0), 0);
    const faturamentoExFrete = faturamentoTotal - freteTotal;

    return {
      label: format(monthDate, "MMM/yy").toLowerCase(),
      month: monthStr,
      roasBruto: investimento > 0 ? faturamentoTotal / investimento : 0,
      roasReal: investimento > 0 ? faturamentoExFrete / investimento : 0,
      roasMeta: investimento > 0 ? valorConversaoMeta / investimento : 0,
      roasVenda: investimentoVendas > 0 ? valorConversaoVendas / investimentoVendas : 0,
    };
  });
}
