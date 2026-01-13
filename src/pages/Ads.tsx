import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  Coins,
  TrendingUp,
  TrendingDown,
  Percent,
  Eye,
  MousePointerClick,
  ShoppingCart,
  Calendar,
  Zap,
  Target,
  Heart,
  BarChart3,
  Users,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { StatusMetricCard, getStatusFromBenchmark } from "@/components/dashboard/StatusMetricCard";
import { AdsBreakdown } from "@/components/dashboard/AdsBreakdown";
import { useDashboard } from "@/contexts/DashboardContext";
import { filterAdsByMonth } from "@/utils/adsParserV2";
import { calculateAdsMetrics } from "@/utils/adsCalculator";
import { getLast12Months, formatMonthRange } from "@/utils/dateRangeCalculator";
import { aggregateAdsByMonth } from "@/utils/monthlyAggregator";
import { calculateAdsMultiMonthMetrics } from "@/utils/comparisonCalculator";
import { cn } from "@/lib/utils";
import { AdsData } from "@/types/marketing";

// ===== Helper Functions for Objective Detection =====
const getObjective = (ad: AdsData): string => {
  const objetivo = ad["Objetivo"] || "";
  if (objetivo.includes("OUTCOME_SALES")) return "OUTCOME_SALES";
  if (objetivo.includes("OUTCOME_ENGAGEMENT")) return "OUTCOME_ENGAGEMENT";
  if (objetivo.includes("OUTCOME_TRAFFIC")) return "OUTCOME_TRAFFIC";
  if (objetivo.includes("OUTCOME_AWARENESS")) return "OUTCOME_AWARENESS";
  if (objetivo.includes("OUTCOME_LEADS")) return "OUTCOME_LEADS";
  return "UNKNOWN";
};

const hasObjective = (data: AdsData[], objective: string): boolean => {
  return data.some(ad => getObjective(ad) === objective);
};

