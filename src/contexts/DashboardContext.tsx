import { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { MarketingData, FollowersData, AdsData } from "@/types/marketing";
import { marketingData as defaultMarketingData } from "@/data/marketingData";
import { followersData as defaultFollowersData } from "@/data/followersData";
import { defaultAdsData } from "@/data/adsData";

interface DashboardContextType {
  marketingData: MarketingData[];
  followersData: FollowersData[];
  adsData: AdsData[];
  selectedMonth: string;
  availableMonths: string[];
  setMarketingData: (data: MarketingData[]) => void;
  setFollowersData: (data: FollowersData[]) => void;
  setAdsData: (data: AdsData[]) => void;
  setSelectedMonth: (month: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [marketingData, setMarketingDataState] = useState<MarketingData[]>(defaultMarketingData);
  const [followersData, setFollowersDataState] = useState<FollowersData[]>(defaultFollowersData);
  const [adsData, setAdsDataState] = useState<AdsData[]>(defaultAdsData);
  const [selectedMonth, setSelectedMonthState] = useState<string>("");

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
    
    adsData.forEach((item) => {
      const month = item["Início dos relatórios"].substring(0, 7);
      months.add(month);
    });
    
    return Array.from(months).sort();
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

  const setAdsData = (data: AdsData[]) => {
    setAdsDataState(data);
    setSelectedMonthState("");
  };

  const value = {
    marketingData,
    followersData,
    adsData,
    selectedMonth,
    availableMonths,
    setMarketingData,
    setFollowersData,
    setAdsData,
    setSelectedMonth: setSelectedMonthState,
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
