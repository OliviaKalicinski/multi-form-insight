import { useMemo, useState } from "react";
import { Users, UserPlus, TrendingUp, TrendingDown, Calendar, Target, Eye, MousePointerClick, Heart, Percent, BarChart3 } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { AccumulatedFollowersChart } from "@/components/dashboard/AccumulatedFollowersChart";
import { NewFollowersChart } from "@/components/dashboard/NewFollowersChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { TrendChartWithFilter } from "@/components/dashboard/TrendChartWithFilter";
import { MonthlyAggregateChart } from "@/components/dashboard/MonthlyAggregateChart";
import { FollowersHeroCard } from "@/components/dashboard/FollowersHeroCard";
import { FollowersTrendChart, ViewMode } from "@/components/dashboard/FollowersTrendChart";
import { StatusMetricCard, getStatusFromBenchmark } from "@/components/dashboard/StatusMetricCard";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { 
  calculateFollowersMetrics, 
  calculateFollowersGrowth, 
  formatFollowersNumber, 
  formatFollowersGrowth, 
  extractDailyFollowers,
  calculateDailyAverage 
} from "@/utils/followersCalculator";
import { calculateMonthlyMetrics, calculateGrowthMetrics, formatNumber, formatPercentage, extractDailyValues } from "@/utils/metricsCalculator";
import { aggregateFollowersByMonth, aggregateMarketingByMonth } from "@/utils/monthlyAggregator";
import { getLast12Months, getPrevious12Months, formatMonthRange } from "@/utils/dateRangeCalculator";
import { MarketingData, FollowersData } from "@/types/marketing";
import { calculateFollowersMultiMonthMetrics, calculateMultiMonthMetrics, prepareFollowersComparisonChartData, prepareMarketingComparisonChartData, getMonthColor, formatMonthLabel } from "@/utils/comparisonCalculator";
import { detectIncompleteMonth, calculateProjection } from "@/utils/incompleteMonthDetector";