const Ads = () => {
  const navigate = useNavigate();
  const { 
    adsData, 
    monthlySummaries, 
    hasHierarchicalFormat, 
    selectedMonth, 
    availableMonths, 
    comparisonMode,
    selectedMonths,
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
    return calculateAdsMultiMonthMetrics(
      adsData, 
      selectedMonths,
      (data, month) => isLast12MonthsView ? aggregateAdsByMonth(data, [month]) : filterAdsByMonth(data, month)
    );
  }, [comparisonMode, selectedMonths, adsData, isLast12MonthsView]);

  const currentMonthAdsData = useMemo(() => {
    // selectedMonth null = "Todos os períodos" = retornar todos os dados
    if (!selectedMonth) {
      return adsData;
    }
    if (isLast12MonthsView) {
      return aggregateAdsByMonth(adsData, last12Months);
    }
    return filterAdsByMonth(adsData, selectedMonth);
  }, [adsData, selectedMonth, isLast12MonthsView, last12Months]);

  // ===== Objective Detection for Current Data =====
  const objectivesSummary = useMemo(() => {
    const salesCount = currentMonthAdsData.filter(ad => getObjective(ad) === "OUTCOME_SALES").length;
    const engagementCount = currentMonthAdsData.filter(ad => getObjective(ad) === "OUTCOME_ENGAGEMENT").length;
    const trafficCount = currentMonthAdsData.filter(ad => getObjective(ad) === "OUTCOME_TRAFFIC").length;
    const awarenessCount = currentMonthAdsData.filter(ad => getObjective(ad) === "OUTCOME_AWARENESS").length;
    const leadsCount = currentMonthAdsData.filter(ad => getObjective(ad) === "OUTCOME_LEADS").length;
    const unknownCount = currentMonthAdsData.filter(ad => getObjective(ad) === "UNKNOWN").length;
    
    return {
      hasSales: salesCount > 0,
      hasEngagement: engagementCount > 0,
      hasTraffic: trafficCount > 0,
      hasAwareness: awarenessCount > 0,
      hasLeads: leadsCount > 0,
      salesCount,
      engagementCount,
      trafficCount,
      awarenessCount,
      leadsCount,
      unknownCount,
      total: currentMonthAdsData.length,
    };
  }, [currentMonthAdsData]);

  // Calculate current metrics
  const metrics = useMemo(() => {
    if (isLast12MonthsView) {
      return calculateAdsMetrics(currentMonthAdsData);
    }
    
    if (hasHierarchicalFormat && monthlySummaries.length > 0) {
      const summary = monthlySummaries.find(s => s.month === selectedMonth);
      if (summary) {
        return summary.data;
      }
    }
    return calculateAdsMetrics(currentMonthAdsData);
  }, [hasHierarchicalFormat, monthlySummaries, selectedMonth, currentMonthAdsData, isLast12MonthsView]);

  // Calculate trends vs previous month
  const trends = useMemo(() => {
    if (!selectedMonth || isLast12MonthsView) return null;
    
    const sortedMonths = [...availableMonths].sort();
    const currentIndex = sortedMonths.indexOf(selectedMonth);
    if (currentIndex <= 0) return null;

    const previousMonth = sortedMonths[currentIndex - 1];
    const previousData = filterAdsByMonth(adsData, previousMonth);
    const previousMetrics = calculateAdsMetrics(previousData);

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      investmentTrend: calculateTrend(metrics.investimentoTotal, previousMetrics.investimentoTotal),
      revenueTrend: calculateTrend(metrics.valorConversaoTotal, previousMetrics.valorConversaoTotal),
      roasTrend: calculateTrend(metrics.roas, previousMetrics.roas),
      conversionsTrend: calculateTrend(metrics.comprasTotal, previousMetrics.comprasTotal),
      cpaTrend: calculateTrend(metrics.custoPorCompra, previousMetrics.custoPorCompra),
      cpcTrend: calculateTrend(metrics.cpcMedio, previousMetrics.cpcMedio),
      // Engagement trends
      resultsTrend: calculateTrend(metrics.resultadosTotal, previousMetrics.resultadosTotal),
      cpeTrend: calculateTrend(metrics.custoPorResultadoMedio, previousMetrics.custoPorResultadoMedio),
      engagementRateTrend: calculateTrend(metrics.taxaEngajamento, previousMetrics.taxaEngajamento),
    };
  }, [selectedMonth, availableMonths, adsData, metrics, isLast12MonthsView]);

  // Derived metrics
  const netProfit = metrics.valorConversaoTotal - metrics.investimentoTotal;
  const roasGoal = 3.0;
  const roasProgress = Math.min((metrics.roas / roasGoal) * 100, 150);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatRoas = (value: number) => {
    return `${value.toFixed(2)}x`;
  };

  // ROAS status and interpretation
  const getRoasStatus = (roas: number) => {
    if (roas >= 4) return { status: 'success' as const, badge: '🏆 Premium', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' };
    if (roas >= 3) return { status: 'success' as const, badge: '✓ Meta', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' };
    if (roas >= 2) return { status: 'warning' as const, badge: '⚠️ Baixo', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' };
    return { status: 'danger' as const, badge: '🚨 Crítico', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' };
  };

  const getRoasInterpretation = (roas: number) => {
    if (roas >= 4) return "🎯 Excelente! Campanhas muito rentáveis.";
    if (roas >= 3) return "✅ Bom desempenho, dentro da meta.";
    if (roas >= 2) return "⚠️ Abaixo da meta, revisar campanhas.";
    return "🚨 ROAS crítico, ação urgente necessária.";
  };

  // Engagement status and interpretation
  const getEngagementStatus = (rate: number) => {
    if (rate >= 5) return { status: 'success' as const, badge: '🏆 Excelente', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' };
    if (rate >= 3) return { status: 'success' as const, badge: '✓ Bom', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' };
    if (rate >= 1) return { status: 'warning' as const, badge: '⚠️ Médio', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' };
    return { status: 'danger' as const, badge: '📉 Baixo', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' };
  };

  const getEngagementInterpretation = (rate: number) => {
    if (rate >= 5) return "🎯 Excelente engajamento! Conteúdo ressoando bem.";
    if (rate >= 3) return "✅ Bom engajamento, público interessado.";
    if (rate >= 1) return "⚠️ Engajamento moderado, testar novos formatos.";
    return "📉 Engajamento baixo, revisar segmentação e criativos.";
  };

  const roasStatusInfo = getRoasStatus(metrics.roas);
  const engagementStatusInfo = getEngagementStatus(metrics.taxaEngajamento);

  // Build objectives label for header
  const objectivesLabel = useMemo(() => {
    const labels: string[] = [];
    if (objectivesSummary.hasSales) labels.push("Sales");
    if (objectivesSummary.hasEngagement) labels.push("Engagement");
    if (objectivesSummary.hasTraffic) labels.push("Traffic");
    if (objectivesSummary.hasAwareness) labels.push("Awareness");
    if (objectivesSummary.hasLeads) labels.push("Leads");
    return labels.length > 0 ? labels.join(" • ") : "Não identificado";
  }, [objectivesSummary]);

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análise de Anúncios</h1>
          <p className="text-sm text-muted-foreground">Performance de campanhas de Meta Ads</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Objective Badge */}
          {currentMonthAdsData.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1.5">
              <Megaphone className="h-3 w-3" />
              <span>{objectivesLabel}</span>
            </Badge>
          )}
          {/* Inline 12-month indicator */}
          {isLast12MonthsView && last12Months.length > 0 && (
            <Badge variant="outline" className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              <span>Últimos {last12Months.length} meses</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Period range text for 12-month view */}
      {isLast12MonthsView && last12Months.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Período: {formatMonthRange(last12Months)}
        </p>
      )}

      {/* Empty state */}
      {adsData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">
              Nenhum dado de anúncios disponível.
              <br />
              Faça upload de um arquivo CSV/TSV do Meta Ads Manager na página "Uploader".
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Ir para Uploader
            </Button>
          </CardContent>
        </Card>
      ) : currentMonthAdsData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum dado de anúncios disponível para o período selecionado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Comparison Mode */}
          {comparisonMode && multiMonthMetrics ? (
            <>
              <h2 className="text-2xl font-semibold text-foreground">📊 Comparação de Métricas</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <ComparisonMetricCard
                  title="Investimento Total"
                  icon={DollarSign}
                  metrics={multiMonthMetrics.investimento}
                  formatValue={formatCurrency}
                />
                <ComparisonMetricCard
                  title="ROAS"
                  icon={TrendingUp}
                  metrics={multiMonthMetrics.roas}
                  formatValue={formatRoas}
                />
                <ComparisonMetricCard
                  title="Conversões (Compras)"
                  icon={ShoppingCart}
                  metrics={multiMonthMetrics.compras}
                  formatValue={formatNumber}
                />
                <ComparisonMetricCard
                  title="CPC Médio"
                  icon={Coins}
                  metrics={multiMonthMetrics.cpc}
                  formatValue={formatCurrency}
                />
                <ComparisonMetricCard
                  title="Taxa de Conversão"
                  icon={Percent}
                  metrics={multiMonthMetrics.taxaConversao}
                  formatValue={formatPercent}
                />
              </div>
              
              {/* Engagement Comparison Cards (if engagement campaigns exist) */}
              {objectivesSummary.hasEngagement && (
                <>
                  <h3 className="text-lg font-semibold text-foreground mt-4">📣 Métricas de Engajamento</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <ComparisonMetricCard
                      title="Resultados"
                      icon={Zap}
                      metrics={multiMonthMetrics.resultados}
                      formatValue={formatNumber}
                    />
                    <ComparisonMetricCard
                      title="Custo por Resultado"
                      icon={Target}
                      metrics={multiMonthMetrics.cpe}
                      formatValue={formatCurrency}
                    />
                    <ComparisonMetricCard
                      title="Taxa de Engajamento"
                      icon={Heart}
                      metrics={multiMonthMetrics.taxaEngajamento}
                      formatValue={formatPercent}
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* ===== ADAPTIVE UI BASED ON OBJECTIVE ===== */}
              {objectivesSummary.hasSales ? (
                // ===== SALES VIEW =====
                <>
                  {/* ===== ROW 1: ROAS Compact (40%) + Satellite Cards (60%) ===== */}
                  <div className="grid gap-4 lg:grid-cols-5">
                    {/* Main ROAS Card - Compact */}
                    <Card className={cn(
                      "lg:col-span-2 border-2 relative",
                      roasStatusInfo.bgColor
                    )}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header with badge */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-primary" />
                              <span className="text-sm font-semibold text-foreground">ROAS</span>
                            </div>
                            <Badge 
                              variant={metrics.roas >= 3 ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {roasStatusInfo.badge}
                            </Badge>
                          </div>

                          {/* Main Value */}
                          <p className={cn("text-3xl font-bold", roasStatusInfo.color)}>
                            {formatRoas(metrics.roas)}
                          </p>

                          {/* Compact Calculation */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatCurrency(metrics.valorConversaoTotal)}</span>
                            <span>/</span>
                            <span>{formatCurrency(metrics.investimentoTotal)}</span>
                          </div>

                          {/* Progress + Trend in one line */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Meta: {roasGoal}x</span>
                              <div className="flex items-center gap-2">
                                {trends && (
                                  <span className={cn(
                                    "flex items-center gap-0.5",
                                    trends.roasTrend >= 0 ? "text-green-600" : "text-red-600"
                                  )}>
                                    {trends.roasTrend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {trends.roasTrend >= 0 ? '+' : ''}{trends.roasTrend.toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <Progress value={roasProgress} className="h-1.5" />
                          </div>

                          {/* Compact Interpretation */}
                          <p className="text-xs font-medium">
                            {getRoasInterpretation(metrics.roas)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Satellite Cards Grid (3x2) - Compact */}
                    <div className="lg:col-span-3 grid grid-cols-3 gap-2">
                      {/* Investment */}
                      <StatusMetricCard
                        title="Investimento"
                        value={formatCurrency(metrics.investimentoTotal)}
                        icon={<DollarSign className="h-3 w-3" />}
                        trend={trends?.investmentTrend}
                        status="neutral"
                        size="compact"
                      />

                      {/* Revenue */}
                      <StatusMetricCard
                        title="Receita"
                        value={formatCurrency(metrics.valorConversaoTotal)}
                        icon={<Coins className="h-3 w-3" />}
                        trend={trends?.revenueTrend}
                        status={getStatusFromBenchmark(
                          metrics.valorConversaoTotal,
                          metrics.investimentoTotal * 3,
                          { warningThreshold: 0.67, dangerThreshold: 0.5 }
                        )}
                        size="compact"
                      />

                      {/* Net Profit */}
                      <StatusMetricCard
                        title="Lucro"
                        value={formatCurrency(netProfit)}
                        icon={<TrendingUp className="h-3 w-3" />}
                        status={netProfit > 0 ? 'success' : 'danger'}
                        size="compact"
                      />

                      {/* Conversions */}
                      <StatusMetricCard
                        title="Conversões"
                        value={formatNumber(metrics.comprasTotal)}
                        icon={<ShoppingCart className="h-3 w-3" />}
                        trend={trends?.conversionsTrend}
                        status={getStatusFromBenchmark(
                          metrics.comprasTotal,
                          10,
                          { warningThreshold: 0.8, dangerThreshold: 0.5 }
                        )}
                        size="compact"
                      />

                      {/* CPA */}
                      <StatusMetricCard
                        title="CPA"
                        value={formatCurrency(metrics.custoPorCompra)}
                        icon={<Target className="h-3 w-3" />}
                        trend={trends?.cpaTrend}
                        invertTrend
                        status={getStatusFromBenchmark(
                          250,
                          metrics.custoPorCompra,
                          { invertComparison: true, warningThreshold: 0.8, dangerThreshold: 0.6 }
                        )}
                        size="compact"
                      />

                      {/* CPC */}
                      <StatusMetricCard
                        title="CPC"
                        value={formatCurrency(metrics.cpcMedio)}
                        icon={<MousePointerClick className="h-3 w-3" />}
                        trend={trends?.cpcTrend}
                        invertTrend
                        status={getStatusFromBenchmark(
                          2.5,
                          metrics.cpcMedio,
                          { invertComparison: true, warningThreshold: 0.8, dangerThreshold: 0.6 }
                        )}
                        size="compact"
                      />
                    </div>
                  </div>

                  {/* ===== ROW 2: Compact Funnel + Reach Stats ===== */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Compact Conversion Funnel */}
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <ShoppingCart className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">Funil de Conversão</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-center flex-1">
                            <p className="text-xs text-muted-foreground">Add Cart</p>
                            <p className="text-lg font-bold">{formatPercent(metrics.taxaAddCarrinho)}</p>
                          </div>
                          <span className="text-muted-foreground">→</span>
                          <div className="text-center flex-1">
                            <p className="text-xs text-muted-foreground">Conv. Cart</p>
                            <p className="text-lg font-bold text-green-600">{formatPercent(metrics.taxaConversaoCarrinho)}</p>
                          </div>
                          <span className="text-muted-foreground">→</span>
                          <div className="text-center flex-1">
                            <p className="text-xs text-muted-foreground">Abandono</p>
                            <p className="text-lg font-bold text-yellow-600">{formatPercent(metrics.taxaAbandonoCarrinho)}</p>
                          </div>
                          <span className="text-muted-foreground">→</span>
                          <div className="text-center flex-1">
                            <p className="text-xs text-muted-foreground">Compras</p>
                            <p className="text-lg font-bold text-primary">{formatNumber(metrics.comprasTotal)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Compact Reach & Performance Stats */}
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Eye className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">Alcance & Performance</span>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Alcance</p>
                            <p className="text-lg font-bold">{formatNumber(metrics.alcanceTotal)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Impressões</p>
                            <p className="text-lg font-bold">{formatNumber(metrics.impressoesTotal)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">CTR</p>
                            <p className="text-lg font-bold">{formatPercent(metrics.ctrMedio)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Frequência</p>
                            <p className="text-lg font-bold">{metrics.frequenciaMedia.toFixed(2)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                // ===== ENGAGEMENT VIEW =====
                <>
                  {/* ===== ROW 1: Engagement Card (40%) + Satellite Cards (60%) ===== */}
                  <div className="grid gap-4 lg:grid-cols-5">
                    {/* Main Engagement Card - Compact */}
                    <Card className={cn(
                      "lg:col-span-2 border-2 relative",
                      engagementStatusInfo.bgColor
                    )}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header with badge */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Heart className="h-4 w-4 text-primary" />
                              <span className="text-sm font-semibold text-foreground">Taxa de Engajamento</span>
                            </div>
                            <Badge 
                              variant={metrics.taxaEngajamento >= 3 ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {engagementStatusInfo.badge}
                            </Badge>
                          </div>

                          {/* Main Value */}
                          <p className={cn("text-3xl font-bold", engagementStatusInfo.color)}>
                            {formatPercent(metrics.taxaEngajamento)}
                          </p>

                          {/* Compact Calculation */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatNumber(metrics.engajamentosTotal)} engajamentos</span>
                            <span>/</span>
                            <span>{formatNumber(metrics.alcanceTotal)} alcance</span>
                          </div>

                          {/* Trend */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Benchmark: 3%+</span>
                            <div className="flex items-center gap-2">
                              {trends && (
                                <span className={cn(
                                  "flex items-center gap-0.5",
                                  trends.engagementRateTrend >= 0 ? "text-green-600" : "text-red-600"
                                )}>
                                  {trends.engagementRateTrend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                  {trends.engagementRateTrend >= 0 ? '+' : ''}{trends.engagementRateTrend.toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Compact Interpretation */}
                          <p className="text-xs font-medium">
                            {getEngagementInterpretation(metrics.taxaEngajamento)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Satellite Cards Grid (3x2) - Compact for Engagement */}
                    <div className="lg:col-span-3 grid grid-cols-3 gap-2">
                      {/* Investment */}
                      <StatusMetricCard
                        title="Investimento"
                        value={formatCurrency(metrics.investimentoTotal)}
                        icon={<DollarSign className="h-3 w-3" />}
                        trend={trends?.investmentTrend}
                        status="neutral"
                        size="compact"
                      />

                      {/* Results */}
                      <StatusMetricCard
                        title="Resultados"
                        value={formatNumber(metrics.resultadosTotal)}
                        icon={<Zap className="h-3 w-3" />}
                        trend={trends?.resultsTrend}
                        status={getStatusFromBenchmark(
                          metrics.resultadosTotal,
                          100,
                          { warningThreshold: 0.5, dangerThreshold: 0.25 }
                        )}
                        size="compact"
                      />

                      {/* CPE (Cost per Result) */}
                      <StatusMetricCard
                        title="Custo/Resultado"
                        value={formatCurrency(metrics.custoPorResultadoMedio)}
                        icon={<Target className="h-3 w-3" />}
                        trend={trends?.cpeTrend}
                        invertTrend
                        status={getStatusFromBenchmark(
                          1.0,
                          metrics.custoPorResultadoMedio,
                          { invertComparison: true, warningThreshold: 0.8, dangerThreshold: 0.5 }
                        )}
                        size="compact"
                      />

                      {/* Reach */}
                      <StatusMetricCard
                        title="Alcance"
                        value={formatNumber(metrics.alcanceTotal)}
                        icon={<Users className="h-3 w-3" />}
                        status="neutral"
                        size="compact"
                      />

                      {/* Impressions */}
                      <StatusMetricCard
                        title="Impressões"
                        value={formatNumber(metrics.impressoesTotal)}
                        icon={<Eye className="h-3 w-3" />}
                        status="neutral"
                        size="compact"
                      />

                      {/* Clicks */}
                      <StatusMetricCard
                        title="Cliques"
                        value={formatNumber(metrics.cliquesTotal)}
                        icon={<MousePointerClick className="h-3 w-3" />}
                        status="neutral"
                        size="compact"
                      />
                    </div>
                  </div>

                  {/* ===== ROW 2: Engagement Details ===== */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Engagement Breakdown */}
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Heart className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">Detalhes de Engajamento</span>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Engajamentos</p>
                            <p className="text-lg font-bold">{formatNumber(metrics.engajamentosTotal)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Visitas Perfil</p>
                            <p className="text-lg font-bold">{formatNumber(metrics.visitasPerfilTotal)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Visualizações</p>
                            <p className="text-lg font-bold">{formatNumber(metrics.visualizacoesTotal)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">CTR</p>
                            <p className="text-lg font-bold">{formatPercent(metrics.ctrMedio)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Cost Efficiency */}
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">Eficiência de Custo</span>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">CPM</p>
                            <p className="text-lg font-bold">{formatCurrency(metrics.cpmMedio)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">CPC</p>
                            <p className="text-lg font-bold">{formatCurrency(metrics.cpcMedio)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">CPE</p>
                            <p className="text-lg font-bold text-primary">{formatCurrency(metrics.custoPorResultadoMedio)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Frequência</p>
                            <p className="text-lg font-bold">{metrics.frequenciaMedia.toFixed(2)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* ===== ROW 3: Inline Financial Summary (both views) ===== */}
              <Card className="bg-muted/30">
                <CardContent className="py-3 px-4">
                  <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Investido:</span>
                      <span className="font-semibold">{formatCurrency(metrics.investimentoTotal)}</span>
                    </div>
                    {objectivesSummary.hasSales && (
                      <>
                        <span className="text-muted-foreground">→</span>
                        <div className="flex items-center gap-2">
                          <Coins className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Gerou:</span>
                          <span className="font-semibold">{formatCurrency(metrics.valorConversaoTotal)}</span>
                        </div>
                        <span className="text-muted-foreground">=</span>
                        <div className={cn(
                          "flex items-center gap-2 font-semibold",
                          netProfit >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          <span>{netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}</span>
                        </div>
                      </>
                    )}
                    {!objectivesSummary.hasSales && objectivesSummary.hasEngagement && (
                      <>
                        <span className="text-muted-foreground">→</span>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Resultados:</span>
                          <span className="font-semibold">{formatNumber(metrics.resultadosTotal)}</span>
                        </div>
                        <span className="text-muted-foreground">=</span>
                        <div className="flex items-center gap-2 font-semibold text-primary">
                          <Target className="h-4 w-4" />
                          <span>{formatCurrency(metrics.custoPorResultadoMedio)}/resultado</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ===== ROW 4: Breakdown by Ad ===== */}
              <AdsBreakdown ads={currentMonthAdsData} selectedMonth={selectedMonth || ""} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Ads;
