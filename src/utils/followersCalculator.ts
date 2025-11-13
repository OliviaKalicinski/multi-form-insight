import { FollowersData, FollowersMetrics } from "@/types/marketing";

export const calculateFollowersMetrics = (
  data: FollowersData[],
  allData: FollowersData[],
  selectedMonth: string
): FollowersMetrics => {
  if (data.length === 0) {
    return {
      totalSeguidores: 0,
      novosSeguidoresMes: 0,
      crescimentoAbsoluto: 0,
      crescimentoPercentual: 0,
    };
  }

  // Novos seguidores = soma do mês atual
  const novosSeguidoresMes = data.reduce((sum, item) => sum + parseInt(item.Seguidores), 0);
  
  // Total acumulado = soma de TODOS os dados até o mês selecionado
  const monthEnd = `${selectedMonth}-31 23:59:59`;
  const allDataUntilMonth = allData.filter(item => item.Data <= monthEnd);
  const totalSeguidores = allDataUntilMonth.reduce((sum, item) => sum + parseInt(item.Seguidores), 0);

  return {
    totalSeguidores,
    novosSeguidoresMes,
    crescimentoAbsoluto: 0,
    crescimentoPercentual: 0,
  };
};

export const calculateFollowersGrowth = (
  currentMonth: FollowersData[], 
  previousMonth: FollowersData[],
  allData: FollowersData[],
  currentMonthStr: string,
  previousMonthStr: string
): { crescimentoAbsoluto: number; crescimentoPercentual: number } => {
  const currentMetrics = calculateFollowersMetrics(currentMonth, allData, currentMonthStr);
  const previousMetrics = calculateFollowersMetrics(previousMonth, allData, previousMonthStr);

  // Crescimento = diferença entre NOVOS seguidores (não total acumulado)
  const crescimentoAbsoluto = currentMetrics.novosSeguidoresMes - previousMetrics.novosSeguidoresMes;
  const crescimentoPercentual = previousMetrics.novosSeguidoresMes > 0
    ? (crescimentoAbsoluto / previousMetrics.novosSeguidoresMes) * 100
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