const Seguidores = () => {
  const {
    marketingData,
    followersData,
    selectedMonth,
    availableMonths,
    comparisonMode,
    selectedMonths,
  } = useDashboard();

  const { instagramGoals } = useAppSettings();

  // Chart view mode state
  const [chartViewMode, setChartViewMode] = useState<ViewMode>("daily");

  // Detect 12-month view
  const isLast12MonthsView = selectedMonth === "last-12-months";
  
  // Detect "Todos os períodos" view
  const isAllPeriodsView = !selectedMonth && !comparisonMode;

  // Comparison mode calculations
  const multiMonthMetrics = useMemo(() => {
    if (!comparisonMode || selectedMonths.length < 2) return null;
    return calculateFollowersMultiMonthMetrics(followersData, selectedMonths);
  }, [comparisonMode, selectedMonths, followersData]);

  const comparisonChartData = useMemo(() => {
    if (!comparisonMode || selectedMonths.length < 2) return [];
    return prepareFollowersComparisonChartData(followersData, selectedMonths);
  }, [comparisonMode, selectedMonths, followersData]);

  const monthColors = useMemo(() => {
    const colors: Record<string, string> = {};
    selectedMonths.forEach((month) => {
      colors[formatMonthLabel(month)] = getMonthColor(month, selectedMonths);
    });
    return colors;
  }, [selectedMonths]);
  
  // Get last 12 months
  const last12Months = useMemo(() => {
    if (!isLast12MonthsView) return [];
    return getLast12Months(availableMonths);
  }, [isLast12MonthsView, availableMonths]);

  // Filter followers data by selected month or last 12 months
  const currentMonthFollowersData = useMemo(() => {
    // selectedMonth null = "Todos os períodos" = retornar todos os dados
    if (!selectedMonth) {
      return followersData;
    }
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

  // Calculate followers metrics
  const currentFollowersMetrics = useMemo(() => {
    if (currentMonthFollowersData.length === 0) {
      return { 
        totalSeguidores: 0, 
        novosSeguidoresMes: 0, 
        crescimentoAbsoluto: 0, 
        crescimentoPercentual: 0 
      };
    }
    
    // Determine reference month - handle null (Todos os períodos)
    let referenceMonth: string;
    if (isLast12MonthsView && last12Months.length > 0) {
      referenceMonth = last12Months[last12Months.length - 1].slice(0, 7);
    } else if (!selectedMonth && availableMonths.length > 0) {
      // "Todos os períodos" - usar o mês mais recente como referência
      referenceMonth = availableMonths[availableMonths.length - 1].slice(0, 7);
    } else if (selectedMonth) {
      referenceMonth = selectedMonth.slice(0, 7);
    } else {
      // Fallback: extrair do próprio dado
      referenceMonth = currentMonthFollowersData[currentMonthFollowersData.length - 1]?.Data?.slice(0, 7) || '';
    }
    
    const metrics = calculateFollowersMetrics(
      currentMonthFollowersData,
      followersData,
      referenceMonth
    );
    
    // Para "Todos os períodos", não calcular crescimento vs período anterior
    if (!selectedMonth) {
      return metrics;
    }
    
    if (previousMonthFollowersData.length > 0) {
      const currentIndex = availableMonths.indexOf(selectedMonth);
      const previousMonth = isLast12MonthsView && last12Months.length > 0
        ? getLast12Months(availableMonths.slice(0, availableMonths.indexOf(last12Months[0])))[0]
        : availableMonths[currentIndex - 1];
      
      if (previousMonth) {
        const previousMonthStr = previousMonth.slice(0, 7);
        
        const growth = calculateFollowersGrowth(
          currentMonthFollowersData,
          previousMonthFollowersData,
          followersData,
          referenceMonth,
          previousMonthStr
        );
        return { ...metrics, ...growth };
      }
    }
    return metrics;
  }, [currentMonthFollowersData, previousMonthFollowersData, followersData, selectedMonth, availableMonths, isLast12MonthsView, last12Months]);

  // Detect incomplete month and calculate projections
  const monthInfo = useMemo(() => 
    detectIncompleteMonth(selectedMonth || ''), 
    [selectedMonth]
  );

  const dailyFollowers = useMemo(() => 
    extractDailyFollowers(currentMonthFollowersData),
    [currentMonthFollowersData]
  );

  // Calculate daily average
  const mediaDiaria = useMemo(() => 
    calculateDailyAverage(currentMonthFollowersData),
    [currentMonthFollowersData]
  );

  const followersProjection = useMemo(() => {
    if (!monthInfo.isIncomplete || previousMonthFollowersData.length === 0) return null;
    
    const currentIndex = availableMonths.indexOf(selectedMonth || '');
    if (currentIndex <= 0) return null;
    
    const previousMonth = availableMonths[currentIndex - 1];
    const previousMonthStr = previousMonth.slice(0, 7);
    
    const previousMetrics = calculateFollowersMetrics(
      previousMonthFollowersData, 
      followersData, 
      previousMonthStr
    );
    
    return calculateProjection(
      currentFollowersMetrics.novosSeguidoresMes,
      previousMetrics.novosSeguidoresMes,
      monthInfo,
      dailyFollowers,
      formatFollowersNumber
    );
  }, [monthInfo, currentFollowersMetrics, previousMonthFollowersData, followersData, dailyFollowers, availableMonths, selectedMonth]);

  // Aggregate data for 12-month view
  const monthlyFollowersData = useMemo(() => {
    if (!isLast12MonthsView || followersData.length === 0) return [];
    return aggregateFollowersByMonth(followersData, last12Months);
  }, [followersData, isLast12MonthsView, last12Months]);

  // === MARKETING DATA CALCULATIONS ===
  
  // Filter marketing data by selected month or last 12 months
  const currentMonthMarketingData = useMemo(() => {
    if (!marketingData.length) return [];
    if (!selectedMonth) return marketingData; // Todos os períodos
    if (isLast12MonthsView) {
      return marketingData.filter(item => 
        last12Months.some(month => item.Data.startsWith(month))
      );
    }
    return marketingData.filter(item => item.Data.startsWith(selectedMonth));
  }, [marketingData, selectedMonth, isLast12MonthsView, last12Months]);

  const dailyMarketingData = useMemo(() => {
    if (!currentMonthMarketingData.length || !monthInfo.isIncomplete) return null;
    return {
      visualizacoes: extractDailyValues(currentMonthMarketingData, 'visualizacoes'),
      alcance: extractDailyValues(currentMonthMarketingData, 'alcance'),
      visitas: extractDailyValues(currentMonthMarketingData, 'visitas'),
      interacoes: extractDailyValues(currentMonthMarketingData, 'interacoes'),
      clicks: extractDailyValues(currentMonthMarketingData, 'clicks'),
    };
  }, [currentMonthMarketingData, monthInfo.isIncomplete]);

  const previousMonthMarketingData = useMemo(() => {
    if (!marketingData.length || !selectedMonth || isLast12MonthsView) return [];
    const monthIndex = availableMonths.indexOf(selectedMonth);
    if (monthIndex <= 0) return [];
    const previousMonth = availableMonths[monthIndex - 1];
    return marketingData.filter(item => item.Data.startsWith(previousMonth));
  }, [marketingData, selectedMonth, availableMonths, isLast12MonthsView]);

  // Calculate marketing metrics
  const currentMarketingMetrics = useMemo(() => {
    return calculateMonthlyMetrics(currentMonthMarketingData);
  }, [currentMonthMarketingData]);

  const growthMarketingMetrics = useMemo(() => {
    if (previousMonthMarketingData.length === 0) {
      return { crescimentoVisualizacoes: 0, crescimentoAlcance: 0, crescimentoVisitas: 0 };
    }
    return calculateGrowthMetrics(currentMonthMarketingData, previousMonthMarketingData);
  }, [currentMonthMarketingData, previousMonthMarketingData]);

  // Monthly aggregated data for 12-month view
  const monthlyMarketingData = useMemo(() => {
    if (!isLast12MonthsView || !marketingData.length) return [];
    return aggregateMarketingByMonth(marketingData, last12Months);
  }, [isLast12MonthsView, marketingData, last12Months]);

  // Multi-month comparison metrics for marketing
  const multiMonthMarketingMetrics = useMemo(() => {
    if (!comparisonMode || selectedMonths.length < 2) return null;
    return calculateMultiMonthMetrics(marketingData, selectedMonths);
  }, [comparisonMode, selectedMonths, marketingData]);

  const hasFollowersData = followersData && followersData.length > 0;
  const hasMarketingData = marketingData && marketingData.length > 0;

  // Prepare chart data for FollowersTrendChart
  const followersChartData = useMemo(() => {
    if (isAllPeriodsView || isLast12MonthsView) {
      // For "Todos" or 12-month view, use all available data
      return extractDailyFollowers(currentMonthFollowersData);
    }
    return dailyFollowers;
  }, [isAllPeriodsView, isLast12MonthsView, currentMonthFollowersData, dailyFollowers]);

  // Set default view mode based on filter
  useMemo(() => {
    if (isAllPeriodsView) {
      setChartViewMode("monthly");
    } else if (isLast12MonthsView) {
      setChartViewMode("monthly");
    }
  }, [isAllPeriodsView, isLast12MonthsView]);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold text-foreground">👥 Seguidores</h1>
          <p className="text-muted-foreground">
            Análise de crescimento da sua audiência
          </p>
        </div>


        {/* Show welcome message if no data */}
        {!hasFollowersData && (
          <Card>
            <CardHeader>
              <CardTitle>👋 Bem-vindo à Análise de Seguidores</CardTitle>
              <CardDescription>
                Para começar, faça upload da sua planilha de seguidores na página Uploader
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                📊 CSV de Seguidores
              </p>
            </CardContent>
          </Card>
        )}

        {/* Period indicator for 12-month view */}
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

        {/* Period indicator for "Todos os Períodos" */}
        {isAllPeriodsView && hasFollowersData && (
          <Card className="border-blue-500/50 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    📅 Visão Completa - Todos os Períodos
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mostrando dados de {availableMonths.length} meses disponíveis
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show metrics only if month is selected and data exists */}
        {comparisonMode && multiMonthMetrics ? (
          <>
            {/* Comparison Metrics Cards */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">📊 Métricas Comparativas</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ComparisonMetricCard
                  title="Total Acumulado"
                  icon={Users}
                  metrics={multiMonthMetrics.totalSeguidores}
                  formatValue={formatFollowersNumber}
                />
                <ComparisonMetricCard
                  title="Novos Seguidores"
                  icon={UserPlus}
                  metrics={multiMonthMetrics.novosSeguidores}
                  formatValue={formatFollowersNumber}
                />
                <ComparisonMetricCard
                  title="Crescimento"
                  icon={TrendingUp}
                  metrics={multiMonthMetrics.crescimento}
                  formatValue={formatFollowersNumber}
                />
              </div>
            </div>

            {/* Marketing Comparison Metrics */}
            {hasMarketingData && multiMonthMarketingMetrics && (
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-foreground">📊 Marketing - Comparação de Métricas</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <ComparisonMetricCard
                    title="Visualizações"
                    icon={Eye}
                    metrics={multiMonthMarketingMetrics.visualizacoes}
                    formatValue={formatNumber}
                  />
                  <ComparisonMetricCard
                    title="Alcance"
                    icon={Users}
                    metrics={multiMonthMarketingMetrics.alcance}
                    formatValue={formatNumber}
                  />
                  <ComparisonMetricCard
                    title="Visitas ao Perfil"
                    icon={MousePointerClick}
                    metrics={multiMonthMarketingMetrics.visitas}
                    formatValue={formatNumber}
                  />
                  <ComparisonMetricCard
                    title="Interações"
                    icon={Heart}
                    metrics={multiMonthMarketingMetrics.interacoes}
                    formatValue={formatNumber}
                  />
                  <ComparisonMetricCard
                    title="Clicks no Link"
                    icon={Target}
                    metrics={multiMonthMarketingMetrics.clicks}
                    formatValue={formatNumber}
                  />
                </div>
              </div>
            )}

            {/* Comparison Charts */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">📈 Gráficos Comparativos</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <AccumulatedFollowersChart
                  data={comparisonChartData}
                  title="Seguidores Acumulados - Comparação"
                  description="Comparação do total acumulado entre meses"
                  comparisonMode={true}
                  selectedMonths={selectedMonths.map(formatMonthLabel)}
                  monthColors={monthColors}
                />
                <NewFollowersChart
                  data={comparisonChartData}
                  title="Novos Seguidores - Comparação"
                  description="Comparação diária de novos seguidores"
                  comparisonMode={true}
                  selectedMonths={selectedMonths.map(formatMonthLabel)}
                  monthColors={monthColors}
                />
              </div>
            </div>
          </>
        ) : hasFollowersData && currentMonthFollowersData.length > 0 ? (
          <>
            {/* Hero Section: Hero Card + Satellite Cards */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Hero Card */}
              <FollowersHeroCard
                totalAcumulado={currentFollowersMetrics.totalSeguidores}
                novosNoMes={currentFollowersMetrics.novosSeguidoresMes}
                crescimentoPercentual={currentFollowersMetrics.crescimentoPercentual}
                mediaDiaria={mediaDiaria}
                meta={instagramGoals.metaSeguidoresMes}
                baselineSeguidores={instagramGoals.baselineSeguidores}
              />

              {/* Satellite Cards Grid */}
              <div className="grid gap-3 grid-cols-2">
                <StatusMetricCard
                  title="Novos Seguidores"
                  value={formatFollowersNumber(currentFollowersMetrics.novosSeguidoresMes)}
                  icon={<UserPlus className="h-3 w-3" />}
                  trend={previousMonthFollowersData.length > 0 ? currentFollowersMetrics.crescimentoPercentual : undefined}
                  status={getStatusFromBenchmark(
                    currentFollowersMetrics.crescimentoPercentual, 
                    0, 
                    { warningThreshold: -10, dangerThreshold: -25 }
                  )}
                  size="compact"
                />
                <StatusMetricCard
                  title="Crescimento"
                  value={formatFollowersGrowth(currentFollowersMetrics.crescimentoAbsoluto)}
                  icon={currentFollowersMetrics.crescimentoAbsoluto >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  status={currentFollowersMetrics.crescimentoAbsoluto >= 0 ? "success" : "danger"}
                  interpretation={
                    previousMonthFollowersData.length > 0 
                      ? (currentFollowersMetrics.novosSeguidoresMes > 0 && 
                         currentFollowersMetrics.crescimentoPercentual === 0 &&
                         currentFollowersMetrics.crescimentoAbsoluto > 0
                          ? "Primeiro período"
                          : `${currentFollowersMetrics.crescimentoPercentual >= 0 ? '+' : ''}${currentFollowersMetrics.crescimentoPercentual.toFixed(1)}% vs anterior`)
                      : undefined
                  }
                  size="compact"
                />
                {hasMarketingData && currentMarketingMetrics && (
                  <>
                    <StatusMetricCard
                      title="Visualizações"
                      value={formatNumber(currentMarketingMetrics.visualizacoesTotal)}
                      icon={<Eye className="h-3 w-3" />}
                      trend={previousMonthMarketingData.length > 0 ? growthMarketingMetrics.crescimentoVisualizacoes : undefined}
                      status={getStatusFromBenchmark(
                        growthMarketingMetrics.crescimentoVisualizacoes, 
                        0, 
                        { warningThreshold: -10, dangerThreshold: -25 }
                      )}
                      size="compact"
                    />
                    <StatusMetricCard
                      title="Alcance"
                      value={formatNumber(currentMarketingMetrics.alcanceTotal)}
                      icon={<Users className="h-3 w-3" />}
                      trend={previousMonthMarketingData.length > 0 ? growthMarketingMetrics.crescimentoAlcance : undefined}
                      status={getStatusFromBenchmark(
                        growthMarketingMetrics.crescimentoAlcance, 
                        0, 
                        { warningThreshold: -10, dangerThreshold: -25 }
                      )}
                      size="compact"
                    />
                    <StatusMetricCard
                      title="Taxa Alcance → Visita"
                      value={`${currentMarketingMetrics.taxaAlcanceVisita.toFixed(2)}%`}
                      icon={<Percent className="h-3 w-3" />}
                      status={getStatusFromBenchmark(
                        currentMarketingMetrics.taxaAlcanceVisita, 
                        1, 
                        { warningThreshold: 0.5, dangerThreshold: 0.25 }
                      )}
                      size="compact"
                    />
                    <StatusMetricCard
                      title="Taxa Engajamento"
                      value={`${currentMarketingMetrics.taxaEngajamento.toFixed(2)}%`}
                      icon={<Heart className="h-3 w-3" />}
                      status={getStatusFromBenchmark(
                        currentMarketingMetrics.taxaEngajamento, 
                        1, 
                        { warningThreshold: 0.5, dangerThreshold: 0.25 }
                      )}
                      size="compact"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Main Trend Chart with Toggle */}
            {followersChartData.length > 0 && (
              <FollowersTrendChart
                data={followersChartData}
                viewMode={chartViewMode}
                onViewModeChange={setChartViewMode}
                title="📈 Evolução de Seguidores"
                description="Novos seguidores ao longo do tempo"
                color="hsl(var(--chart-1))"
                showMovingAverage={chartViewMode === "daily"}
              />
            )}

            {/* Charts - Visualizações × Alcance */}
            {hasMarketingData && currentMonthMarketingData.length > 0 && (
              <div className="grid gap-6 lg:grid-cols-2">
                {isLast12MonthsView && monthlyMarketingData.length > 0 ? (
                  <>
                    <MonthlyAggregateChart
                      data={monthlyMarketingData}
                      title="📊 Visualizações × Alcance"
                      description="Evolução mensal"
                      metrics={[
                        { dataKey: "Visualizações", name: "Visualizações", color: "hsl(var(--chart-4))" },
                        { dataKey: "Alcance", name: "Alcance", color: "hsl(var(--chart-1))" },
                      ]}
                    />
                    <MonthlyAggregateChart
                      data={monthlyMarketingData}
                      title="👥 Visitas × Interações"
                      description="Evolução mensal"
                      metrics={[
                        { dataKey: "Visitas", name: "Visitas", color: "hsl(var(--chart-2))" },
                        { dataKey: "Interações", name: "Interações", color: "hsl(var(--chart-3))" },
                      ]}
                    />
                  </>
                ) : (
                  <>
                    <TrendChartWithFilter
                      data={currentMonthMarketingData}
                      title="📊 Visualizações × Alcance"
                      description="Compare o volume de visualizações com o alcance total"
                      metrics={[
                        { dataKey: "visualizacoes", name: "Visualizações", stroke: "hsl(var(--chart-4))" },
                        { dataKey: "alcance", name: "Alcance", stroke: "hsl(var(--chart-1))" },
                      ]}
                    />
                    <TrendChartWithFilter
                      data={currentMonthMarketingData}
                      title="👥 Visitas × Interações"
                      description="Acompanhe as visitas ao perfil e o nível de engajamento"
                      metrics={[
                        { dataKey: "visitas", name: "Visitas", stroke: "hsl(var(--chart-2))" },
                        { dataKey: "interacoes", name: "Interações", stroke: "hsl(var(--chart-3))" },
                      ]}
                    />
                  </>
                )}
              </div>
            )}

            {/* Charts - Followers (only in 12-month view) */}
            {monthlyFollowersData.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <AccumulatedFollowersChart
                  data={monthlyFollowersData}
                  title="Crescimento Acumulado"
                  description="Soma dos novos seguidores ao longo do período"
                />
                <NewFollowersChart
                  data={monthlyFollowersData}
                  title="Novos Seguidores por Mês"
                  description="Crescimento mensal da base de seguidores"
                />
              </div>
            )}
          </>
        ) : (
          selectedMonth && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  {isLast12MonthsView 
                    ? "Não há dados de seguidores para os últimos 12 meses."
                    : "Não há dados de seguidores para o mês selecionado."}
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
};

export default Seguidores;
