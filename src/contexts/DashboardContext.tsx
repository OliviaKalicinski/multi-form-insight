import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
  type Context,
  type ReactNode,
} from "react";
import {
  MarketingData,
  FollowersData,
  AdsData,
  AdsMonthSummary,
  ProcessedOrder,
  AudienceData,
} from "@/types/marketing";
import { extractAvailableMonths } from "@/utils/adsParserV2";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useDataPersistence } from "@/hooks/useDataPersistence";
import { SegmentFilter } from "@/utils/revenue";

export interface PeriodState {
  start: Date;
  end: Date;
  label?: string;
}

interface DashboardContextType {
  marketingData: MarketingData[];
  followersData: FollowersData[];
  adsData: AdsData[];
  monthlySummaries: AdsMonthSummary[];
  hasHierarchicalFormat: boolean;
  salesData: ProcessedOrder[];
  audienceData: AudienceData | null;
  // Date filtering
  dateRange: PeriodState | null;
  comparisonDateRange: PeriodState | null;
  comparisonMode: boolean;
  lastDataDate: Date | null;
  availableMonths: string[]; // kept for chart utilities that need month list
  // Segment filtering (global, shared across Produtos / Operacoes / ExecutiveDashboard)
  selectedSegment: SegmentFilter;
  setSelectedSegment: (segment: SegmentFilter) => void;
  // Status
  isLoadingData: boolean;
  dataLoaded: boolean;
  lastDataUpdate: Date | null;
  // Setters
  setMarketingData: (data: MarketingData[]) => void;
  setFollowersData: (data: FollowersData[]) => void;
  setAdsData: (data: AdsData[], summaries?: AdsMonthSummary[], isHierarchical?: boolean) => void;
  setSalesData: (data: ProcessedOrder[]) => void;
  setAudienceData: (data: AudienceData | null) => void;
  setDateRange: (range: PeriodState | null) => void;
  setComparisonDateRange: (range: PeriodState | null) => void;
  setComparisonMode: (enabled: boolean) => void;
  // Persistence
  persistSalesData: (data: ProcessedOrder[], fileName?: string) => Promise<{ inserted: number; total: number }>;
  persistAdsData: (data: AdsData[], fileName?: string) => Promise<{ inserted: number; total: number }>;
  persistFollowersData: (data: FollowersData[], fileName?: string) => Promise<{ inserted: number; total: number }>;
  persistMarketingData: (data: MarketingData[], fileName?: string) => Promise<{ inserted: number; total: number }>;
  persistInstagramMetrics: (
    data: { data: string; metrica: string; valor: number }[],
    fileName?: string,
  ) => Promise<{ inserted: number; total: number }>;
  persistAudienceData: (data: AudienceData, fileName?: string) => Promise<{ inserted: number; total: number }>;
  deleteUpload: (uploadId: string) => Promise<void>;
  clearPersistedData: () => Promise<void>;
  clearAdsData: () => Promise<void>;
  refreshFromDatabase: () => Promise<void>;
}

type DashboardContextValue = DashboardContextType | undefined;
type DashboardContextInstance = Context<DashboardContextValue>;

declare global {
  // eslint-disable-next-line no-var
  var __lovableDashboardContext__: DashboardContextInstance | undefined;
}

const getDashboardContext = (): DashboardContextInstance => {
  if (!import.meta.env.DEV) {
    return createContext<DashboardContextValue>(undefined);
  }

  if (!globalThis.__lovableDashboardContext__) {
    globalThis.__lovableDashboardContext__ = createContext<DashboardContextValue>(undefined);
  }

  return globalThis.__lovableDashboardContext__;
};

