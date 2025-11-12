import { FollowersData, FollowersMetrics } from "@/types/marketing";

export const calculateFollowersMetrics = (data: FollowersData[]): FollowersMetrics => {
  if (data.length === 0) {
    return {
      totalSeguidores: 0,
      novosSeguidoresMes: 0,
      crescimentoAbsoluto: 0,
      crescimentoPercentual: 0,
    };
  }

  // Sort by date to get the last value
  const sortedData = [...data].sort((a, b) => new Date(a.Data).getTime() - new Date(b.Data).getTime());
  
  // Total followers is the accumulated value (sum of all new followers in the month)
  const novosSeguidoresMes = sortedData.reduce((sum, item) => sum + parseInt(item.Seguidores), 0);
  
  // Last value represents the total accumulated (using the sum as total for the month)
  const totalSeguidores = novosSeguidoresMes;

  return {
    totalSeguidores,
    novosSeguidoresMes,
    crescimentoAbsoluto: 0,
    crescimentoPercentual: 0,
  };
};

export const calculateFollowersGrowth = (
  currentMonth: FollowersData[], 
  previousMonth: FollowersData[]
): { crescimentoAbsoluto: number; crescimentoPercentual: number } => {
  const currentMetrics = calculateFollowersMetrics(currentMonth);
  const previousMetrics = calculateFollowersMetrics(previousMonth);

  const crescimentoAbsoluto = currentMetrics.totalSeguidores - previousMetrics.totalSeguidores;
  const crescimentoPercentual = previousMetrics.totalSeguidores > 0
    ? (crescimentoAbsoluto / previousMetrics.totalSeguidores) * 100
    : 0;

  return {
    crescimentoAbsoluto,
    crescimentoPercentual,
  };
};

export const formatFollowersNumber = (num: number): string => {
  return num.toLocaleString("pt-BR");
};

export const formatFollowersGrowth = (num: number): string => {
  return num >= 0 ? `+${num.toLocaleString("pt-BR")}` : num.toLocaleString("pt-BR");
};
