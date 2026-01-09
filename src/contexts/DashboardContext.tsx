import { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { MarketingData, FollowersData, AdsData, AdsMonthSummary, ProcessedOrder } from "@/types/marketing";
import { extractAvailableMonths } from "@/utils/adsParserV2";
import { format } from "date-fns";

interface DashboardContextType {
  marketingData: MarketingData[];
  followersData: FollowersData[];
  adsData: AdsData[];
  monthlySummaries: AdsMonthSummary[];
  hasHierarchicalFormat: boolean;
  salesData: ProcessedOrder[];
  selectedMonth: string | null;
  availableMonths: string[];
  comparisonMode: boolean;
  selectedMonths: string[];
  setMarketingData: (data: MarketingData[]) => void;
  setFollowersData: (data: FollowersData[]) => void;
  setAdsData: (data: AdsData[], summaries?: AdsMonthSummary[], isHierarchical?: boolean) => void;
  setSalesData: (data: ProcessedOrder[]) => void;
  setSelectedMonth: (month: string | null) => void;
  setComparisonMode: (enabled: boolean) => void;
  setSelectedMonths: (months: string[]) => void;
  toggleMonth: (month: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [marketingData, setMarketingDataState] = useState<MarketingData[]>([]);
  const [followersData, setFollowersDataState] = useState<FollowersData[]>([]);
  const [adsData, setAdsDataState] = useState<AdsData[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<AdsMonthSummary[]>([]);
  const [hasHierarchicalFormat, setHasHierarchicalFormat] = useState<boolean>(false);
  const [salesData, setSalesDataState] = useState<ProcessedOrder[]>([]);
  const [selectedMonth, setSelectedMonthState] = useState<string | null>(null);
  const [comparisonMode, setComparisonModeState] = useState<boolean>(false);
  const [selectedMonths, setSelectedMonthsState] = useState<string[]>([]);

  // Calculate available months from all data sources
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    
    marketingData.forEach((item) => {
      const month = item.Data.substring(0, 7);
      months.add(month);
    });
    
    followersData.forEach((item) => {
      const month = item.Data.substring(0, 7);
      months.add(month);
    });
    
    // Use parser otimizado para extrair meses dos anúncios
    const adsMonths = extractAvailableMonths(adsData);
    adsMonths.forEach(month => months.add(month));
    
    // Adicionar meses dos dados de vendas
    salesData.forEach((order) => {
      const month = format(order.dataVenda, "yyyy-MM");
      months.add(month);
    });
    
    const result = Array.from(months).sort();
    console.log('📊 Available months calculated:', result);
    return result;
  }, [marketingData, followersData, adsData, salesData]);

  // Auto-select latest month when data changes or month is not selected
  useMemo(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonthState(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  // Wrapper functions that reset month selection on data update
  const setMarketingData = (data: MarketingData[]) => {
    setMarketingDataState(data);
    setSelectedMonthState(null);
  };

  const setFollowersData = (data: FollowersData[]) => {
    setFollowersDataState(data);
    setSelectedMonthState(null);
  };

  const setAdsData = (data: AdsData[], summaries: AdsMonthSummary[] = [], isHierarchical: boolean = false) => {
    setAdsDataState(data);
    setMonthlySummaries(summaries);
    setHasHierarchicalFormat(isHierarchical);
    setSelectedMonthState(null);
  };

  const setSalesData = (data: ProcessedOrder[]) => {
    setSalesDataState(data);
    setSelectedMonthState(null);
  };

  const setComparisonMode = (enabled: boolean) => {
    setComparisonModeState(enabled);
    if (!enabled) {
      setSelectedMonthsState([]);
    }
  };

  const toggleMonth = (month: string) => {
    setSelectedMonthsState(prev => {
      if (prev.includes(month)) {
        return prev.filter(m => m !== month);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, month].sort();
    });
  };

  const value = {
    marketingData,
    followersData,
    adsData,
    monthlySummaries,
    hasHierarchicalFormat,
    salesData,
    selectedMonth,
    availableMonths,
    comparisonMode,
    selectedMonths,
    setMarketingData,
    setFollowersData,
    setAdsData,
    setSalesData,
    setSelectedMonth: setSelectedMonthState,
    setComparisonMode,
    setSelectedMonths: setSelectedMonthsState,
    toggleMonth,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};
