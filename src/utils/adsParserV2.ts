import { AdsData, AdsMetrics, AdsMonthSummary } from "@/types/marketing";
import { calculateAdsMetrics } from "./adsCalculator";

/**
 * Extrai o mês no formato YYYY-MM de uma string de período
 * Suporta múltiplos formatos:
 * - "2025-10" => "2025-10"
 * - "2025-10-01 - 2025-10-31" => "2025-10"
 * - "2025-10-01" => "2025-10"
 * - "01/10/2025" => "2025-10"
 */
export const extractMonthFromPeriod = (period: string): string => {
  if (!period) return "";

  const trimmed = period.trim();

  // Formato puro YYYY-MM
  const pureDateMatch = trimmed.match(/^(\d{4}-\d{2})$/);
  if (pureDateMatch) return pureDateMatch[1];

  // Formato com dia: YYYY-MM-DD ou "YYYY-MM-DD - YYYY-MM-DD"
  const dateWithDayMatch = trimmed.match(/(\d{4}-\d{2})-\d{2}/);
  if (dateWithDayMatch) return dateWithDayMatch[1];

  // Formato DD/MM/YYYY
  const brDateMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brDateMatch) {
    const [, , month, year] = brDateMatch;
    return `${year}-${month}`;
  }

  return "";
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
    return extractMonthFromPeriod(row["Início dos relatórios"]);
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
 * Se não houver linhas "All", calcula resumos automaticamente
 */
export const parseHierarchicalAds = (
  data: AdsData[],
): {
  monthlySummaries: AdsMonthSummary[];
  individualAds: AdsData[];
  hasHierarchicalFormat: boolean;
} => {
  const monthlySummaries: AdsMonthSummary[] = [];
  const individualAds: AdsData[] = [];
  let currentMonth = "";
  let hasAllLines = false;

  // Primeira passagem: separar linhas "All" de anúncios individuais
  for (const row of data) {
    const month = extractMonth(row);

    if (isMonthSummaryRow(row)) {
      // Esta é uma linha de resumo mensal
      hasAllLines = true;
      currentMonth = month;

      const metrics = calculateAdsMetrics([row]);
      monthlySummaries.push({
        month,
        data: metrics,
        rawData: row,
      });
    } else {
      // Esta é uma linha de anúncio individual
      const adMonth = hasAllLines && currentMonth ? currentMonth : month;

      const adWithMonth: AdsData = {
        ...row,
        Mês: adMonth || row["Mês"],
      };

      individualAds.push(adWithMonth);
    }
  }

  // Se não houver linhas "All", calcular resumos a partir dos anúncios individuais
  if (!hasAllLines && individualAds.length > 0) {
    const monthGroups = new Map<string, AdsData[]>();

    // Agrupar anúncios por mês
    for (const ad of individualAds) {
      const month = extractMonth(ad);
      if (month) {
        if (!monthGroups.has(month)) {
          monthGroups.set(month, []);
        }
        monthGroups.get(month)!.push(ad);
      }
    }

    // Calcular resumos mensais a partir dos anúncios agrupados
    for (const [month, ads] of monthGroups.entries()) {
      const metrics = calculateAdsMetrics(ads);
      monthlySummaries.push({
        month,
        data: metrics,
        rawData: ads[0], // Usar primeiro anúncio como referência para dados brutos
      });
    }

    // Ordenar resumos por mês
    monthlySummaries.sort((a, b) => a.month.localeCompare(b.month));
  }

  return {
    monthlySummaries,
    individualAds,
    hasHierarchicalFormat: hasAllLines,
  };
};

/**
 * Valida a consistência entre resumos mensais e anúncios individuais
 */
