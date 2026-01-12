import { FollowersData, FollowersMetrics } from "@/types/marketing";
import { endOfMonth, parse, isValid, parseISO, startOfWeek, endOfWeek, startOfMonth, eachWeekOfInterval, eachMonthOfInterval, format } from "date-fns";

// Helper: parseInt seguro (evita NaN)
const safeInt = (v?: string): number => {
  const n = parseInt((v ?? "0").trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

// Helper: parse de data robusto
const parseFollowerDate = (s: string): Date | null => {
  if (!s) return null;
  // Normaliza "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS"
  const normalized = s.includes(" ") ? s.replace(" ", "T") : s;
  const d = new Date(normalized);
  return isValid(d) ? d : null;
};

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

  // Novos seguidores = soma do mês atual (delta)
  const novosSeguidoresMes = data.reduce(
    (sum, item) => sum + safeInt(item.Seguidores), 
    0
  );

  // Total acumulado = soma de TODOS os deltas até o fim do mês selecionado
  const monthDate = parse(selectedMonth, "yyyy-MM", new Date());
  const monthEndDate = endOfMonth(monthDate);

  const totalAcumuladoAteMes = allData.reduce((sum, item) => {
    const d = parseFollowerDate(item.Data);
    if (!d) return sum;
    if (d <= monthEndDate) return sum + safeInt(item.Seguidores);
    return sum;
  }, 0);

  return {
    totalSeguidores: totalAcumuladoAteMes,
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

  const crescimentoAbsoluto = currentMetrics.novosSeguidoresMes - previousMetrics.novosSeguidoresMes;
  const crescimentoPercentual =
    previousMetrics.novosSeguidoresMes > 0 
      ? (crescimentoAbsoluto / previousMetrics.novosSeguidoresMes) * 100 
      : 0;

  return { crescimentoAbsoluto, crescimentoPercentual };
};

export const formatFollowersNumber = (num: number): string => {
  return num.toLocaleString("pt-BR");
};

export const formatFollowersGrowth = (num: number): string => {
  return num >= 0 ? `+${num.toLocaleString("pt-BR")}` : num.toLocaleString("pt-BR");
};

export const extractDailyFollowers = (
  data: FollowersData[]
): { date: string; value: number }[] => {
  return data
    .map((item) => ({
      date: (item.Data ?? "").substring(0, 10),
      value: safeInt(item.Seguidores),
    }))
    .filter((d) => d.date.length === 10);
};

// Aggregate followers data by week
export const aggregateFollowersByWeek = (
  data: FollowersData[]
): { date: string; value: number }[] => {
  const dailyData = extractDailyFollowers(data);
  if (dailyData.length === 0) return [];
  
  const validData = dailyData.filter(d => {
    try {
      return isValid(parseISO(d.date));
    } catch {
      return false;
    }
  });
  if (validData.length === 0) return [];

  const dates = validData.map(d => parseISO(d.date));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  const weeks = eachWeekOfInterval({ start: minDate, end: maxDate }, { weekStartsOn: 1 });
  
  return weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekData = validData.filter(d => {
      const date = parseISO(d.date);
      return date >= weekStart && date <= weekEnd;
    });
    return {
      date: format(weekStart, "yyyy-MM-dd"),
      value: weekData.reduce((sum, d) => sum + d.value, 0),
    };
  });
};

// Aggregate followers data by month
export const aggregateFollowersByMonthData = (
  data: FollowersData[]
): { date: string; value: number }[] => {
  const dailyData = extractDailyFollowers(data);
  if (dailyData.length === 0) return [];
  
  const validData = dailyData.filter(d => {
    try {
      return isValid(parseISO(d.date));
    } catch {
      return false;
    }
  });
  if (validData.length === 0) return [];

  const dates = validData.map(d => parseISO(d.date));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  const months = eachMonthOfInterval({ start: startOfMonth(minDate), end: endOfMonth(maxDate) });
  
  return months.map(monthStart => {
    const monthEnd = endOfMonth(monthStart);
    const monthData = validData.filter(d => {
      const date = parseISO(d.date);
      return date >= monthStart && date <= monthEnd;
    });
    return {
      date: format(monthStart, "yyyy-MM-dd"),
      value: monthData.reduce((sum, d) => sum + d.value, 0),
    };
  });
};

// Calculate daily average for a period
export const calculateDailyAverage = (data: FollowersData[]): number => {
  const dailyData = extractDailyFollowers(data);
  if (dailyData.length === 0) return 0;
  const total = dailyData.reduce((sum, d) => sum + d.value, 0);
  return total / dailyData.length;
};

// Helper exportado para uso em componentes
export const safeIntFollowers = safeInt;
