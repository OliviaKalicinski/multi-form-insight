import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Users,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Eye,
  MousePointerClick,
  Heart,
  Percent,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { InstagramFunnel } from "@/components/dashboard/InstagramFunnel";
import { DayOfWeekChart } from "@/components/dashboard/DayOfWeekChart";
import { HistoricalBenchmarkTable } from "@/components/dashboard/HistoricalBenchmarkTable";
import { useInstagramPosts } from "@/hooks/useInstagramPosts";
import { buildInstagramFunnel, calculateHistoricalBenchmarks } from "@/utils/metricsCalculator";
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
import { KPITooltip } from "@/components/dashboard/KPITooltip";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import {
  calculateFollowersMetrics,
  calculateFollowersGrowth,
  formatFollowersNumber,
  formatFollowersGrowth,
  extractDailyFollowers,
  calculateDailyAverage,
} from "@/utils/followersCalculator";
import {
  calculateMonthlyMetrics,
  calculateGrowthMetrics,
  formatNumber,
  formatPercentage,
  extractDailyValues,
} from "@/utils/metricsCalculator";
import { aggregateFollowersByMonth, aggregateMarketingByMonth } from "@/utils/monthlyAggregator";
import { MarketingData, FollowersData } from "@/types/marketing";
import {
  calculateFollowersMultiMonthMetrics,
  calculateMultiMonthMetrics,
  prepareFollowersComparisonChartData,
  prepareMarketingComparisonChartData,
  getMonthColor,
  formatMonthLabel,
} from "@/utils/comparisonCalculator";
import { detectIncompleteMonth, calculateProjection } from "@/utils/incompleteMonthDetector";

