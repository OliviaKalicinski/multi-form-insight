import { format, parse, getDaysInMonth, subMonths, startOfMonth, endOfMonth, setDate, min } from 'date-fns';

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

export interface EqualIntervalComparison {
  isIncomplete: boolean;
  currentDay: number;
  currentPeriod: { start: Date; end: Date };
  comparisonPeriod: { start: Date; end: Date };
  label: string;
  tooltipText: string;
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
 * Retorna os intervalos de datas para comparação justa de meses incompletos
 * Para mês incompleto: compara D1-DX do mês atual com D1-DX do mês anterior
 */
export const getEqualIntervalComparison = (selectedMonth: string): EqualIntervalComparison => {
  // Se não for um mês válido, retornar intervalo vazio
  if (!selectedMonth || selectedMonth === 'last-12-months' || !selectedMonth.match(/^\d{4}-\d{2}$/)) {
    const today = new Date();
    return {
      isIncomplete: false,
      currentDay: 0,
      currentPeriod: { start: today, end: today },
      comparisonPeriod: { start: today, end: today },
      label: '',
      tooltipText: '',
    };
  }

  const today = new Date();
  const currentMonthStr = format(today, 'yyyy-MM');
  const isIncomplete = selectedMonth === currentMonthStr;

  const selectedDate = parse(selectedMonth, 'yyyy-MM', new Date());
  const previousMonthDate = subMonths(selectedDate, 1);

  if (!isIncomplete) {
    // Mês completo: usar intervalos completos
    const currentStart = startOfMonth(selectedDate);
    const currentEnd = endOfMonth(selectedDate);
    const prevStart = startOfMonth(previousMonthDate);
    const prevEnd = endOfMonth(previousMonthDate);

    return {
      isIncomplete: false,
      currentDay: getDaysInMonth(selectedDate),
      currentPeriod: { start: currentStart, end: currentEnd },
      comparisonPeriod: { start: prevStart, end: prevEnd },
      label: '',
      tooltipText: '',
    };
  }

  // Mês incompleto: usar intervalos espelhados
  const currentDay = today.getDate();
  const currentStart = startOfMonth(selectedDate);
  const currentEnd = today;

  const prevStart = startOfMonth(previousMonthDate);
  // Usar min() para não exceder o último dia do mês anterior
  const prevMonthLastDay = getDaysInMonth(previousMonthDate);
  const prevEndDay = Math.min(currentDay, prevMonthLastDay);
  const prevEnd = setDate(previousMonthDate, prevEndDay);

  return {
    isIncomplete: true,
    currentDay,
    currentPeriod: { start: currentStart, end: currentEnd },
    comparisonPeriod: { start: prevStart, end: prevEnd },
    label: `Primeiros ${currentDay} dias`,
    tooltipText: `Comparando D1-D${currentDay} de cada mês para análise justa`,
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
