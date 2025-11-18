import { format, parse, getDaysInMonth } from 'date-fns';

export interface IncompleteMonthInfo {
  isIncomplete: boolean;
  currentDay: number;
  totalDays: number;
  daysRemaining: number;
  completionPercentage: number;
  month: string;
  monthLabel: string;
}

export interface ProjectionData {
  currentValue: number;
  movingAverage30Days: number;
  projectedTotal: number;
  minExpectedGrowth: number;
  projectionLabel: string;
}

/**
 * Detecta se um mês está incompleto (ainda em andamento)
 */
export const detectIncompleteMonth = (month: string): IncompleteMonthInfo => {
  if (!month || month === 'last-12-months') {
    return {
      isIncomplete: false,
      currentDay: 0,
      totalDays: 0,
      daysRemaining: 0,
      completionPercentage: 100,
      month,
      monthLabel: '',
    };
  }

  const today = new Date();
  const currentMonth = format(today, 'yyyy-MM');
  
  const isIncomplete = month === currentMonth;
  
  if (!isIncomplete) {
    return {
      isIncomplete: false,
      currentDay: 0,
      totalDays: 0,
      daysRemaining: 0,
      completionPercentage: 100,
      month,
      monthLabel: formatMonthLabel(month),
    };
  }
  
  const currentDay = today.getDate();
  const monthDate = parse(month, 'yyyy-MM', new Date());
  const totalDays = getDaysInMonth(monthDate);
  const daysRemaining = totalDays - currentDay;
  const completionPercentage = (currentDay / totalDays) * 100;
  
  return {
    isIncomplete: true,
    currentDay,
    totalDays,
    daysRemaining,
    completionPercentage,
    month,
    monthLabel: formatMonthLabel(month),
  };
};

/**
 * Calcula a média móvel dos últimos N dias
 */
export const calculateMovingAverage = (
  dailyValues: { date: string; value: number }[],
  days: number = 30
): number => {
  if (dailyValues.length === 0) return 0;
  
  // Ordenar por data decrescente e pegar os últimos N dias
  const sortedValues = [...dailyValues]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days);
  
  if (sortedValues.length === 0) return 0;
  
  const sum = sortedValues.reduce((acc, item) => acc + item.value, 0);
  return sum / sortedValues.length;
};

/**
 * Projeta o valor total do mês baseado na média móvel
 */
export const projectMonthTotal = (
  currentValue: number,
  monthInfo: IncompleteMonthInfo,
  movingAverage: number
): number => {
  if (!monthInfo.isIncomplete) return currentValue;
  
  // Projeção = Valor Atual + (Média Diária × Dias Restantes)
  const projectedValue = currentValue + (movingAverage * monthInfo.daysRemaining);
  return projectedValue;
};

/**
 * Calcula a projeção completa com crescimento esperado
 */
export const calculateProjection = (
  currentValue: number,
  previousMonthValue: number,
  monthInfo: IncompleteMonthInfo,
  dailyValues: { date: string; value: number }[],
  formatValue?: (value: number) => string
): ProjectionData | null => {
  if (!monthInfo.isIncomplete) return null;
  
  const movingAverage30Days = calculateMovingAverage(dailyValues, 30);
  const projectedTotal = projectMonthTotal(currentValue, monthInfo, movingAverage30Days);
  
  // Calcular crescimento esperado vs. mês anterior
  let minExpectedGrowth = 0;
  if (previousMonthValue > 0) {
    minExpectedGrowth = ((projectedTotal - previousMonthValue) / previousMonthValue) * 100;
  }
  
  const formatter = formatValue || ((v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
  const projectionLabel = `Projeção: ${formatter(projectedTotal)} (${minExpectedGrowth >= 0 ? '+' : ''}${minExpectedGrowth.toFixed(1)}%)`;
  
  return {
    currentValue,
    movingAverage30Days,
    projectedTotal,
    minExpectedGrowth,
    projectionLabel,
  };
};

const formatMonthLabel = (month: string): string => {
  const [year, monthNum] = month.split("-");
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const monthIndex = parseInt(monthNum) - 1;
  return `${monthNames[monthIndex]}/${year.slice(2)}`;
};
