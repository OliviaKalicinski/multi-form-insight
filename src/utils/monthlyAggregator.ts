import { MarketingData, FollowersData, AdsData } from "@/types/marketing";

export interface MonthlyAggregate {
  month: string;
  monthLabel: string;
  [key: string]: any;
}

export const aggregateMarketingByMonth = (
  data: MarketingData[],
  months: string[]
): MonthlyAggregate[] => {
  const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  return months.map((month) => {
    const monthData = data.filter((item) => item.Data.startsWith(month));
    
    const [year, monthNum] = month.split("-");
    const monthLabel = `${monthNames[parseInt(monthNum) - 1]}/${year.slice(2)}`;

    return {
      month,
      monthLabel,
      Visualizações: monthData.reduce((sum, item) => sum + parseInt(item.Visualizações || "0"), 0),
      Alcance: monthData.reduce((sum, item) => sum + parseInt(item.Alcance || "0"), 0),
      Visitas: monthData.reduce((sum, item) => sum + parseInt(item.Visitas || "0"), 0),
      Interações: monthData.reduce((sum, item) => sum + parseInt(item.Interações || "0"), 0),
      "Clicks no Link": monthData.reduce((sum, item) => sum + parseInt(item["Clicks no Link"] || "0"), 0),
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

  let cumulativeGrowth = 0;

  return months.map((month, index) => {
    const monthData = data.filter((item) => item.Data.startsWith(month));
    
    const [year, monthNum] = month.split("-");
    const monthLabel = `${monthNames[parseInt(monthNum) - 1]}/${year.slice(2)}`;

    // Somar TODOS os valores do mês (cada valor representa novos seguidores do dia)
    const newFollowers = monthData.reduce((sum, item) => {
      return sum + parseInt(item.Seguidores || "0");
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
): any => {
  // Agregar todas as métricas dos anúncios para os meses especificados
  const filteredAds = data.filter((ad) => {
    if (ad["Mês"]) {
      return months.includes(ad["Mês"]);
    }
    // Fallback para ads sem campo Mês
    const startDate = ad["Início dos relatórios"];
    if (startDate) {
      const monthKey = startDate.substring(0, 7);
      return months.includes(monthKey);
    }
    return false;
  });

  return filteredAds;
};
