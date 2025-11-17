import { useMemo } from "react";
import { Users, UserPlus, TrendingUp, TrendingDown, Calendar, Target, Eye, MousePointerClick, Heart } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { ComparisonToggle } from "@/components/dashboard/ComparisonToggle";
import { MonthComparisonSelector } from "@/components/dashboard/MonthComparisonSelector";
import { AccumulatedFollowersChart } from "@/components/dashboard/AccumulatedFollowersChart";
import { NewFollowersChart } from "@/components/dashboard/NewFollowersChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { MonthlyAggregateChart } from "@/components/dashboard/MonthlyAggregateChart";
import { MonthFilter } from "@/components/dashboard/MonthFilter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/contexts/DashboardContext";
import { calculateFollowersMetrics, calculateFollowersGrowth, formatFollowersNumber, formatFollowersGrowth } from "@/utils/followersCalculator";
import { calculateMonthlyMetrics, calculateGrowthMetrics, formatNumber, formatPercentage } from "@/utils/metricsCalculator";
import { aggregateFollowersByMonth, aggregateMarketingByMonth } from "@/utils/monthlyAggregator";
import { getLast12Months, getPrevious12Months, formatMonthRange } from "@/utils/dateRangeCalculator";
import { MarketingData, FollowersData } from "@/types/marketing";
import { calculateFollowersMultiMonthMetrics, calculateMultiMonthMetrics, prepareFollowersComparisonChartData, prepareMarketingComparisonChartData, getMonthColor, formatMonthLabel } from "@/utils/comparisonCalculator";

const Seguidores = () => {
  const {
    marketingData,
    followersData,
    selectedMonth,
    availableMonths,
    setSelectedMonth,
    comparisonMode,
    selectedMonths,
    setComparisonMode,
    toggleMonth,
  } = useDashboard();

  // Detect 12-month view
  const isLast12MonthsView = selectedMonth === "last-12-months";

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
        return { ...metrics, ...growth };
      }
    }
    return metrics;
  }, [currentMonthFollowersData, previousMonthFollowersData, followersData, selectedMonth, availableMonths, isLast12MonthsView, last12Months]);

  // Aggregate data for 12-month view
  const monthlyFollowersData = useMemo(() => {
    if (!isLast12MonthsView || followersData.length === 0) return [];
    return aggregateFollowersByMonth(followersData, last12Months);
  }, [followersData, isLast12MonthsView, last12Months]);

  // === MARKETING DATA CALCULATIONS ===
  
  // Filter marketing data by selected month or last 12 months
  const currentMonthMarketingData = useMemo(() => {
    if (!marketingData.length || !selectedMonth || isLast12MonthsView) return [];
    return marketingData.filter(item => item.Data.startsWith(selectedMonth));
  }, [marketingData, selectedMonth, isLast12MonthsView]);

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
                Para começar, faça upload da sua planilha de seguidores na página Visão Geral
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                📊 CSV de Seguidores
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
            {/* Comparison Metrics Cards */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">📊 Métricas Comparativas</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ComparisonMetricCard
                  title="Total de Seguidores"
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
        ) : selectedMonth && hasFollowersData && currentMonthFollowersData.length > 0 ? (
          <>
            {/* Followers Metrics Cards */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">📊 Métricas de Seguidores</h2>
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

            {/* Efficiency Metrics - Only in single month view */}
            {!isLast12MonthsView && hasMarketingData && currentMarketingMetrics && currentMonthMarketingData.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-foreground">🎯 Eficiência (Taxas)</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <MetricCard
                    title="Taxa Alcance → Visita"
                    value={`${currentMarketingMetrics.taxaAlcanceVisita.toFixed(2)}%`}
                    icon={Target}
                    subtitle="Visitas / Alcance × 100"
                    variant="success"
                  />
                  <MetricCard
                    title="Taxa de Engajamento"
                    value={`${currentMarketingMetrics.taxaEngajamento.toFixed(2)}%`}
                    icon={TrendingUp}
                    subtitle="Interações / Alcance × 100"
                    variant={currentMarketingMetrics.taxaEngajamento > 1 ? "success" : "warning"}
                  />
                </div>
              </div>
            )}

            {/* Growth Metrics */}
            {!isLast12MonthsView && hasMarketingData && previousMonthMarketingData.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-foreground">📈 Crescimento (vs Mês Anterior)</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <MetricCard
                    title="👁️ Crescimento de Visualizações"
                    value={formatPercentage(growthMarketingMetrics.crescimentoVisualizacoes)}
                    icon={growthMarketingMetrics.crescimentoVisualizacoes >= 0 ? TrendingUp : TrendingDown}
                    variant={growthMarketingMetrics.crescimentoVisualizacoes >= 0 ? "success" : undefined}
                  />
                  <MetricCard
                    title="📊 Crescimento de Alcance"
                    value={formatPercentage(growthMarketingMetrics.crescimentoAlcance)}
                    icon={growthMarketingMetrics.crescimentoAlcance >= 0 ? TrendingUp : TrendingDown}
                    variant={growthMarketingMetrics.crescimentoAlcance >= 0 ? "success" : undefined}
                  />
                  <MetricCard
                    title="👤 Crescimento de Visitas"
                    value={formatPercentage(growthMarketingMetrics.crescimentoVisitas)}
                    icon={growthMarketingMetrics.crescimentoVisitas >= 0 ? TrendingUp : TrendingDown}
                    variant={growthMarketingMetrics.crescimentoVisitas >= 0 ? "success" : undefined}
                  />
                </div>
              </div>
            )}

            {/* Charts - Visualizações × Alcance */}
            {hasMarketingData && (
              isLast12MonthsView && monthlyMarketingData.length > 0 ? (
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
              ) : currentMonthMarketingData.length > 0 ? (
                <TrendChart
                  data={currentMonthMarketingData}
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
              ) : null
            )}

            {/* Charts - Visitas × Interações */}
            {hasMarketingData && (
              isLast12MonthsView && monthlyMarketingData.length > 0 ? (
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
              ) : currentMonthMarketingData.length > 0 ? (
                <TrendChart
                  data={currentMonthMarketingData}
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
              ) : null
            )}

            {/* Charts - Followers */}
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
