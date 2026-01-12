import { MarketingData, FollowersData, AdsData } from "@/types/marketing";
import { extractMonth } from "./adsParserV2";

export interface MonthlyAggregate {
  month: string;
  monthLabel: string;
  [key: string]: any;
}

// Helper: parseInt seguro (evita NaN)
const safeInt = (v?: string): number => {
  const n = parseInt((v ?? "0").trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

export const aggregateMarketingByMonth = (
  data: MarketingData[],
  months: string[]
): MonthlyAggregate[] => {
  const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  // Garantir ordem cronológica
  const sortedMonths = [...months].sort();

  return sortedMonths.map((month) => {
    const monthData = data.filter((item) => item.Data.startsWith(month));
    
    const [year, monthNum] = month.split("-");
    const monthLabel = `${monthNames[parseInt(monthNum) - 1]}/${year.slice(2)}`;

    return {
      month,
      monthLabel,
      Visualizações: monthData.reduce((sum, item) => sum + safeInt(item.Visualizações), 0),
      Alcance: monthData.reduce((sum, item) => sum + safeInt(item.Alcance), 0),
      Visitas: monthData.reduce((sum, item) => sum + safeInt(item.Visitas), 0),
      Interações: monthData.reduce((sum, item) => sum + safeInt(item.Interações), 0),
      "Clicks no Link": monthData.reduce((sum, item) => sum + safeInt(item["Clicks no Link"]), 0),
    };
  });
};

export const aggregateFollowersByMonth = (
  data: FollowersData[],
  months: string[]
): MonthlyAggregate[] => {
  const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  // Garantir ordem cronológica
  const sortedMonths = [...months].sort();

  let cumulativeGrowth = 0;

  return sortedMonths.map((month) => {
    const monthData = data.filter((item) => item.Data.startsWith(month));
    
    const [year, monthNum] = month.split("-");
    const monthLabel = `${monthNames[parseInt(monthNum) - 1]}/${year.slice(2)}`;

    // Somar TODOS os valores do mês (cada valor representa novos seguidores do dia)
    const newFollowers = monthData.reduce((sum, item) => {
      return sum + safeInt(item.Seguidores);
    }, 0);

    // Acumular o crescimento
    cumulativeGrowth += newFollowers;

    return {
      month,
      monthLabel,
      Seguidores: cumulativeGrowth,
      NovosSeguidores: newFollowers,
      CrescimentoAcumulado: cumulativeGrowth,
    };
  });
};

export const aggregateAdsByMonth = (
  data: AdsData[],
  months: string[]
): AdsData[] => {
  // Usar extractMonth para consistência com o resto do sistema
  return data.filter((ad) => {
    const adMonth = extractMonth(ad);
    return months.includes(adMonth);
  });
};
