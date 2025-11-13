import { useMemo } from "react";
import { Eye, Users, MousePointerClick, Target } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { MonthlyAggregateChart } from "@/components/dashboard/MonthlyAggregateChart";
import { MonthFilter } from "@/components/dashboard/MonthFilter";
import { calculateMonthlyMetrics, calculateGrowthMetrics, formatNumber } from "@/utils/metricsCalculator";
import { useDashboard } from "@/contexts/DashboardContext";
import { getLast12Months, getPrevious12Months } from "@/utils/dateRangeCalculator";
import { aggregateMarketingByMonth } from "@/utils/monthlyAggregator";

const Volume = () => {
  const {
    marketingData,
    selectedMonth,
    availableMonths,
    setSelectedMonth,
  } = useDashboard();

  // Detect 12-month view
  const isLast12MonthsView = selectedMonth === "last-12-months";
  
  // Get last 12 months
  const last12Months = useMemo(() => {
    if (!isLast12MonthsView) return [];
    return getLast12Months(availableMonths);
  }, [isLast12MonthsView, availableMonths]);

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

  // Calculate metrics
  const currentMetrics = useMemo(
    () => calculateMonthlyMetrics(currentMonthData),
    [currentMonthData]
  );

  const previousMetrics = useMemo(
    () => calculateMonthlyMetrics(previousMonthData),
    [previousMonthData]
  );

  const growthMetrics = useMemo(() => {
    if (previousMonthData.length === 0) {
      return { crescimentoVisualizacoes: 0, crescimentoAlcance: 0, crescimentoVisitas: 0 };
    }
    return calculateGrowthMetrics(currentMonthData, previousMonthData);
  }, [currentMonthData, previousMonthData]);

  // Aggregate data for 12-month view
  const aggregatedMarketingData = useMemo(() => {
    if (!isLast12MonthsView || marketingData.length === 0) return [];
    return aggregateMarketingByMonth(marketingData, last12Months);
  }, [marketingData, isLast12MonthsView, last12Months]);

  const hasMarketingData = marketingData && marketingData.length > 0;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold text-foreground">📊 Volume</h1>
          <p className="text-muted-foreground">
            Métricas de alcance, visualizações e engajamento
          </p>
        </div>

        {/* Month Filter */}
        <MonthFilter
          availableMonths={availableMonths}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />

        {/* Show metrics only if month is selected and data exists */}
        {selectedMonth && hasMarketingData && currentMonthData.length > 0 ? (
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

            {/* Charts */}
            <div className="grid gap-6">
              {isLast12MonthsView ? (
                <>
                  <MonthlyAggregateChart
                    data={aggregatedMarketingData}
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
                    data={aggregatedMarketingData}
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
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {!selectedMonth 
              ? "Selecione um mês para visualizar as métricas"
              : "Nenhum dado disponível para o período selecionado"}
          </div>
        )}
      </div>
    </div>
  );
};

export default Volume;
