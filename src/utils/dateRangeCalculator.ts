export const getLast12Months = (availableMonths: string[]): string[] => {
  if (availableMonths.length === 0) return [];
  
  // Ordenar meses em ordem crescente
  const sorted = [...availableMonths].sort();
  
  // Pegar os últimos 12 ou todos se houver menos
  return sorted.slice(-12);
};

export const getPrevious12Months = (availableMonths: string[], last12: string[]): string[] => {
  if (availableMonths.length === 0 || last12.length === 0) return [];
  
  const sorted = [...availableMonths].sort();
  const firstMonthIndex = sorted.indexOf(last12[0]);
  
  if (firstMonthIndex < 12) return []; // Não há 12 meses anteriores completos
  
  return sorted.slice(firstMonthIndex - 12, firstMonthIndex);
};

export const formatMonthRange = (months: string[]): string => {
  if (months.length === 0) return "";
  
  const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];
  
  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];
  
  const [firstYear, firstMonthNum] = firstMonth.split("-");
  const [lastYear, lastMonthNum] = lastMonth.split("-");
  
  const firstMonthName = monthNames[parseInt(firstMonthNum) - 1];
  const lastMonthName = monthNames[parseInt(lastMonthNum) - 1];
  
  if (firstYear === lastYear) {
    return `${firstMonthName} - ${lastMonthName}/${firstYear}`;
  }
  
  return `${firstMonthName}/${firstYear} - ${lastMonthName}/${lastYear}`;
};

export const getMonthsCount = (months: string[]): number => {
  return months.length;
};