export const DashboardContext = getDashboardContext();

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [marketingData, setMarketingDataState] = useState<MarketingData[]>([]);
  const [followersData, setFollowersDataState] = useState<FollowersData[]>([]);
  const [adsData, setAdsDataState] = useState<AdsData[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<AdsMonthSummary[]>([]);
  const [hasHierarchicalFormat, setHasHierarchicalFormat] = useState<boolean>(false);
  const [salesData, setSalesDataState] = useState<ProcessedOrder[]>([]);
  const [audienceData, setAudienceDataState] = useState<AudienceData | null>(null);
  const [dateRange, setDateRangeState] = useState<PeriodState | null>(null);
  const [comparisonDateRange, setComparisonDateRangeState] = useState<PeriodState | null>(null);
  const [comparisonMode, setComparisonModeState] = useState<boolean>(false);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null);
  const [selectedSegment, setSelectedSegmentState] = useState<SegmentFilter>("all");

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

  useEffect(() => {
    const loadPersistedData = async () => {
      const { salesData, adsData, followersData, marketingData, lastUpdated } = await loadAllData();
      const audienceDataLoaded = await loadAudienceData();
      if (salesData.length > 0) setSalesDataState(salesData);
      if (adsData.length > 0) setAdsDataState(adsData);
      if (followersData.length > 0) setFollowersDataState(followersData);
      if (marketingData.length > 0) setMarketingDataState(marketingData);
      if (audienceDataLoaded) setAudienceDataState(audienceDataLoaded);
      if (lastUpdated) setLastDataUpdate(lastUpdated);
      setDataLoaded(true);
    };
    loadPersistedData();
  }, [loadAllData, loadAudienceData]);

  // Derive lastDataDate from all data sources
  const lastDataDate = useMemo(() => {
    const dates: Date[] = [];
    salesData.forEach((o) => dates.push(o.dataVenda));
    followersData.forEach((f) => {
      try {
        dates.push(new Date(f.Data));
      } catch {}
    });
    marketingData.forEach((m) => {
      try {
        dates.push(new Date(m.Data));
      } catch {}
    });
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }, [salesData, followersData, marketingData]);

  // Available months (kept for chart utilities)
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    marketingData.forEach((item) => months.add(item.Data.substring(0, 7)));
    followersData.forEach((item) => months.add(item.Data.substring(0, 7)));
    extractAvailableMonths(adsData).forEach((m) => months.add(m));
    salesData.forEach((order) => months.add(format(order.dataVenda, "yyyy-MM")));
    return Array.from(months).sort();
  }, [marketingData, followersData, adsData, salesData]);

  // Auto-set default dateRange when data first loads: last 30 days up to lastDataDate
  useEffect(() => {
    if (dataLoaded && lastDataDate && !dateRange) {
      const end = endOfDay(lastDataDate);
      const start = startOfDay(new Date(lastDataDate.getTime() - 29 * 24 * 60 * 60 * 1000));
      setDateRangeState({ start, end, label: "30d" });
    }
  }, [dataLoaded, lastDataDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const setMarketingData = (data: MarketingData[]) => {
    setMarketingDataState(data);
    setDateRangeState(null);
  };
  const setFollowersData = (data: FollowersData[]) => {
    setFollowersDataState(data);
    setDateRangeState(null);
  };
  const setAdsData = (data: AdsData[], summaries: AdsMonthSummary[] = [], isHierarchical: boolean = false) => {
    setAdsDataState(data);
    setMonthlySummaries(summaries);
    setHasHierarchicalFormat(isHierarchical);
    setDateRangeState(null);
  };
  const setSalesData = (data: ProcessedOrder[]) => {
    setSalesDataState(data);
    setDateRangeState(null);
  };
  const setAudienceData = (data: AudienceData | null) => setAudienceDataState(data);

  const setDateRange = (range: PeriodState | null) => setDateRangeState(range);
  const setComparisonDateRange = (range: PeriodState | null) => setComparisonDateRangeState(range);
  const setComparisonMode = (enabled: boolean) => {
    setComparisonModeState(enabled);
    if (!enabled) setComparisonDateRangeState(null);
  };
  const setSelectedSegment = (segment: SegmentFilter) => setSelectedSegmentState(segment);

  const persistSalesData = useCallback(
    async (data: ProcessedOrder[], fileName?: string) => {
      const result = await saveSalesData(data, fileName);
      setSalesDataState((prev) => {
        const isNFUpload = data[0]?.fonteDados === "nf";
        if (isNFUpload) {
          const nfKeys = new Set(data.map((o) => `${o.numeroNota}|${o.serie}`));
          const nfPedidos = new Set(data.map((o) => o.numeroPedido).filter(Boolean));
          const filtered = prev.filter((o) => {
            if (o.fonteDados === "nf" && nfKeys.has(`${o.numeroNota}|${o.serie}`)) return false;
            if (o.fonteDados !== "nf" && nfPedidos.has(o.numeroPedido)) return false;
            return true;
          });
          return [...filtered, ...data];
        } else {
          const existingNFPedidos = new Set(
            prev
              .filter((o) => o.fonteDados === "nf")
              .map((o) => o.numeroPedido)
              .filter(Boolean),
          );
          const newOrders = data.filter(
            (o) =>
              !existingNFPedidos.has(o.numeroPedido) &&
              !prev.some((p) => p.numeroPedido === o.numeroPedido && p.fonteDados !== "nf"),
          );
          const existingIds = new Set(prev.map((o) => o.numeroPedido));
          return [...prev, ...newOrders.filter((o) => !existingIds.has(o.numeroPedido))];
        }
      });
      return result;
    },
    [saveSalesData],
  );

  const persistAdsData = useCallback(
    async (data: AdsData[], fileName?: string) => {
      const result = await saveAdsData(data, fileName);
      setAdsDataState((prev) => [...prev, ...data]);
      return result;
    },
    [saveAdsData],
  );

  const persistFollowersData = useCallback(
    async (data: FollowersData[], fileName?: string) => {
      const result = await saveFollowersData(data, fileName);
      setFollowersDataState((prev) => {
        const existingDates = new Set(prev.map((f) => f.Data));
        return [...prev, ...data.filter((f) => !existingDates.has(f.Data))];
      });
      return result;
    },
    [saveFollowersData],
  );

  const persistMarketingData = useCallback(
    async (data: MarketingData[], fileName?: string) => {
      const result = await saveMarketingData(data, fileName);
      setMarketingDataState((prev) => {
        const existingDates = new Set(prev.map((m) => m.Data));
        return [...prev, ...data.filter((m) => !existingDates.has(m.Data))];
      });
      return result;
    },
    [saveMarketingData],
  );

  const persistAudienceData = useCallback(
    async (data: AudienceData, fileName?: string) => {
      const result = await saveAudienceData(data, fileName);
      setAudienceDataState(data);
      return result;
    },
    [saveAudienceData],
  );

  const persistInstagramMetrics = useCallback(
    async (data: { data: string; metrica: string; valor: number }[], fileName?: string) => {
      const result = await saveInstagramMetrics(data, fileName);
      const { marketingData } = await loadAllData();
      setMarketingDataState(marketingData);
      return result;
    },
    [saveInstagramMetrics, loadAllData],
  );

  const deleteUpload = useCallback(
    async (uploadId: string) => {
      await deleteUploadFromDb(uploadId);
      const { salesData, adsData, followersData, marketingData } = await loadAllData();
      const audienceDataLoaded = await loadAudienceData();
      setSalesDataState(salesData);
      setAdsDataState(adsData);
      setFollowersDataState(followersData);
      setMarketingDataState(marketingData);
      setAudienceDataState(audienceDataLoaded);
    },
    [deleteUploadFromDb, loadAllData, loadAudienceData],
  );

  const clearPersistedData = useCallback(async () => {
    await clearAllData();
    setSalesDataState([]);
    setAdsDataState([]);
    setFollowersDataState([]);
    setMarketingDataState([]);
    setMonthlySummaries([]);
    setAudienceDataState(null);
    setDateRangeState(null);
    setComparisonDateRangeState(null);
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

  const value: DashboardContextType = {
    marketingData,
    followersData,
    adsData,
    monthlySummaries,
    hasHierarchicalFormat,
    salesData,
    audienceData,
    dateRange,
    comparisonDateRange,
    comparisonMode,
    lastDataDate,
    availableMonths,
    selectedSegment,
    setSelectedSegment,
    isLoadingData,
    dataLoaded,
    lastDataUpdate,
    setMarketingData,
    setFollowersData,
    setAdsData,
    setSalesData,
    setAudienceData,
    setDateRange,
    setComparisonDateRange,
    setComparisonMode,
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

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) throw new Error("useDashboard must be used within a DashboardProvider");
  return context;
};
