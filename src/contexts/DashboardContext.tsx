import { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { MarketingData, FollowersData, AdsData, AdsMonthSummary } from "@/types/marketing";
import { extractAvailableMonths } from "@/utils/adsParserV2";

interface DashboardContextType {
  marketingData: MarketingData[];
  followersData: FollowersData[];
  adsData: AdsData[];
  monthlySummaries: AdsMonthSummary[];
  hasHierarchicalFormat: boolean;
  selectedMonth: string;
  availableMonths: string[];
  comparisonMode: boolean;
  selectedMonths: string[];
  setMarketingData: (data: MarketingData[]) => void;
  setFollowersData: (data: FollowersData[]) => void;
  setAdsData: (data: AdsData[], summaries?: AdsMonthSummary[], isHierarchical?: boolean) => void;
  setSelectedMonth: (month: string) => void;
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
  const [selectedMonth, setSelectedMonthState] = useState<string>("");
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
    
    const result = Array.from(months).sort();
    console.log('📊 Available months calculated:', result);
    return result;
  }, [marketingData, followersData, adsData]);

  // Auto-select latest month when data changes or month is not selected
  useMemo(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonthState(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  // Wrapper functions that reset month selection on data update
  const setMarketingData = (data: MarketingData[]) => {
    setMarketingDataState(data);
    setSelectedMonthState("");
  };

  const setFollowersData = (data: FollowersData[]) => {
    setFollowersDataState(data);
    setSelectedMonthState("");
  };

  const setAdsData = (data: AdsData[], summaries: AdsMonthSummary[] = [], isHierarchical: boolean = false) => {
    setAdsDataState(data);
    setMonthlySummaries(summaries);
    setHasHierarchicalFormat(isHierarchical);
    setSelectedMonthState("");
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
    selectedMonth,
    availableMonths,
    comparisonMode,
    selectedMonths,
    setMarketingData,
    setFollowersData,
    setAdsData,
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
