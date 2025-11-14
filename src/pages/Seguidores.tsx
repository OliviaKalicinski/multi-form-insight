import { useMemo } from "react";
import { Users, UserPlus, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { ComparisonToggle } from "@/components/dashboard/ComparisonToggle";
import { MonthComparisonSelector } from "@/components/dashboard/MonthComparisonSelector";
import { AccumulatedFollowersChart } from "@/components/dashboard/AccumulatedFollowersChart";
import { NewFollowersChart } from "@/components/dashboard/NewFollowersChart";
import { MonthFilter } from "@/components/dashboard/MonthFilter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/contexts/DashboardContext";
import { calculateFollowersMetrics, calculateFollowersGrowth, formatFollowersNumber, formatFollowersGrowth } from "@/utils/followersCalculator";
import { aggregateFollowersByMonth } from "@/utils/monthlyAggregator";
import { getLast12Months, getPrevious12Months, formatMonthRange } from "@/utils/dateRangeCalculator";
import { FollowersData } from "@/types/marketing";
import { calculateFollowersMultiMonthMetrics, prepareFollowersComparisonChartData, getMonthColor, formatMonthLabel } from "@/utils/comparisonCalculator";

const Seguidores = () => {
  const {
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

  const hasFollowersData = followersData && followersData.length > 0;

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
                Para começar, faça upload da sua planilha de seguidores acima
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

            {/* Charts */}
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