const Seguidores = () => {
  const { marketingData, followersData, availableMonths, dateRange, comparisonDateRange, comparisonMode } =
    useDashboard();

  const [chartViewMode, setChartViewMode] = useState<"daily" | "weekly" | "monthly">("daily");

  const { instagramGoals } = useAppSettings();

  // Helper: filter string-dated items (Data: "YYYY-MM-DD") by dateRange
  const filterByDateRange = (items: { Data: string }[], range: typeof dateRange) => {
    if (!range) return items;
    return items.filter((item) => {
      const d = new Date(item.Data);
      return d >= range.start && d <= range.end;
    });
  };

  // Months within current dateRange (for monthly aggregation charts)
  const monthsInRange = useMemo(() => {
    if (!dateRange) return availableMonths;
    const months: string[] = [];
    const d = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), 1);
    while (d <= dateRange.end) {
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      d.setMonth(d.getMonth() + 1);
    }
    return months.filter((m) => availableMonths.includes(m));
  }, [dateRange, availableMonths]);

  const isMultiMonthView = monthsInRange.length > 1;
  const isAllPeriodsView = !dateRange;

  // Reference month = last month in current range
  const referenceMonth = useMemo(() => {
    if (dateRange) return format(dateRange.end, "yyyy-MM");
    return availableMonths[availableMonths.length - 1] || "";
  }, [dateRange, availableMonths]);

  // Followers filtering
  const currentMonthFollowersData = useMemo(
    () => filterByDateRange(followersData, dateRange) as typeof followersData,
    [followersData, dateRange],
  );

  const previousMonthFollowersData = useMemo(() => {
    if (!comparisonDateRange) return [] as typeof followersData;
    return filterByDateRange(followersData, comparisonDateRange) as typeof followersData;
  }, [followersData, comparisonDateRange]);

  // Comparison mode calculations — use 2-period comparison
  const multiMonthMetrics = useMemo(() => {
    if (!comparisonMode || !comparisonDateRange) return null;
    const compMonths = (() => {
      const months: string[] = [];
      const d = new Date(comparisonDateRange.start.getFullYear(), comparisonDateRange.start.getMonth(), 1);
      while (d <= comparisonDateRange.end) {
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        d.setMonth(d.getMonth() + 1);
      }
      return months.filter((m) => availableMonths.includes(m));
    })();
    const allMonths = [...new Set([...monthsInRange, ...compMonths])];
    if (allMonths.length < 2) return null;
    return calculateFollowersMultiMonthMetrics(followersData, allMonths);
  }, [comparisonMode, comparisonDateRange, monthsInRange, followersData, availableMonths]);

  const comparisonChartData = useMemo(() => {
    if (!comparisonMode || !comparisonDateRange) return [];
    const compMonths = (() => {
      const months: string[] = [];
      const d = new Date(comparisonDateRange.start.getFullYear(), comparisonDateRange.start.getMonth(), 1);
      while (d <= comparisonDateRange.end) {
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        d.setMonth(d.getMonth() + 1);
      }
      return months.filter((m) => availableMonths.includes(m));
    })();
    const allMonths = [...new Set([...monthsInRange, ...compMonths])];
    return prepareFollowersComparisonChartData(followersData, allMonths);
  }, [comparisonMode, comparisonDateRange, monthsInRange, followersData, availableMonths]);

  const monthColors = useMemo(() => {
    const colors: Record<string, string> = {};
    monthsInRange.forEach((month) => {
      colors[formatMonthLabel(month)] = getMonthColor(month, monthsInRange);
    });
    return colors;
  }, [monthsInRange]);

  // Calculate followers metrics
  const currentFollowersMetrics = useMemo(() => {
    if (currentMonthFollowersData.length === 0) {
      return {
        totalSeguidores: 0,
        novosSeguidoresMes: 0,
        crescimentoAbsoluto: 0,
        crescimentoPercentual: 0,
      };
    }

    const metrics = calculateFollowersMetrics(currentMonthFollowersData, followersData, referenceMonth);

    if (!dateRange || previousMonthFollowersData.length === 0) return metrics;

    const compRefMonth = comparisonDateRange ? format(comparisonDateRange.end, "yyyy-MM") : "";
    if (compRefMonth) {
      const growth = calculateFollowersGrowth(
        currentMonthFollowersData,
        previousMonthFollowersData,
        followersData,
        referenceMonth,
        compRefMonth,
      );
      return { ...metrics, ...growth };
    }
    return metrics;
  }, [
    currentMonthFollowersData,
    previousMonthFollowersData,
    followersData,
    dateRange,
    comparisonDateRange,
    referenceMonth,
  ]);

  // Detect incomplete month and calculate projections
  const monthInfo = useMemo(() => detectIncompleteMonth(referenceMonth), [referenceMonth]);

  const dailyFollowers = useMemo(() => extractDailyFollowers(currentMonthFollowersData), [currentMonthFollowersData]);

  // Calculate daily average
  const mediaDiaria = useMemo(() => calculateDailyAverage(currentMonthFollowersData), [currentMonthFollowersData]);

  const followersProjection = useMemo(() => {
    if (!monthInfo.isIncomplete || previousMonthFollowersData.length === 0) return null;
    const prevRefMonth = comparisonDateRange ? format(comparisonDateRange.end, "yyyy-MM") : "";
    if (!prevRefMonth) return null;
    const previousMetrics = calculateFollowersMetrics(previousMonthFollowersData, followersData, prevRefMonth);
    return calculateProjection(
      currentFollowersMetrics.novosSeguidoresMes,
      previousMetrics.novosSeguidoresMes,
      monthInfo,
      dailyFollowers,
      formatFollowersNumber,
    );
  }, [
    monthInfo,
    currentFollowersMetrics,
    previousMonthFollowersData,
    followersData,
    dailyFollowers,
    comparisonDateRange,
  ]);

  // Aggregate data for monthly view
  const monthlyFollowersData = useMemo(() => {
    if (!isMultiMonthView || followersData.length === 0) return [];
    return aggregateFollowersByMonth(followersData, monthsInRange);
  }, [followersData, isMultiMonthView, monthsInRange]);

  // === MARKETING DATA CALCULATIONS ===

  const currentMonthMarketingData = useMemo(() => {
    if (!marketingData.length) return [];
    return filterByDateRange(marketingData, dateRange) as typeof marketingData;
  }, [marketingData, dateRange]);

  const dailyMarketingData = useMemo(() => {
    if (!currentMonthMarketingData.length || !monthInfo.isIncomplete) return null;
    return {
      visualizacoes: extractDailyValues(currentMonthMarketingData, "visualizacoes"),
      alcance: extractDailyValues(currentMonthMarketingData, "alcance"),
      visitas: extractDailyValues(currentMonthMarketingData, "visitas"),
      interacoes: extractDailyValues(currentMonthMarketingData, "interacoes"),
      clicks: extractDailyValues(currentMonthMarketingData, "clicks"),
    };
  }, [currentMonthMarketingData, monthInfo.isIncomplete]);

  const previousMonthMarketingData = useMemo(() => {
    if (!marketingData.length || !comparisonDateRange) return [];
    return filterByDateRange(marketingData, comparisonDateRange) as typeof marketingData;
  }, [marketingData, comparisonDateRange]);

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

  // Monthly aggregated data for multi-month view
  const monthlyMarketingData = useMemo(() => {
    if (!isMultiMonthView || !marketingData.length) return [];
    return aggregateMarketingByMonth(marketingData, monthsInRange);
  }, [isMultiMonthView, marketingData, monthsInRange]);

  // Multi-month comparison metrics for marketing
  const multiMonthMarketingMetrics = useMemo(() => {
    if (!comparisonMode || monthsInRange.length < 2) return null;
    return calculateMultiMonthMetrics(marketingData, monthsInRange);
  }, [comparisonMode, monthsInRange, marketingData]);

  const hasFollowersData = followersData && followersData.length > 0;
  const hasMarketingData = marketingData && marketingData.length > 0;

  // Instagram Posts (day of week analysis)
  const { dayOfWeekStats, bestDayToPost, loading: postsLoading } = useInstagramPosts();

  // Funnel
  const funnelSteps = useMemo(() => buildInstagramFunnel(currentMonthMarketingData), [currentMonthMarketingData]);

  // Historical benchmarks (only for single-month view)
  const historicalBenchmarks = useMemo(() => {
    if (!hasMarketingData || isMultiMonthView || isAllPeriodsView) return [];
    return calculateHistoricalBenchmarks(marketingData, referenceMonth);
  }, [marketingData, hasMarketingData, isMultiMonthView, isAllPeriodsView, referenceMonth]);

  // Prepare chart data for FollowersTrendChart
  const followersChartData = useMemo(() => {
    return extractDailyFollowers(currentMonthFollowersData);
  }, [currentMonthFollowersData]);

  // Set default view mode based on filter
  useMemo(() => {
    if (isAllPeriodsView || isMultiMonthView) setChartViewMode("monthly");
  }, [isAllPeriodsView, isMultiMonthView]);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">📸 Instagram</h1>
            <Badge variant="secondary" className="text-xs">
              Orgânico
            </Badge>
          </div>
          <p className="text-muted-foreground">Métricas de atenção, alcance e engajamento orgânico</p>
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
              <p className="text-muted-foreground">📊 CSV de Seguidores</p>
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
                  <p className="text-sm font-medium text-foreground">📅 Visão Completa - Todos os Períodos</p>
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
                  selectedMonths={monthsInRange.map(formatMonthLabel)}
                  monthColors={monthColors}
                />
                <NewFollowersChart
                  data={comparisonChartData}
                  title="Novos Seguidores - Comparação"
                  description="Comparação diária de novos seguidores"
                  comparisonMode={true}
                  selectedMonths={monthsInRange.map(formatMonthLabel)}
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

              {/* Satellite Cards Grid - Reorganized by Dimensions */}
              <div className="grid gap-3 grid-cols-2">
                {/* Dimensão: Seguidores */}
                <StatusMetricCard
                  title="Novos Seguidores"
                  value={formatFollowersNumber(currentFollowersMetrics.novosSeguidoresMes)}
                  icon={<UserPlus className="h-3 w-3" />}
                  trend={
                    previousMonthFollowersData.length > 0 ? currentFollowersMetrics.crescimentoPercentual : undefined
                  }
                  status={getStatusFromBenchmark(currentFollowersMetrics.crescimentoPercentual, 0, {
                    warningThreshold: -10,
                    dangerThreshold: -25,
                  })}
                  size="compact"
                  tooltipKey="novos_seguidores"
                />
                <StatusMetricCard
                  title="Crescimento"
                  value={formatFollowersGrowth(currentFollowersMetrics.crescimentoAbsoluto)}
                  icon={
                    currentFollowersMetrics.crescimentoAbsoluto >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )
                  }
                  status={currentFollowersMetrics.crescimentoAbsoluto >= 0 ? "success" : "danger"}
                  interpretation={
                    previousMonthFollowersData.length > 0
                      ? currentFollowersMetrics.novosSeguidoresMes > 0 &&
                        currentFollowersMetrics.crescimentoPercentual === 0 &&
                        currentFollowersMetrics.crescimentoAbsoluto > 0
                        ? "Primeiro período"
                        : `${currentFollowersMetrics.crescimentoPercentual >= 0 ? "+" : ""}${currentFollowersMetrics.crescimentoPercentual.toFixed(1)}% vs anterior`
                      : undefined
                  }
                  size="compact"
                  tooltipKey="crescimento_seguidores"
                />
                {hasMarketingData && currentMarketingMetrics && (
                  <>
                    {/* Dimensão: Atenção */}
                    <StatusMetricCard
                      title="Visualizações"
                      value={formatNumber(currentMarketingMetrics.visualizacoesTotal)}
                      icon={<Eye className="h-3 w-3" />}
                      trend={
                        previousMonthMarketingData.length > 0
                          ? growthMarketingMetrics.crescimentoVisualizacoes
                          : undefined
                      }
                      status={getStatusFromBenchmark(growthMarketingMetrics.crescimentoVisualizacoes, 0, {
                        warningThreshold: -10,
                        dangerThreshold: -25,
                      })}
                      size="compact"
                      tooltipKey="visualizacoes_instagram"
                    />
                    {/* Dimensão: Alcance */}
                    <StatusMetricCard
                      title="Alcance"
                      value={formatNumber(currentMarketingMetrics.alcanceTotal)}
                      icon={<Users className="h-3 w-3" />}
                      trend={
                        previousMonthMarketingData.length > 0 ? growthMarketingMetrics.crescimentoAlcance : undefined
                      }
                      status={getStatusFromBenchmark(growthMarketingMetrics.crescimentoAlcance, 0, {
                        warningThreshold: -10,
                        dangerThreshold: -25,
                      })}
                      size="compact"
                      tooltipKey="alcance_instagram"
                    />
                    {/* Dimensão: Interesse */}
                    <StatusMetricCard
                      title="Interações"
                      value={formatNumber(currentMarketingMetrics.interacoesTotal)}
                      icon={<Heart className="h-3 w-3" />}
                      status={getStatusFromBenchmark(currentMarketingMetrics.interacoesTotal, 1000, {
                        warningThreshold: 500,
                        dangerThreshold: 100,
                      })}
                      size="compact"
                      tooltipKey="interacoes_instagram"
                    />
                    {/* Dimensão: Intenção */}
                    <StatusMetricCard
                      title="Visitas ao Perfil"
                      value={formatNumber(currentMarketingMetrics.visitasTotal)}
                      icon={<MousePointerClick className="h-3 w-3" />}
                      trend={
                        previousMonthMarketingData.length > 0 ? growthMarketingMetrics.crescimentoVisitas : undefined
                      }
                      status={getStatusFromBenchmark(growthMarketingMetrics.crescimentoVisitas, 0, {
                        warningThreshold: -10,
                        dangerThreshold: -25,
                      })}
                      size="compact"
                      tooltipKey="visitas_perfil_instagram"
                    />
                    <StatusMetricCard
                      title="Cliques no Link"
                      value={formatNumber(currentMarketingMetrics.clicksTotal)}
                      icon={<ExternalLink className="h-3 w-3" />}
                      status={getStatusFromBenchmark(currentMarketingMetrics.clicksTotal, 100, {
                        warningThreshold: 50,
                        dangerThreshold: 10,
                      })}
                      size="compact"
                      tooltipKey="cliques_link_instagram"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Taxas Derivadas - Nova Seção */}
            {hasMarketingData && currentMarketingMetrics && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">📊 Taxas Derivadas</h2>
                  <Badge variant="outline" className="text-xs">
                    Orgânico
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <StatusMetricCard
                    title="Taxa de Engajamento"
                    value={`${currentMarketingMetrics.taxaEngajamento.toFixed(2)}%`}
                    icon={<Heart className="h-4 w-4" />}
                    status={getStatusFromBenchmark(currentMarketingMetrics.taxaEngajamento, 3, {
                      warningThreshold: 1,
                      dangerThreshold: 0.5,
                    })}
                    benchmark={{ value: 3, label: "Meta: 3%" }}
                    interpretation={
                      currentMarketingMetrics.taxaEngajamento >= 5
                        ? "🏆 Excelente engajamento"
                        : currentMarketingMetrics.taxaEngajamento >= 3
                          ? "✅ Bom engajamento"
                          : currentMarketingMetrics.taxaEngajamento >= 1
                            ? "⚠️ Engajamento médio"
                            : "📉 Engajamento baixo"
                    }
                    tooltipKey="taxa_engajamento_instagram"
                  />
                  <StatusMetricCard
                    title="Taxa Alcance → Visita"
                    value={`${currentMarketingMetrics.taxaAlcanceVisita.toFixed(2)}%`}
                    icon={<MousePointerClick className="h-4 w-4" />}
                    status={getStatusFromBenchmark(currentMarketingMetrics.taxaAlcanceVisita, 1, {
                      warningThreshold: 0.5,
                      dangerThreshold: 0.25,
                    })}
                    benchmark={{ value: 1, label: "Meta: 1%" }}
                    interpretation={
                      currentMarketingMetrics.taxaAlcanceVisita >= 2
                        ? "🏆 Excelente conversão"
                        : currentMarketingMetrics.taxaAlcanceVisita >= 1
                          ? "✅ Boa conversão"
                          : currentMarketingMetrics.taxaAlcanceVisita >= 0.5
                            ? "⚠️ Conversão média"
                            : "📉 Conversão baixa"
                    }
                    tooltipKey="taxa_alcance_visita"
                  />
                  <StatusMetricCard
                    title="Taxa Visita → Clique"
                    value={`${currentMarketingMetrics.taxaVisitaClique.toFixed(2)}%`}
                    icon={<ExternalLink className="h-4 w-4" />}
                    status={getStatusFromBenchmark(currentMarketingMetrics.taxaVisitaClique, 10, {
                      warningThreshold: 5,
                      dangerThreshold: 2,
                    })}
                    benchmark={{ value: 10, label: "Meta: 10%" }}
                    interpretation={
                      currentMarketingMetrics.taxaVisitaClique >= 15
                        ? "🏆 Excelente conversão para ação"
                        : currentMarketingMetrics.taxaVisitaClique >= 10
                          ? "✅ Boa conversão para ação"
                          : currentMarketingMetrics.taxaVisitaClique >= 5
                            ? "⚠️ Conversão média"
                            : "📉 Conversão baixa - revisar CTA"
                    }
                    tooltipKey="taxa_visita_clique"
                  />
                </div>
              </div>
            )}

            {/* Funil + Benchmarks + Dia da Semana */}
            {hasMarketingData && currentMonthMarketingData.length > 0 && !isMultiMonthView && (
              <div className="grid gap-6 lg:grid-cols-3">
                <InstagramFunnel steps={funnelSteps} />
                <HistoricalBenchmarkTable benchmarks={historicalBenchmarks} />
                {!postsLoading && dayOfWeekStats.some((s) => s.posts > 0) && (
                  <DayOfWeekChart stats={dayOfWeekStats} bestDay={bestDayToPost} />
                )}
              </div>
            )}

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
                {isMultiMonthView && monthlyMarketingData.length > 0 ? (
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
          hasFollowersData && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Não há dados de seguidores para o período selecionado.
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
