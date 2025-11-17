import { useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Users, MousePointerClick, Eye, Target, TrendingDown, UserPlus, DollarSign, ShoppingCart, ShoppingBag, Coins, Heart, ExternalLink as ExternalLinkIcon, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { ComparisonToggle } from "@/components/dashboard/ComparisonToggle";
import { MonthComparisonSelector } from "@/components/dashboard/MonthComparisonSelector";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { MonthlyAggregateChart } from "@/components/dashboard/MonthlyAggregateChart";
import { AccumulatedFollowersChart } from "@/components/dashboard/AccumulatedFollowersChart";
import { NewFollowersChart } from "@/components/dashboard/NewFollowersChart";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { FollowersUploader } from "@/components/dashboard/FollowersUploader";
import { AdsUploader } from "@/components/dashboard/AdsUploader";
import { SalesUploader } from "@/components/dashboard/SalesUploader";
import { SalesMetricCard } from "@/components/dashboard/SalesMetricCard";
import { MonthFilter } from "@/components/dashboard/MonthFilter";
import { calculateMonthlyMetrics, calculateGrowthMetrics, formatNumber, formatPercentage } from "@/utils/metricsCalculator";
import { calculateFollowersMetrics, calculateFollowersGrowth, formatFollowersNumber, formatFollowersGrowth } from "@/utils/followersCalculator";
import { calculateAdsMetrics, filterAdsByMonth } from "@/utils/adsCalculator";
import { calculateSalesMetrics, filterOrdersByMonth, formatCurrency, formatPercentage as formatSalesPercentage, formatQuantity } from "@/utils/salesCalculator";
import { MarketingData, FollowersData, AdsData, ProcessedOrder } from "@/types/marketing";
import { useDashboard } from "@/contexts/DashboardContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLast12Months, getPrevious12Months, formatMonthRange } from "@/utils/dateRangeCalculator";
import { aggregateMarketingByMonth, aggregateFollowersByMonth, aggregateAdsByMonth } from "@/utils/monthlyAggregator";
import { 
  calculateMultiMonthMetrics, 
  calculateFollowersMultiMonthMetrics, 
  calculateAdsMultiMonthMetrics,
  prepareMarketingComparisonChartData,
  prepareFollowersComparisonChartData,
  getMonthColor,
  formatMonthLabel 
} from "@/utils/comparisonCalculator";

const Index = () => {
  const {
    marketingData,
    followersData,
    adsData,
    salesData,
    selectedMonth,
    availableMonths,
    setMarketingData,
    setFollowersData,
    setAdsData,
    setSalesData,
    setSelectedMonth,
    comparisonMode,
    selectedMonths,
    setComparisonMode,
    toggleMonth,
  } = useDashboard();

  // Detect 12-month view
  const isLast12MonthsView = selectedMonth === "last-12-months";
  
  // Get last 12 months
  const last12Months = useMemo(() => {
    if (!isLast12MonthsView) return [];
    return getLast12Months(availableMonths);
  }, [isLast12MonthsView, availableMonths]);

  // Comparison mode calculations
  const multiMonthMetrics = useMemo(() => {
    if (!comparisonMode || selectedMonths.length < 2) return null;
    return calculateMultiMonthMetrics(marketingData, selectedMonths);
  }, [comparisonMode, selectedMonths, marketingData]);

  const followersMultiMonthMetrics = useMemo(() => {
    if (!comparisonMode || selectedMonths.length < 2) return null;
    return calculateFollowersMultiMonthMetrics(followersData, selectedMonths);
  }, [comparisonMode, selectedMonths, followersData]);

  const adsMultiMonthMetrics = useMemo(() => {
    if (!comparisonMode || selectedMonths.length < 2) return null;
    return calculateAdsMultiMonthMetrics(
      adsData,
      selectedMonths,
      (data, month) => filterAdsByMonth(data, month)
    );
  }, [comparisonMode, selectedMonths, adsData]);

  const comparisonChartData = useMemo(() => {
    if (!comparisonMode || selectedMonths.length < 2) return [];
    return prepareMarketingComparisonChartData(marketingData, selectedMonths, "visualizacoes");
  }, [comparisonMode, selectedMonths, marketingData]);

  const monthColors = useMemo(() => {
    const colors: Record<string, string> = {};
    selectedMonths.forEach((month) => {
      colors[formatMonthLabel(month)] = getMonthColor(month, selectedMonths);
    });
    return colors;
  }, [selectedMonths]);

  // Filter marketing data by selected month or last 12 months
  const currentMonthData = useMemo(() => {
    if (!selectedMonth) return [];
    if (isLast12MonthsView) {
      return marketingData.filter((item) => 
        last12Months.some(month => item.Data.startsWith(month))
      );
    }
    return marketingData.filter((item) => item.Data.startsWith(selectedMonth));
  }, [marketingData, selectedMonth, isLast12MonthsView, last12Months]);

  // Get previous month/period marketing data for comparison
  const previousMonthData = useMemo(() => {
    if (!selectedMonth || availableMonths.length < 2) return [];
    
    if (isLast12MonthsView) {
      const previous12 = getPrevious12Months(availableMonths, last12Months);
      if (previous12.length === 0) return [];
      return marketingData.filter((item) => 
        previous12.some(month => item.Data.startsWith(month))
      );
    }
    
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex <= 0) return [];
    const previousMonth = availableMonths[currentIndex - 1];
    return marketingData.filter((item) => item.Data.startsWith(previousMonth));
  }, [marketingData, selectedMonth, availableMonths, isLast12MonthsView, last12Months]);

  // Filter followers data by selected month or last 12 months
  const currentMonthFollowersData = useMemo(() => {
    if (!selectedMonth) return [];
    if (isLast12MonthsView) {
      return followersData.filter((item) => 
        last12Months.some(month => item.Data.startsWith(month))
      );
    }
    return followersData.filter((item) => item.Data.startsWith(selectedMonth));
  }, [followersData, selectedMonth, isLast12MonthsView, last12Months]);

  // Get previous month/period followers data for comparison
  const previousMonthFollowersData = useMemo(() => {
    if (!selectedMonth || availableMonths.length < 2) return [];
    
    if (isLast12MonthsView) {
      const previous12 = getPrevious12Months(availableMonths, last12Months);
      if (previous12.length === 0) return [];
      return followersData.filter((item) => 
        previous12.some(month => item.Data.startsWith(month))
      );
    }
    
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex <= 0) return [];
    const previousMonth = availableMonths[currentIndex - 1];
    return followersData.filter((item) => item.Data.startsWith(previousMonth));
  }, [followersData, selectedMonth, availableMonths, isLast12MonthsView, last12Months]);

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
    if (!selectedMonth) {
      return { 
        totalSeguidores: 0, 
        novosSeguidoresMes: 0, 
        crescimentoAbsoluto: 0, 
        crescimentoPercentual: 0 
      };
    }
    
    // For 12-month view, use the last month as reference
    const referenceMonth = isLast12MonthsView && last12Months.length > 0
      ? last12Months[last12Months.length - 1].slice(0, 7)
      : selectedMonth.slice(0, 7);
    
    const metrics = calculateFollowersMetrics(
      currentMonthFollowersData,
      followersData,
      referenceMonth
    );
    
    if (previousMonthFollowersData.length > 0) {
      const currentIndex = availableMonths.indexOf(selectedMonth);
      const previousMonth = isLast12MonthsView && last12Months.length > 0
        ? getLast12Months(availableMonths.slice(0, availableMonths.indexOf(last12Months[0])))[0]
        : availableMonths[currentIndex - 1];
      
      if (previousMonth) {
        const previousMonthStr = isLast12MonthsView 
          ? previousMonth.slice(0, 7)
          : previousMonth.slice(0, 7);
        
        const growth = calculateFollowersGrowth(
          currentMonthFollowersData,
          previousMonthFollowersData,
          followersData,
          referenceMonth,
          previousMonthStr
        );
        return {
          ...metrics,
          crescimentoAbsoluto: growth.crescimentoAbsoluto,
          crescimentoPercentual: growth.crescimentoPercentual,
        };
      }
    }
    
    return metrics;
  }, [currentMonthFollowersData, previousMonthFollowersData, followersData, selectedMonth, availableMonths, isLast12MonthsView, last12Months]);

  // Filter ads data by selected month or last 12 months
  const currentMonthAdsData = useMemo(() => {
    if (!selectedMonth) return [];
    if (isLast12MonthsView) {
      return aggregateAdsByMonth(adsData, last12Months);
    }
    return filterAdsByMonth(adsData, selectedMonth);
  }, [adsData, selectedMonth, isLast12MonthsView, last12Months]);

  // Calculate ads metrics
  const currentAdsMetrics = useMemo(() => {
    if (currentMonthAdsData.length === 0) return null;
    return calculateAdsMetrics(currentMonthAdsData);
  }, [currentMonthAdsData]);

  const handleDataLoaded = (data: MarketingData[]) => {
    setMarketingData(data);
  };

  const handleFollowersDataLoaded = (data: FollowersData[]) => {
    setFollowersData(data);
  };

  const handleAdsDataLoaded = (data: AdsData[], fileName: string, summaries?: any[], isHierarchical?: boolean) => {
    setAdsData(data, summaries, isHierarchical);
  };

  const handleSalesDataLoaded = (data: ProcessedOrder[], fileName: string) => {
    setSalesData(data);
  };

  // Aggregate data by month for 12-month view
  const monthlyMarketingData = useMemo(() => {
    if (!isLast12MonthsView) return [];
    return aggregateMarketingByMonth(marketingData, last12Months);
  }, [isLast12MonthsView, marketingData, last12Months]);

  const monthlyFollowersData = useMemo(() => {
    if (followersData.length === 0) return [];
    
    if (isLast12MonthsView) {
      return aggregateFollowersByMonth(followersData, last12Months);
    } else if (selectedMonth) {
      // Para mês único, pegar contexto de até 6 meses atrás para melhor visualização
      const monthIndex = availableMonths.indexOf(selectedMonth);
      const startIndex = Math.max(0, monthIndex - 5);
      const relevantMonths = availableMonths.slice(startIndex, monthIndex + 1);
      return aggregateFollowersByMonth(followersData, relevantMonths);
    }
    
    return [];
  }, [followersData, isLast12MonthsView, selectedMonth, last12Months, availableMonths]);

  // Check if we have any data
  const hasMarketingData = marketingData.length > 0;
  const hasFollowersData = followersData.length > 0;
  const hasAdsData = adsData.length > 0;
  const hasSalesData = salesData.length > 0;
  const hasAnyData = hasMarketingData || hasFollowersData || hasAdsData || hasSalesData;

  // Filter and calculate sales metrics
  const currentMonthSalesData = useMemo(() => {
    if (!selectedMonth || !hasSalesData) return [];
    return filterOrdersByMonth(salesData, selectedMonth);
  }, [salesData, selectedMonth, hasSalesData]);

  const currentSalesMetrics = useMemo(() => {
    if (currentMonthSalesData.length === 0) return null;
    return calculateSalesMetrics(currentMonthSalesData);
  }, [currentMonthSalesData]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* CSV Uploaders */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <CSVUploader onDataLoaded={handleDataLoaded} />
        <FollowersUploader onDataLoaded={handleFollowersDataLoaded} />
        <AdsUploader onDataLoaded={handleAdsDataLoaded} />
        <SalesUploader onDataLoaded={handleSalesDataLoaded} />
      </div>

      {/* Welcome message when no data */}
      {!hasAnyData && (
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>👋 Bem-vindo ao Dashboard de Marketing</CardTitle>
            <CardDescription>
              Para começar, faça upload das suas planilhas acima
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              📊 CSV de Marketing • 👥 CSV de Seguidores • 📢 CSV de Anúncios Meta • 🛒 CSV de Vendas
            </p>
          </CardContent>
        </Card>
      )}

      {/* Comparison Toggle */}
      {availableMonths.length > 1 && (
        <ComparisonToggle
          enabled={comparisonMode}
          onToggle={setComparisonMode}
        />
      )}

      {/* Month Selector */}
      {availableMonths.length > 0 && (
        <>
          {comparisonMode ? (
            <MonthComparisonSelector
              availableMonths={availableMonths}
              selectedMonths={selectedMonths}
              onToggleMonth={toggleMonth}
            />
          ) : (
            <MonthFilter
              availableMonths={availableMonths}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
          )}
          
          {/* Period indicator badge for 12-month view */}
          {isLast12MonthsView && last12Months.length > 0 && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      📅 Visão Anual - Análise dos Últimos {last12Months.length} Meses
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Período: {formatMonthRange(last12Months)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Show metrics only if month is selected and data exists */}
      {comparisonMode && multiMonthMetrics ? (
        <>
          {/* Comparison View */}
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">📊 Marketing - Comparação de Métricas</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <ComparisonMetricCard
                title="Visualizações"
                icon={Eye}
                metrics={multiMonthMetrics.visualizacoes}
                formatValue={formatNumber}
              />
              <ComparisonMetricCard
                title="Alcance"
                icon={Users}
                metrics={multiMonthMetrics.alcance}
                formatValue={formatNumber}
              />
              <ComparisonMetricCard
                title="Visitas ao Perfil"
                icon={MousePointerClick}
                metrics={multiMonthMetrics.visitas}
                formatValue={formatNumber}
              />
              <ComparisonMetricCard
                title="Interações"
                icon={Heart}
                metrics={multiMonthMetrics.interacoes}
                formatValue={formatNumber}
              />
              <ComparisonMetricCard
                title="Clicks no Link"
                icon={Target}
                metrics={multiMonthMetrics.clicks}
                formatValue={formatNumber}
              />
            </div>
          </div>

          {/* Followers Comparison */}
          {hasFollowersData && followersMultiMonthMetrics && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">👥 Seguidores - Comparação</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ComparisonMetricCard
                  title="Total de Seguidores"
                  icon={Users}
                  metrics={followersMultiMonthMetrics.totalSeguidores}
                  formatValue={formatFollowersNumber}
                />
                <ComparisonMetricCard
                  title="Novos Seguidores"
                  icon={UserPlus}
                  metrics={followersMultiMonthMetrics.novosSeguidores}
                  formatValue={formatFollowersNumber}
                />
                <ComparisonMetricCard
                  title="Crescimento"
                  icon={TrendingUp}
                  metrics={followersMultiMonthMetrics.crescimento}
                  formatValue={formatFollowersNumber}
                />
              </div>
            </div>
          )}

          {/* Ads Comparison */}
          {hasAdsData && adsMultiMonthMetrics && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">💰 Anúncios - Comparação</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ComparisonMetricCard
                  title="Investimento Total"
                  icon={DollarSign}
                  metrics={adsMultiMonthMetrics.investimento}
                  formatValue={(v) => `R$ ${v.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                />
                <ComparisonMetricCard
                  title="ROAS"
                  icon={TrendingUp}
                  metrics={adsMultiMonthMetrics.roas}
                  formatValue={(v) => `${v.toFixed(2)}x`}
                />
                <ComparisonMetricCard
                  title="Conversões"
                  icon={ShoppingCart}
                  metrics={adsMultiMonthMetrics.compras}
                  formatValue={formatNumber}
                />
                <ComparisonMetricCard
                  title="CPC Médio"
                  icon={Coins}
                  metrics={adsMultiMonthMetrics.cpc}
                  formatValue={(v) => `R$ ${v.toFixed(2)}`}
                />
              </div>
            </div>
          )}

          {/* Comparison Charts */}
          {comparisonChartData.length > 0 && (
            <TrendChart
              data={comparisonChartData}
              title="📈 Visualizações - Comparação entre Meses"
              description="Comparação diária de visualizações entre os meses selecionados"
              metrics={[]}
              comparisonMode={true}
              selectedMonths={selectedMonths.map(formatMonthLabel)}
              monthColors={monthColors}
            />
          )}
        </>
      ) : selectedMonth && hasMarketingData && currentMonthData.length > 0 ? (
          <>

            {/* Ads Section - Simplified - MOVED TO TOP */}
            {hasAdsData && currentAdsMetrics && (currentAdsMetrics.investimentoTotal > 0 || currentAdsMetrics.valorConversaoTotal > 0 || currentAdsMetrics.roas > 0 || currentAdsMetrics.custoPorCompra > 0) && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">💰 Anúncios (Meta Ads) - Principais Métricas</h2>
                  <Link to="/ads">
                    <Button variant="outline" className="gap-2">
                      Ver Análise Completa
                      <ExternalLinkIcon className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {/* ROI e Performance - Only 4 essential cards */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-foreground">💎 ROI e Performance</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                      title="Investimento Total"
                      value={`R$ ${currentAdsMetrics.investimentoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                      icon={DollarSign}
                      variant="default"
                    />
                    {currentAdsMetrics.valorConversaoTotal > 0 && (
                      <MetricCard
                        title="Valor de Conversão"
                        value={`R$ ${currentAdsMetrics.valorConversaoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                        icon={Coins}
                        variant="success"
                      />
                    )}
                    {currentAdsMetrics.roas > 0 && (
                      <MetricCard
                        title="ROAS"
                        value={`${currentAdsMetrics.roas.toFixed(2)}x`}
                        icon={TrendingUp}
                        subtitle={`Para cada R$ 1 investido: R$ ${currentAdsMetrics.roas.toFixed(2)}`}
                        variant={currentAdsMetrics.roas >= 2 ? "success" : currentAdsMetrics.roas >= 1 ? "default" : "warning"}
                      />
                    )}
                    {currentAdsMetrics.custoPorCompra > 0 && (
                      <MetricCard
                        title="Custo por Compra"
                        value={`R$ ${currentAdsMetrics.custoPorCompra.toFixed(2)}`}
                        icon={Target}
                      />
                    )}
                  </div>
                </div>
              </>
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
            {hasMarketingData && previousMonthData.length > 0 && (
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
            {isLast12MonthsView ? (
              <>
                <MonthlyAggregateChart
                  data={monthlyMarketingData}
                  title="📊 Visualizações × Alcance (Evolução Mensal)"
                  description="Compare o volume mensal de visualizações com o alcance total"
                  metrics={[
                    {
                      dataKey: "Visualizações",
                      name: "Visualizações",
                      color: "hsl(var(--chart-4))",
                    },
                    {
                      dataKey: "Alcance",
                      name: "Alcance",
                      color: "hsl(var(--chart-1))",
                    },
                  ]}
                />

                <MonthlyAggregateChart
                  data={monthlyMarketingData}
                  title="👥 Visitas × Interações (Evolução Mensal)"
                  description="Acompanhe a evolução mensal das visitas ao perfil e o nível de engajamento"
                  metrics={[
                    {
                      dataKey: "Visitas",
                      name: "Visitas",
                      color: "hsl(var(--chart-2))",
                    },
                    {
                      dataKey: "Interações",
                      name: "Interações",
                      color: "hsl(var(--chart-3))",
                    },
                  ]}
                />
              </>
            ) : (
              <>
                <TrendChart
                  data={currentMonthData}
                  title="📊 Visualizações × Alcance"
                  description="Compare o volume de visualizações com o alcance total"
                  metrics={[
                    {
                      dataKey: "visualizacoes",
                      name: "Visualizações",
                      color: "hsl(var(--chart-4))",
                    },
                    {
                      dataKey: "alcance",
                      name: "Alcance",
                      color: "hsl(var(--chart-1))",
                    },
                  ]}
                />

                <TrendChart
                  data={currentMonthData}
                  title="👥 Visitas × Interações"
                  description="Acompanhe as visitas ao perfil e o nível de engajamento"
                  metrics={[
                    {
                      dataKey: "visitas",
                      name: "Visitas",
                      color: "hsl(var(--chart-2))",
                    },
                    {
                      dataKey: "interacoes",
                      name: "Interações",
                      color: "hsl(var(--chart-3))",
                    },
                  ]}
                />
              </>
            )}

            {hasFollowersData && monthlyFollowersData.length > 0 && (
              <div className="col-span-full grid gap-4 md:grid-cols-2">
                <AccumulatedFollowersChart
                  data={monthlyFollowersData}
                  title="Crescimento Acumulado"
                  description="Soma dos novos seguidores ao longo do período"
                />
                <NewFollowersChart
                  data={monthlyFollowersData}
                  title="Novos Seguidores"
                  description="Crescimento mensal da base de seguidores"
                />
              </div>
            )}

            {/* Sales Performance Section */}
            {hasSalesData && currentSalesMetrics && !comparisonMode && (
              <>
                <div className="col-span-full flex items-center gap-2 mt-8">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Performance de Vendas</h2>
                </div>

                <div className="col-span-full grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                  <SalesMetricCard
                    title="Faturamento Total"
                    value={formatCurrency(currentSalesMetrics.faturamentoTotal)}
                    icon={DollarSign}
                    subtitle="No período selecionado"
                    variant="success"
                  />
                  <SalesMetricCard
                    title="Total de Pedidos"
                    value={formatQuantity(currentSalesMetrics.totalPedidos)}
                    icon={ShoppingCart}
                    subtitle="Pedidos únicos"
                  />
                  <SalesMetricCard
                    title="Ticket Médio"
                    value={formatCurrency(currentSalesMetrics.ticketMedio)}
                    icon={TrendingUp}
                    subtitle="Por pedido"
                  />
                  <SalesMetricCard
                    title="Clientes Únicos"
                    value={formatQuantity(currentSalesMetrics.totalClientes)}
                    icon={Users}
                    subtitle="Compradores diferentes"
                  />
                  <SalesMetricCard
                    title="Taxa de Recompra"
                    value={formatSalesPercentage(currentSalesMetrics.taxaRecompra)}
                    icon={Heart}
                    subtitle="Clientes que compraram 2+ vezes"
                    variant={currentSalesMetrics.taxaRecompra > 20 ? "success" : "default"}
                  />
                </div>
              </>
            )}
          </>
        ) : null}
    </div>
  );
};

export default Index;