export const validateAdsConsistency = (
  monthlySummaries: AdsMonthSummary[],
  individualAds: AdsData[],
): { isConsistent: boolean; warnings: string[] } => {
  const warnings: string[] = [];

  for (const summary of monthlySummaries) {
    const monthAds = individualAds.filter((ad) => extractMonth(ad) === summary.month);

    if (monthAds.length === 0) {
      warnings.push(`Resumo mensal encontrado para ${summary.month}, mas nenhum anúncio individual.`);
      continue;
    }

    // Calcular métricas dos anúncios individuais
    const calculatedMetrics = calculateAdsMetrics(monthAds);

    // Evitar divisão por zero
    const investmentDenominator = summary.data.investimentoTotal || 1;
    const investmentDiff =
      Math.abs(summary.data.investimentoTotal - calculatedMetrics.investimentoTotal) / investmentDenominator;

    if (investmentDiff > 0.01) {
      warnings.push(
        `Divergência de investimento em ${summary.month}: ` +
          `Resumo: R$ ${summary.data.investimentoTotal.toFixed(2)}, ` +
          `Calculado: R$ ${calculatedMetrics.investimentoTotal.toFixed(2)}`,
      );
    }

    // Validar impressões também
    const impressionsDenominator = summary.data.impressoesTotal || 1;
    const impressionsDiff =
      Math.abs(summary.data.impressoesTotal - calculatedMetrics.impressoesTotal) / impressionsDenominator;

    if (impressionsDiff > 0.01) {
      warnings.push(
        `Divergência de impressões em ${summary.month}: ` +
          `Resumo: ${summary.data.impressoesTotal.toLocaleString()}, ` +
          `Calculado: ${calculatedMetrics.impressoesTotal.toLocaleString()}`,
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
  return data.filter((ad) => extractMonth(ad) === month);
};

/**
 * Filtra anúncios por intervalo de datas.
 * Como dados de ads têm granularidade mensal, inclui meses que se sobrepõem ao intervalo.
 */
export const filterAdsByDateRange = (data: AdsData[], start: Date, end: Date): AdsData[] => {
  const startStr = start.toISOString().split("T")[0]; // YYYY-MM-DD
  const endStr = end.toISOString().split("T")[0];
  const startMonth = startStr.substring(0, 7); // YYYY-MM
  const endMonth = endStr.substring(0, 7);

  return data.filter((ad) => {
    const dateField = ad["Início dos relatórios"] || "";

    // Formato diário YYYY-MM-DD (dados da Meta API)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateField.trim())) {
      return dateField >= startStr && dateField <= endStr;
    }

    // Formato mensal legado (dados CSV)
    const month = extractMonth(ad);
    return month >= startMonth && month <= endMonth;
  });
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

/**
 * Extrai o objetivo de um anúncio
 * Prioriza o campo "Objetivo" explícito, com fallback de inferência por métricas
 */
export const getAdObjective = (ad: AdsData): string => {
  const objetivo = ad["Objetivo"] || "";

  // 1. Se já tem objetivo explícito, usar
  if (objetivo.includes("OUTCOME_SALES")) return "OUTCOME_SALES";
  if (objetivo.includes("OUTCOME_ENGAGEMENT")) return "OUTCOME_ENGAGEMENT";
  if (objetivo.includes("OUTCOME_TRAFFIC")) return "OUTCOME_TRAFFIC";
  if (objetivo.includes("OUTCOME_AWARENESS")) return "OUTCOME_AWARENESS";
  if (objetivo.includes("OUTCOME_LEADS")) return "OUTCOME_LEADS";

  // 2. FALLBACK: Inferir baseado nas métricas disponíveis
  // Se tem compras, receita ou adições ao carrinho → é Sales
  const compras = parseFloat(ad["Compras"] || "0");
  const receita = parseFloat(ad["Valor de conversão da compra"] || "0");
  const adicoesCarrinho = parseFloat(ad["Adições ao carrinho"] || "0");

  if (compras > 0 || receita > 0 || adicoesCarrinho > 0) {
    return "OUTCOME_SALES";
  }

  // Se tem engajamentos ou resultados (sem sales) → é Engagement
  const engajamentos = parseFloat(ad["Engajamentos com o post"] || "0");
  const resultados = parseFloat(ad["Resultados"] || "0");

  if (engajamentos > 0 || resultados > 0) {
    return "OUTCOME_ENGAGEMENT";
  }

  return "UNKNOWN";
};

/**
 * Filtra anúncios por objetivo
 * @param data Array de anúncios
 * @param objective Objetivo desejado (OUTCOME_SALES, OUTCOME_ENGAGEMENT, etc)
 * @returns Apenas anúncios com o objetivo especificado
 */
export const filterAdsByObjective = (data: AdsData[], objective: string): AdsData[] => {
  return data.filter((ad) => getAdObjective(ad) === objective);
};

/**
 * Determina o objetivo principal baseado na hierarquia: Sales > Engagement > outros
 * @returns O objetivo principal ou "ALL" se não houver distinção
 */
export const determinePrimaryObjective = (data: AdsData[]): "OUTCOME_SALES" | "OUTCOME_ENGAGEMENT" | "ALL" => {
  const hasSales = data.some((ad) => getAdObjective(ad) === "OUTCOME_SALES");
  const hasEngagement = data.some((ad) => getAdObjective(ad) === "OUTCOME_ENGAGEMENT");

  if (hasSales) return "OUTCOME_SALES";
  if (hasEngagement) return "OUTCOME_ENGAGEMENT";
  return "ALL";
};
