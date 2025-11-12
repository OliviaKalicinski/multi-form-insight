import { AdsData, AdsMetrics, AdsMonthSummary } from "@/types/marketing";
import { calculateAdsMetrics } from "./adsCalculator";

/**
 * Extrai o mês no formato YYYY-MM de uma string de período
 * Exemplo: "2025-10-01 - 2025-10-31" => "2025-10"
 */
export const extractMonthFromPeriod = (period: string): string => {
  if (!period) return "";
  const match = period.match(/(\d{4}-\d{2})-\d{2}/);
  return match ? match[1] : "";
};

/**
 * Extrai o mês de uma linha de dados, priorizando a coluna "Mês" do novo formato
 */
export const extractMonth = (row: AdsData): string => {
  // Novo formato: coluna "Mês"
  if (row["Mês"]) {
    return extractMonthFromPeriod(row["Mês"]);
  }
  
  // Formato antigo: coluna "Início dos relatórios"
  if (row["Início dos relatórios"]) {
    const match = row["Início dos relatórios"].match(/(\d{4}-\d{2})-\d{2}/);
    return match ? match[1] : "";
  }
  
  return "";
};

/**
 * Verifica se uma linha é um resumo mensal (Nome do anúncio = "All")
 */
export const isMonthSummaryRow = (row: AdsData): boolean => {
  return row["Nome do anúncio"]?.trim().toLowerCase() === "all";
};

/**
 * Parser para o novo formato hierárquico de ads
 * Detecta linhas "All" como resumos mensais e agrupa anúncios individuais
 */
export const parseHierarchicalAds = (data: AdsData[]): {
  monthlySummaries: AdsMonthSummary[];
  individualAds: AdsData[];
  hasHierarchicalFormat: boolean;
} => {
  const monthlySummaries: AdsMonthSummary[] = [];
  const individualAds: AdsData[] = [];
  let currentMonth = "";
  let hasHierarchicalFormat = false;

  for (const row of data) {
    const month = extractMonth(row);
    
    if (isMonthSummaryRow(row)) {
      // Esta é uma linha de resumo mensal
      hasHierarchicalFormat = true;
      currentMonth = month;
      
      const metrics = calculateAdsMetrics([row]);
      monthlySummaries.push({
        month,
        data: metrics,
        rawData: row,
      });
    } else {
      // Esta é uma linha de anúncio individual
      // Se estamos no novo formato, usar o último mês visto
      // Se não, extrair o mês da própria linha
      const adMonth = hasHierarchicalFormat && currentMonth ? currentMonth : month;
      
      // Adicionar o mês extraído ao objeto do anúncio
      const adWithMonth: AdsData = {
        ...row,
        "Mês": adMonth || row["Mês"],
      };
      
      individualAds.push(adWithMonth);
    }
  }

  return {
    monthlySummaries,
    individualAds,
    hasHierarchicalFormat,
  };
};

/**
 * Valida a consistência entre resumos mensais e anúncios individuais
 */
export const validateAdsConsistency = (
  monthlySummaries: AdsMonthSummary[],
  individualAds: AdsData[]
): { isConsistent: boolean; warnings: string[] } => {
  const warnings: string[] = [];

  for (const summary of monthlySummaries) {
    const monthAds = individualAds.filter(ad => extractMonth(ad) === summary.month);
    
    if (monthAds.length === 0) {
      warnings.push(`Resumo mensal encontrado para ${summary.month}, mas nenhum anúncio individual.`);
      continue;
    }

    // Calcular métricas dos anúncios individuais
    const calculatedMetrics = calculateAdsMetrics(monthAds);
    
    // Comparar investimento total (com margem de erro de 1%)
    const investmentDiff = Math.abs(
      summary.data.investimentoTotal - calculatedMetrics.investimentoTotal
    ) / summary.data.investimentoTotal;
    
    if (investmentDiff > 0.01) {
      warnings.push(
        `Divergência de investimento em ${summary.month}: ` +
        `Resumo: R$ ${summary.data.investimentoTotal.toFixed(2)}, ` +
        `Calculado: R$ ${calculatedMetrics.investimentoTotal.toFixed(2)}`
      );
    }
  }

  return {
    isConsistent: warnings.length === 0,
    warnings,
  };
};

/**
 * Filtra anúncios por mês
 */
export const filterAdsByMonth = (data: AdsData[], month: string): AdsData[] => {
  return data.filter(ad => extractMonth(ad) === month);
};

/**
 * Extrai meses disponíveis de um array de anúncios
 */
export const extractAvailableMonths = (data: AdsData[]): string[] => {
  const months = new Set<string>();
  
  for (const row of data) {
    const month = extractMonth(row);
    if (month) {
      months.add(month);
    }
  }
  
  return Array.from(months).sort();
};
