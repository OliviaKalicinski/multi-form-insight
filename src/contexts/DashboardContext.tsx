import { createContext, useContext, useState, useMemo, useEffect, useCallback, ReactNode } from "react";
import { MarketingData, FollowersData, AdsData, AdsMonthSummary, ProcessedOrder, AudienceData } from "@/types/marketing";
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
  audienceData: AudienceData | null;
  selectedMonth: string | null;
  availableMonths: string[];
  comparisonMode: boolean;
  selectedMonths: string[];
  isLoadingData: boolean;
  dataLoaded: boolean;
  lastDataUpdate: Date | null;
  setMarketingData: (data: MarketingData[]) => void;
  setFollowersData: (data: FollowersData[]) => void;
  setAdsData: (data: AdsData[], summaries?: AdsMonthSummary[], isHierarchical?: boolean) => void;
  setSalesData: (data: ProcessedOrder[]) => void;
  setAudienceData: (data: AudienceData | null) => void;
  setSelectedMonth: (month: string | null) => void;
  setComparisonMode: (enabled: boolean) => void;
  setSelectedMonths: (months: string[]) => void;
  toggleMonth: (month: string) => void;
  persistSalesData: (data: ProcessedOrder[], fileName?: string) => Promise<{ inserted: number; total: number }>;
  persistAdsData: (data: AdsData[], fileName?: string) => Promise<{ inserted: number; total: number }>;
  persistFollowersData: (data: FollowersData[], fileName?: string) => Promise<{ inserted: number; total: number }>;
  persistMarketingData: (data: MarketingData[], fileName?: string) => Promise<{ inserted: number; total: number }>;
  persistInstagramMetrics: (data: { data: string; metrica: string; valor: number }[], fileName?: string) => Promise<{ inserted: number; total: number }>;
  persistAudienceData: (data: AudienceData, fileName?: string) => Promise<{ inserted: number; total: number }>;
  deleteUpload: (uploadId: string) => Promise<void>;
  clearPersistedData: () => Promise<void>;
  clearAdsData: () => Promise<void>;
  refreshFromDatabase: () => Promise<void>;
}

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [marketingData, setMarketingDataState] = useState<MarketingData[]>([]);
  const [followersData, setFollowersDataState] = useState<FollowersData[]>([]);
  const [adsData, setAdsDataState] = useState<AdsData[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<AdsMonthSummary[]>([]);
  const [hasHierarchicalFormat, setHasHierarchicalFormat] = useState<boolean>(false);
  const [salesData, setSalesDataState] = useState<ProcessedOrder[]>([]);
  const [audienceData, setAudienceDataState] = useState<AudienceData | null>(null);
  const [selectedMonth, setSelectedMonthState] = useState<string | null>(null);
  const [comparisonMode, setComparisonModeState] = useState<boolean>(false);
  const [selectedMonths, setSelectedMonthsState] = useState<string[]>([]);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null);

  const {
    isLoading: isLoadingData,
    loadAllData,
    saveSalesData,
    saveAdsData,
    saveFollowersData,
    saveMarketingData,
    saveInstagramMetrics,
    saveAudienceData,
    loadAudienceData,
    deleteUpload: deleteUploadFromDb,
    clearAllData,
    clearAdsData: clearAdsDataFromDb,
  } = useDataPersistence();

  // Load data from database on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      console.log("🔄 Carregando dados do banco...");
      const { salesData, adsData, followersData, marketingData, lastUpdated } = await loadAllData();
      const audienceDataLoaded = await loadAudienceData();
      
      if (salesData.length > 0) setSalesDataState(salesData);
      if (adsData.length > 0) setAdsDataState(adsData);
      if (followersData.length > 0) setFollowersDataState(followersData);
      if (marketingData.length > 0) setMarketingDataState(marketingData);
      if (audienceDataLoaded) setAudienceDataState(audienceDataLoaded);
      if (lastUpdated) setLastDataUpdate(lastUpdated);
      
      setDataLoaded(true);
      console.log("✅ Dados carregados com sucesso");
    };

    loadPersistedData();
  }, [loadAllData, loadAudienceData]);

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

  // Auto-select latest month ONLY on initial load (when selectedMonth is undefined/null and data just loaded)
  useEffect(() => {
    if (availableMonths.length > 0 && selectedMonth === null && dataLoaded) {
      // Only auto-select on first data load, not when user explicitly selects "all"
      setSelectedMonthState(availableMonths[availableMonths.length - 1]);
    }
  }, [dataLoaded]); // Only run when dataLoaded changes

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

  const setAudienceData = (data: AudienceData | null) => {
    setAudienceDataState(data);
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
      // Sem limite de meses
      return [...prev, month].sort();
    });
  };

  // Persist functions that save to database AND update local state
  const persistSalesData = useCallback(async (data: ProcessedOrder[], fileName?: string) => {
    const result = await saveSalesData(data, fileName);
    // Merge NF-aware: NF prevalece sobre ecommerce com mesmo numeroPedido
    setSalesDataState(prev => {
      const isNFUpload = data[0]?.fonteDados === 'nf';
      
      if (isNFUpload) {
        // Para NF: deduplicar por numeroNota + serie
        const nfKeys = new Set(data.map(o => `${o.numeroNota}|${o.serie}`));
        // Remover registros existentes que tenham o mesmo numeroPedido (ecommerce cedendo para NF)
        const nfPedidos = new Set(data.map(o => o.numeroPedido).filter(Boolean));
        const filtered = prev.filter(o => {
          // Remover NFs duplicadas
          if (o.fonteDados === 'nf' && nfKeys.has(`${o.numeroNota}|${o.serie}`)) return false;
          // Remover ecommerce com mesmo numeroPedido (NF prevalece)
          if (o.fonteDados !== 'nf' && nfPedidos.has(o.numeroPedido)) return false;
          return true;
        });
        return [...filtered, ...data];
      } else {
        // Para ecommerce: deduplicar por numeroPedido, mas NF prevalece
        const existingNFPedidos = new Set(
          prev.filter(o => o.fonteDados === 'nf').map(o => o.numeroPedido).filter(Boolean)
        );
        const newOrders = data.filter(o => 
          !existingNFPedidos.has(o.numeroPedido) && 
          !prev.some(p => p.numeroPedido === o.numeroPedido && p.fonteDados !== 'nf')
        );
        const existingIds = new Set(prev.map(o => o.numeroPedido));
        const uniqueNew = newOrders.filter(o => !existingIds.has(o.numeroPedido));
        return [...prev, ...uniqueNew];
      }
    });
    return result;
  }, [saveSalesData]);

  const persistAdsData = useCallback(async (data: AdsData[], fileName?: string) => {
    const result = await saveAdsData(data, fileName);
    setAdsDataState(prev => [...prev, ...data]);
    return result;
  }, [saveAdsData]);

  const persistFollowersData = useCallback(async (data: FollowersData[], fileName?: string) => {
    const result = await saveFollowersData(data, fileName);
    // Merge by date
    setFollowersDataState(prev => {
      const existingDates = new Set(prev.map(f => f.Data));
      const newData = data.filter(f => !existingDates.has(f.Data));
      return [...prev, ...newData];
    });
    return result;
  }, [saveFollowersData]);

  const persistMarketingData = useCallback(async (data: MarketingData[], fileName?: string) => {
    const result = await saveMarketingData(data, fileName);
    // Merge by date
    setMarketingDataState(prev => {
      const existingDates = new Set(prev.map(m => m.Data));
      const newData = data.filter(m => !existingDates.has(m.Data));
      return [...prev, ...newData];
    });
    return result;
  }, [saveMarketingData]);

  const persistAudienceData = useCallback(async (data: AudienceData, fileName?: string) => {
    const result = await saveAudienceData(data, fileName);
    setAudienceDataState(data);
    return result;
  }, [saveAudienceData]);

  const persistInstagramMetrics = useCallback(async (
    data: { data: string; metrica: string; valor: number }[], 
    fileName?: string
  ) => {
    const result = await saveInstagramMetrics(data, fileName);
    // Refresh marketing data from database to get updated values
    const { marketingData } = await loadAllData();
    setMarketingDataState(marketingData);
    return result;
  }, [saveInstagramMetrics, loadAllData]);

  // Delete upload and refresh data from database
  const deleteUpload = useCallback(async (uploadId: string) => {
    await deleteUploadFromDb(uploadId);
    // Refresh all data from database after deletion
    const { salesData, adsData, followersData, marketingData } = await loadAllData();
    const audienceDataLoaded = await loadAudienceData();
    setSalesDataState(salesData);
    setAdsDataState(adsData);
    setFollowersDataState(followersData);
    setMarketingDataState(marketingData);
    setAudienceDataState(audienceDataLoaded);
  }, [deleteUploadFromDb, loadAllData, loadAudienceData]);

  const clearPersistedData = useCallback(async () => {
    await clearAllData();
    setSalesDataState([]);
    setAdsDataState([]);
    setFollowersDataState([]);
    setMarketingDataState([]);
    setMonthlySummaries([]);
    setAudienceDataState(null);
    setSelectedMonthState(null);
  }, [clearAllData]);

  const clearAdsData = useCallback(async () => {
    await clearAdsDataFromDb();
    setAdsDataState([]);
    setMonthlySummaries([]);
    setHasHierarchicalFormat(false);
  }, [clearAdsDataFromDb]);

  const refreshFromDatabase = useCallback(async () => {
    const { salesData, adsData, followersData, marketingData, lastUpdated } = await loadAllData();
    const audienceDataLoaded = await loadAudienceData();
    setSalesDataState(salesData);
    setAdsDataState(adsData);
    setFollowersDataState(followersData);
    setMarketingDataState(marketingData);
    setAudienceDataState(audienceDataLoaded);
    if (lastUpdated) setLastDataUpdate(lastUpdated);
  }, [loadAllData, loadAudienceData]);

  const value = {
    marketingData,
    followersData,
    adsData,
    monthlySummaries,
    hasHierarchicalFormat,
    salesData,
    audienceData,
    selectedMonth,
    availableMonths,
    comparisonMode,
    selectedMonths,
    isLoadingData,
    dataLoaded,
    lastDataUpdate,
    setMarketingData,
    setFollowersData,
    setAdsData,
    setSalesData,
    setAudienceData,
    setSelectedMonth: setSelectedMonthState,
    setComparisonMode,
    setSelectedMonths: setSelectedMonthsState,
    toggleMonth,
    persistSalesData,
    persistAdsData,
    persistFollowersData,
    persistMarketingData,
    persistInstagramMetrics,
    persistAudienceData,
    deleteUpload,
    clearPersistedData,
    clearAdsData,
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
