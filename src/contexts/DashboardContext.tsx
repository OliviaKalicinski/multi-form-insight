import { createContext, useContext, useState, useMemo, useEffect, useCallback, ReactNode } from "react";
import { MarketingData, FollowersData, AdsData, AdsMonthSummary, ProcessedOrder } from "@/types/marketing";
import { extractAvailableMonths } from "@/utils/adsParserV2";
import { format } from "date-fns";
import { useDataPersistence } from "@/hooks/useDataPersistence";

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
  isLoadingData: boolean;
  dataLoaded: boolean;
  setMarketingData: (data: MarketingData[]) => void;
  setFollowersData: (data: FollowersData[]) => void;
  setAdsData: (data: AdsData[], summaries?: AdsMonthSummary[], isHierarchical?: boolean) => void;
  setSalesData: (data: ProcessedOrder[]) => void;
  setSelectedMonth: (month: string | null) => void;
  setComparisonMode: (enabled: boolean) => void;
  setSelectedMonths: (months: string[]) => void;
  toggleMonth: (month: string) => void;
  persistSalesData: (data: ProcessedOrder[]) => Promise<{ inserted: number; total: number }>;
  persistAdsData: (data: AdsData[]) => Promise<{ inserted: number; total: number }>;
  persistFollowersData: (data: FollowersData[]) => Promise<{ inserted: number; total: number }>;
  persistMarketingData: (data: MarketingData[]) => Promise<{ inserted: number; total: number }>;
  clearPersistedData: () => Promise<void>;
  refreshFromDatabase: () => Promise<void>;
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
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);

  const {
    isLoading: isLoadingData,
    loadAllData,
    saveSalesData,
    saveAdsData,
    saveFollowersData,
    saveMarketingData,
    clearAllData,
  } = useDataPersistence();

  // Load data from database on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      console.log("🔄 Carregando dados do banco...");
      const { salesData, adsData, followersData, marketingData } = await loadAllData();
      
      if (salesData.length > 0) setSalesDataState(salesData);
      if (adsData.length > 0) setAdsDataState(adsData);
      if (followersData.length > 0) setFollowersDataState(followersData);
      if (marketingData.length > 0) setMarketingDataState(marketingData);
      
      setDataLoaded(true);
      console.log("✅ Dados carregados com sucesso");
    };

    loadPersistedData();
  }, [loadAllData]);

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

  // Wrapper functions that update local state
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

  // Persist functions that save to database AND update local state
  const persistSalesData = useCallback(async (data: ProcessedOrder[]) => {
    const result = await saveSalesData(data);
    // Merge new data with existing (avoiding duplicates by numero_pedido)
    setSalesDataState(prev => {
      const existingIds = new Set(prev.map(o => o.numeroPedido));
      const newOrders = data.filter(o => !existingIds.has(o.numeroPedido));
      return [...prev, ...newOrders];
    });
    return result;
  }, [saveSalesData]);

  const persistAdsData = useCallback(async (data: AdsData[]) => {
    const result = await saveAdsData(data);
    setAdsDataState(prev => [...prev, ...data]);
    return result;
  }, [saveAdsData]);

  const persistFollowersData = useCallback(async (data: FollowersData[]) => {
    const result = await saveFollowersData(data);
    // Merge by date
    setFollowersDataState(prev => {
      const existingDates = new Set(prev.map(f => f.Data));
      const newData = data.filter(f => !existingDates.has(f.Data));
      return [...prev, ...newData];
    });
    return result;
  }, [saveFollowersData]);

  const persistMarketingData = useCallback(async (data: MarketingData[]) => {
    const result = await saveMarketingData(data);
    // Merge by date
    setMarketingDataState(prev => {
      const existingDates = new Set(prev.map(m => m.Data));
      const newData = data.filter(m => !existingDates.has(m.Data));
      return [...prev, ...newData];
    });
    return result;
  }, [saveMarketingData]);

  const clearPersistedData = useCallback(async () => {
    await clearAllData();
    setSalesDataState([]);
    setAdsDataState([]);
    setFollowersDataState([]);
    setMarketingDataState([]);
    setMonthlySummaries([]);
    setSelectedMonthState(null);
  }, [clearAllData]);

  const refreshFromDatabase = useCallback(async () => {
    const { salesData, adsData, followersData, marketingData } = await loadAllData();
    setSalesDataState(salesData);
    setAdsDataState(adsData);
    setFollowersDataState(followersData);
    setMarketingDataState(marketingData);
  }, [loadAllData]);

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
    isLoadingData,
    dataLoaded,
    setMarketingData,
    setFollowersData,
    setAdsData,
    setSalesData,
    setSelectedMonth: setSelectedMonthState,
    setComparisonMode,
    setSelectedMonths: setSelectedMonthsState,
    toggleMonth,
    persistSalesData,
    persistAdsData,
    persistFollowersData,
    persistMarketingData,
    clearPersistedData,
    refreshFromDatabase,
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
