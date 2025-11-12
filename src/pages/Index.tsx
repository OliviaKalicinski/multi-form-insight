import { useState, useMemo } from "react";
import { TrendingUp, Users, MousePointerClick, Eye, Target, TrendingDown, UserPlus } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { FollowersChart } from "@/components/dashboard/FollowersChart";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { FollowersUploader } from "@/components/dashboard/FollowersUploader";
import { MonthFilter } from "@/components/dashboard/MonthFilter";
import { marketingData as defaultData } from "@/data/marketingData";
import { followersData as defaultFollowersData } from "@/data/followersData";
import { calculateMonthlyMetrics, calculateGrowthMetrics, formatNumber, formatPercentage } from "@/utils/metricsCalculator";
import { calculateFollowersMetrics, calculateFollowersGrowth, formatFollowersNumber, formatFollowersGrowth } from "@/utils/followersCalculator";
import { MarketingData, FollowersData } from "@/types/marketing";

const Index = () => {
  const [marketingData, setMarketingData] = useState<MarketingData[]>(defaultData);
  const [followersData, setFollowersData] = useState<FollowersData[]>(defaultFollowersData);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // Extract available months from both marketing and followers data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    marketingData.forEach((item) => {
      const month = item.Data.substring(0, 7); // YYYY-MM
      months.add(month);
    });
    followersData.forEach((item) => {
      const month = item.Data.substring(0, 7); // YYYY-MM
      months.add(month);
    });
    return Array.from(months).sort();
  }, [marketingData, followersData]);

  // Set initial selected month
  useMemo(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  // Filter marketing data by selected month
  const currentMonthData = useMemo(() => {
    if (!selectedMonth) return [];
    return marketingData.filter((item) => item.Data.startsWith(selectedMonth));
  }, [marketingData, selectedMonth]);

  // Get previous month marketing data for comparison
  const previousMonthData = useMemo(() => {
    if (!selectedMonth || availableMonths.length < 2) return [];
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex <= 0) return [];
    const previousMonth = availableMonths[currentIndex - 1];
    return marketingData.filter((item) => item.Data.startsWith(previousMonth));
  }, [marketingData, selectedMonth, availableMonths]);

  // Filter followers data by selected month
  const currentMonthFollowersData = useMemo(() => {
    if (!selectedMonth) return [];
    return followersData.filter((item) => item.Data.startsWith(selectedMonth));
  }, [followersData, selectedMonth]);

  // Get previous month followers data for comparison
  const previousMonthFollowersData = useMemo(() => {
    if (!selectedMonth || availableMonths.length < 2) return [];
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex <= 0) return [];
    const previousMonth = availableMonths[currentIndex - 1];
    return followersData.filter((item) => item.Data.startsWith(previousMonth));
  }, [followersData, selectedMonth, availableMonths]);

  const currentMetrics = useMemo(
    () => calculateMonthlyMetrics(currentMonthData),
    [currentMonthData]
  );

  const growthMetrics = useMemo(() => {
    if (previousMonthData.length === 0) {
      return { crescimentoVisualizacoes: 0, crescimentoAlcance: 0, crescimentoVisitas: 0 };
    }
    return calculateGrowthMetrics(currentMonthData, previousMonthData);
  }, [currentMonthData, previousMonthData]);

  // Calculate followers metrics
  const currentFollowersMetrics = useMemo(() => {
    const metrics = calculateFollowersMetrics(currentMonthFollowersData);
    
    if (previousMonthFollowersData.length > 0) {
      const growth = calculateFollowersGrowth(currentMonthFollowersData, previousMonthFollowersData);
      return {
        ...metrics,
        crescimentoAbsoluto: growth.crescimentoAbsoluto,
        crescimentoPercentual: growth.crescimentoPercentual,
      };
    }
    
    return metrics;
  }, [currentMonthFollowersData, previousMonthFollowersData]);

  const handleDataLoaded = (data: MarketingData[], fileName: string) => {
    setMarketingData(data);
    setSelectedMonth(""); // Reset selection to trigger auto-select of latest month
  };

  const handleFollowersDataLoaded = (data: FollowersData[], fileName: string) => {
    setFollowersData(data);
    setSelectedMonth(""); // Reset selection to trigger auto-select of latest month
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Dashboard de Marketing</h1>
          <p className="text-muted-foreground">Visualize e analise suas principais métricas de desempenho</p>
        </div>

        {/* CSV Uploaders */}
        <div className="grid gap-6 md:grid-cols-2">
          <CSVUploader onDataLoaded={handleDataLoaded} />
          <FollowersUploader onDataLoaded={handleFollowersDataLoaded} />
        </div>

        {/* Month Filter */}
        {availableMonths.length > 0 && (
          <MonthFilter
            availableMonths={availableMonths}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        )}

        {/* Show metrics only if month is selected and data exists */}
        {selectedMonth && currentMonthData.length > 0 ? (
          <>
            {/* Volume Metrics */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">📊 Volume (Totais do Mês)</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="👁️ Visualizações Totais"
                  value={formatNumber(currentMetrics.visualizacoesTotal)}
                  icon={Eye}
                  trend={previousMonthData.length > 0 ? growthMetrics.crescimentoVisualizacoes : undefined}
                />
                <MetricCard
                  title="📊 Alcance Total"
                  value={formatNumber(currentMetrics.alcanceTotal)}
                  icon={Users}
                  trend={previousMonthData.length > 0 ? growthMetrics.crescimentoAlcance : undefined}
                />
                <MetricCard
                  title="👤 Visitas ao Perfil"
                  value={formatNumber(currentMetrics.visitasTotal)}
                  icon={Users}
                  trend={previousMonthData.length > 0 ? growthMetrics.crescimentoVisitas : undefined}
                />
                <MetricCard
                  title="💬 Interações Totais"
                  value={formatNumber(currentMetrics.interacoesTotal)}
                  icon={Target}
                />
                <MetricCard
                  title="🔗 Cliques no Link"
                  value={formatNumber(currentMetrics.clicksTotal)}
                  icon={MousePointerClick}
                />
              </div>
            </div>

            {/* Followers Metrics */}
            {currentMonthFollowersData.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-foreground">👥 Seguidores</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <MetricCard
                    title="Total de Seguidores (Mês)"
                    value={formatFollowersNumber(currentFollowersMetrics.totalSeguidores)}
                    icon={Users}
                    trend={previousMonthFollowersData.length > 0 ? currentFollowersMetrics.crescimentoPercentual : undefined}
                    variant="success"
                  />
                  <MetricCard
                    title="Novos Seguidores"
                    value={formatFollowersNumber(currentFollowersMetrics.novosSeguidoresMes)}
                    icon={UserPlus}
                    subtitle="Total no mês"
                  />
                  <MetricCard
                    title="Crescimento"
                    value={formatFollowersGrowth(currentFollowersMetrics.crescimentoAbsoluto)}
                    icon={currentFollowersMetrics.crescimentoAbsoluto >= 0 ? TrendingUp : TrendingDown}
                    subtitle={previousMonthFollowersData.length > 0 ? `${currentFollowersMetrics.crescimentoPercentual >= 0 ? '+' : ''}${currentFollowersMetrics.crescimentoPercentual.toFixed(1)}%` : undefined}
                    variant={currentFollowersMetrics.crescimentoAbsoluto >= 0 ? "success" : undefined}
                  />
                </div>
              </div>
            )}

            {/* Efficiency Metrics */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">🎯 Eficiência (Taxas)</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <MetricCard
                  title="Taxa Alcance → Visita"
                  value={`${currentMetrics.taxaAlcanceVisita.toFixed(2)}%`}
                  icon={Target}
                  subtitle="Visitas / Alcance × 100"
                  variant="success"
                />
                <MetricCard
                  title="Taxa de Engajamento"
                  value={`${currentMetrics.taxaEngajamento.toFixed(2)}%`}
                  icon={TrendingUp}
                  subtitle="Interações / Alcance × 100"
                  variant={currentMetrics.taxaEngajamento > 1 ? "success" : "warning"}
                />
              </div>
            </div>

            {/* Growth Metrics */}
            {previousMonthData.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-foreground">📈 Crescimento (vs Mês Anterior)</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <MetricCard
                    title="👁️ Crescimento de Visualizações"
                    value={formatPercentage(growthMetrics.crescimentoVisualizacoes)}
                    icon={growthMetrics.crescimentoVisualizacoes >= 0 ? TrendingUp : TrendingDown}
                    variant={growthMetrics.crescimentoVisualizacoes >= 0 ? "success" : undefined}
                  />
                  <MetricCard
                    title="📊 Crescimento de Alcance"
                    value={formatPercentage(growthMetrics.crescimentoAlcance)}
                    icon={growthMetrics.crescimentoAlcance >= 0 ? TrendingUp : TrendingDown}
                    variant={growthMetrics.crescimentoAlcance >= 0 ? "success" : undefined}
                  />
                  <MetricCard
                    title="👤 Crescimento de Visitas"
                    value={formatPercentage(growthMetrics.crescimentoVisitas)}
                    icon={growthMetrics.crescimentoVisitas >= 0 ? TrendingUp : TrendingDown}
                    variant={growthMetrics.crescimentoVisitas >= 0 ? "success" : undefined}
                  />
                </div>
              </div>
            )}

            {/* Charts */}
            <TrendChart
              data={currentMonthData}
              title="Tendência de Desempenho - Marketing"
              description="Visualize a evolução das métricas de marketing ao longo do período"
            />

            {currentMonthFollowersData.length > 0 && (
              <FollowersChart
                data={currentMonthFollowersData}
                title="Evolução de Seguidores"
                description="Acompanhe o crescimento da sua base de seguidores"
              />
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {availableMonths.length === 0
                ? "Faça upload de um arquivo CSV para começar"
                : "Selecione um mês para visualizar os dados"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
