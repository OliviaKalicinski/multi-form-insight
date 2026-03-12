import { useState, useMemo, useEffect } from "react";
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
  Info,
  Shield,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { StatusMetricCard, getStatusFromBenchmark } from "@/components/dashboard/StatusMetricCard";
import { AdsBreakdown } from "@/components/dashboard/AdsBreakdown";
import { AdClassificationChart } from "@/components/dashboard/AdClassificationChart";
import { KPITooltip } from "@/components/dashboard/KPITooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import {
  filterAdsByMonth,
  filterAdsByDateRange,
  filterAdsByObjective,
  determinePrimaryObjective,
  getAdObjective,
} from "@/utils/adsParserV2";
import { calculateAdsMetrics } from "@/utils/adsCalculator";
import { getLast12Months, formatMonthRange } from "@/utils/dateRangeCalculator";
import { aggregateAdsByMonth } from "@/utils/monthlyAggregator";
import { calculateAdsMultiMonthMetrics } from "@/utils/comparisonCalculator";
import { cn } from "@/lib/utils";
import { AdsData } from "@/types/marketing";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Helper function for objective detection (uses centralized function from adsParserV2)
const hasObjective = (data: AdsData[], objective: string): boolean => {
  return data.some((ad) => getAdObjective(ad) === objective);
};

// Decisional status derived from ROAS thresholds
const getDecisionalStatus = (roas: number, thresholds: { excelente: number; medio: number; minimo: number }) => {
  if (roas >= thresholds.excelente)
    return {
      label: "Escalável",
      color: "text-green-600",
      bgColor: "bg-green-50 border-green-200",
      description: "Performance excelente. Considerar aumentar investimento de forma controlada.",
    };
  if (roas >= thresholds.medio)
    return {
      label: "Saudável",
      color: "text-blue-600",
      bgColor: "bg-blue-50 border-blue-200",
      description: "Retorno dentro da meta. Manter e otimizar campanhas atuais.",
    };
  if (roas >= thresholds.minimo)
    return {
      label: "Em observação",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 border-yellow-200",
      description: "Retorno abaixo da meta. Revisar segmentação e criativos.",
    };
  return {
    label: "Prejuízo operacional",
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    description: "Investimento não se paga. Ação urgente necessária.",
  };
};

const SESSION_KEY = "ads-manual-objective";

const Ads = () => {
  const navigate = useNavigate();
  const {
    adsData,
    monthlySummaries,
    hasHierarchicalFormat,
    availableMonths,
    dateRange,
    comparisonDateRange,
    comparisonMode,
    lastDataDate,
  } = useDashboard();

  // Get goals from database
  const { sectorBenchmarks } = useAppSettings();

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncMetaAds = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-meta-ads', { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Sincronização concluída",
        description: `${data.synced} registros sincronizados (${data.period?.since} → ${data.period?.until})`,
      });
      // Reload to pick up new data
      window.location.reload();
    } catch (err: any) {
      toast({
        title: "Erro na sincronização",
        description: err.message || "Falha ao sincronizar com Meta Ads",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // ===== FASE 5: Manual objective filter =====
  const [manualObjective, setManualObjective] = useState<string>(() => {
    return sessionStorage.getItem(SESSION_KEY) || "auto";
  });

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, manualObjective);
  }, [manualObjective]);

  // Months in current date range (for multi-month comparison)
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

  // Comparison mode calculations
  const multiMonthMetrics = useMemo(() => {
    if (!comparisonMode || !comparisonDateRange || monthsInRange.length === 0) return null;
    const compMonths: string[] = [];
    const d = new Date(comparisonDateRange.start.getFullYear(), comparisonDateRange.start.getMonth(), 1);
    while (d <= comparisonDateRange.end) {
      compMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      d.setMonth(d.getMonth() + 1);
    }
    const allMonths = [...new Set([...monthsInRange, ...compMonths.filter((m) => availableMonths.includes(m))])];
    if (allMonths.length < 2) return null;
    return calculateAdsMultiMonthMetrics(adsData, allMonths, (data, month) => filterAdsByMonth(data, month));
  }, [comparisonMode, comparisonDateRange, monthsInRange, adsData, availableMonths]);

  const currentMonthAdsData = useMemo(() => {
    if (!dateRange) return adsData;
    return filterAdsByDateRange(adsData, dateRange.start, dateRange.end);
  }, [adsData, dateRange]);

  // ===== FASE 5: effectiveObjective replaces primaryObjective =====
  const detectedObjective = useMemo(() => {
    return determinePrimaryObjective(currentMonthAdsData);
  }, [currentMonthAdsData]);

  const effectiveObjective = useMemo(() => {
    if (manualObjective === "auto") return detectedObjective;
    // Validate manual selection has data
    if (hasObjective(currentMonthAdsData, manualObjective)) return manualObjective;
    return detectedObjective;
  }, [manualObjective, detectedObjective, currentMonthAdsData]);

  // Available objectives for toggle
  const availableObjectives = useMemo(
    () => ({
      sales: hasObjective(currentMonthAdsData, "OUTCOME_SALES"),
      engagement: hasObjective(currentMonthAdsData, "OUTCOME_ENGAGEMENT"),
      traffic: hasObjective(currentMonthAdsData, "OUTCOME_TRAFFIC"),
    }),
    [currentMonthAdsData],
  );

  // ===== ACTIVE ADS DATA: Filtered by effective objective =====
  const activeAdsData = useMemo(() => {
    if (effectiveObjective === "OUTCOME_SALES") {
      return filterAdsByObjective(currentMonthAdsData, "OUTCOME_SALES");
    }
    if (effectiveObjective === "OUTCOME_ENGAGEMENT") {
      return filterAdsByObjective(currentMonthAdsData, "OUTCOME_ENGAGEMENT");
    }
    if (effectiveObjective === "OUTCOME_TRAFFIC") {
      return filterAdsByObjective(currentMonthAdsData, "OUTCOME_TRAFFIC");
    }
    return currentMonthAdsData;
  }, [currentMonthAdsData, effectiveObjective]);

  // ===== Objective Detection for Current Data =====
  const objectivesSummary = useMemo(() => {
    const salesCount = currentMonthAdsData.filter((ad) => getAdObjective(ad) === "OUTCOME_SALES").length;
    const engagementCount = currentMonthAdsData.filter((ad) => getAdObjective(ad) === "OUTCOME_ENGAGEMENT").length;
    const trafficCount = currentMonthAdsData.filter((ad) => getAdObjective(ad) === "OUTCOME_TRAFFIC").length;
    const awarenessCount = currentMonthAdsData.filter((ad) => getAdObjective(ad) === "OUTCOME_AWARENESS").length;
    const leadsCount = currentMonthAdsData.filter((ad) => getAdObjective(ad) === "OUTCOME_LEADS").length;
    const unknownCount = currentMonthAdsData.filter((ad) => getAdObjective(ad) === "UNKNOWN").length;

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
      // Flags that sync with activeAdsData (now using effectiveObjective)
      primaryObjective: effectiveObjective,
      isSalesView: effectiveObjective === "OUTCOME_SALES",
      isEngagementView: effectiveObjective === "OUTCOME_ENGAGEMENT",
    };
  }, [currentMonthAdsData, effectiveObjective]);

  // Calculate current metrics (ALWAYS from activeAdsData, never from generic summaries)
  const metrics = useMemo(() => {
    return calculateAdsMetrics(activeAdsData);
  }, [activeAdsData]);

  // Investimento total de TODOS os objetivos (não filtrado)
  const totalInvestmentAllObjectives = useMemo(() => {
    return calculateAdsMetrics(currentMonthAdsData).investimentoTotal;
  }, [currentMonthAdsData]);

  // ===== FASE 1: Semantic aliases =====
  const totalInvestment = totalInvestmentAllObjectives;
  const objectiveInvestment = metrics.investimentoTotal;
  const revenueBenchmarkMultiplier = 3;
  const grossMediaResult = metrics.valorConversaoTotal - totalInvestment;

  // ROAS corrigido: receita de vendas / investimento total (todos objetivos)
  const correctedRoas = totalInvestment > 0 ? metrics.valorConversaoTotal / totalInvestment : 0;

  // Calculate trends vs comparison period
  const trends = useMemo(() => {
    if (!comparisonDateRange) return null;

    let previousData = filterAdsByDateRange(adsData, comparisonDateRange.start, comparisonDateRange.end);
    if (effectiveObjective === "OUTCOME_SALES") {
      previousData = filterAdsByObjective(previousData, "OUTCOME_SALES");
    } else if (effectiveObjective === "OUTCOME_ENGAGEMENT") {
      previousData = filterAdsByObjective(previousData, "OUTCOME_ENGAGEMENT");
    } else if (effectiveObjective === "OUTCOME_TRAFFIC") {
      previousData = filterAdsByObjective(previousData, "OUTCOME_TRAFFIC");
    }

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
      resultsTrend: calculateTrend(metrics.resultadosTotal, previousMetrics.resultadosTotal),
      cpeTrend: calculateTrend(metrics.custoPorResultadoMedio, previousMetrics.custoPorResultadoMedio),
      engagementRateTrend: calculateTrend(metrics.taxaEngajamento, previousMetrics.taxaEngajamento),
    };
  }, [comparisonDateRange, adsData, metrics, effectiveObjective]);

  // Derived metrics - use ROAS thresholds from database
  const roasGoal = sectorBenchmarks.roasMedio || 3.0;
  const roasExcelente = sectorBenchmarks.roasExcelente || 4.0;
  const roasMinimo = sectorBenchmarks.roasMinimo || 2.5;
  const roasProgress = Math.min((correctedRoas / roasGoal) * 100, 150);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatRoas = (value: number) => {
    return `${value.toFixed(2)}x`;
  };

  // ROAS status and interpretation - use dynamic thresholds
  const getRoasStatus = (roas: number) => {
    if (roas >= roasExcelente)
      return {
        status: "success" as const,
        badge: "🏆 Premium",
        color: "text-green-600",
        bgColor: "bg-green-50 border-green-200",
      };
    if (roas >= roasGoal)
      return {
        status: "success" as const,
        badge: "✓ Meta",
        color: "text-blue-600",
        bgColor: "bg-blue-50 border-blue-200",
      };
    if (roas >= roasMinimo)
      return {
        status: "warning" as const,
        badge: "⚠️ Baixo",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 border-yellow-200",
      };
    return {
      status: "danger" as const,
      badge: "🚨 Crítico",
      color: "text-red-600",
      bgColor: "bg-red-50 border-red-200",
    };
  };

  const getRoasInterpretation = (roas: number) => {
    if (roas >= roasExcelente) return "🎯 Excelente! Campanhas muito rentáveis.";
    if (roas >= roasGoal) return "✅ Bom desempenho, dentro da meta.";
    if (roas >= roasMinimo) return "⚠️ Abaixo da meta, revisar campanhas.";
    return "🚨 ROAS crítico, ação urgente necessária.";
  };

  // Engagement status and interpretation
  const getEngagementStatus = (rate: number) => {
    if (rate >= 5)
      return {
        status: "success" as const,
        badge: "🏆 Excelente",
        color: "text-green-600",
        bgColor: "bg-green-50 border-green-200",
      };
    if (rate >= 3)
      return {
        status: "success" as const,
        badge: "✓ Bom",
        color: "text-blue-600",
        bgColor: "bg-blue-50 border-blue-200",
      };
    if (rate >= 1)
      return {
        status: "warning" as const,
        badge: "⚠️ Médio",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 border-yellow-200",
      };
    return { status: "danger" as const, badge: "📉 Baixo", color: "text-red-600", bgColor: "bg-red-50 border-red-200" };
  };

  const getEngagementInterpretation = (rate: number) => {
    if (rate >= 5) return "🎯 Excelente engajamento! Conteúdo ressoando bem.";
    if (rate >= 3) return "✅ Bom engajamento, público interessado.";
    if (rate >= 1) return "⚠️ Engajamento moderado, testar novos formatos.";
    return "📉 Engajamento baixo, revisar segmentação e criativos.";
  };

  const roasStatusInfo = getRoasStatus(correctedRoas);
  const engagementStatusInfo = getEngagementStatus(metrics.taxaEngajamento);
  const decisionalStatus = getDecisionalStatus(correctedRoas, {
    excelente: roasExcelente,
    medio: roasGoal,
    minimo: roasMinimo,
  });

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análise de Anúncios</h1>
          <p className="text-sm text-muted-foreground">Performance de campanhas de Meta Ads</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* FASE 5: Manual Objective Toggle */}
          {currentMonthAdsData.length > 0 && (
            <ToggleGroup
              type="single"
              value={manualObjective}
              onValueChange={(val) => {
                if (val) setManualObjective(val);
              }}
              className="bg-muted/50 rounded-lg p-0.5"
            >
              <ToggleGroupItem
                value="auto"
                className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md"
              >
                Auto{" "}
                {manualObjective === "auto" && detectedObjective !== "ALL"
                  ? `(${detectedObjective.replace("OUTCOME_", "")})`
                  : ""}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="OUTCOME_SALES"
                disabled={!availableObjectives.sales}
                className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md disabled:opacity-40"
              >
                Sales
              </ToggleGroupItem>
              <ToggleGroupItem
                value="OUTCOME_ENGAGEMENT"
                disabled={!availableObjectives.engagement}
                className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md disabled:opacity-40"
              >
                Engagement
              </ToggleGroupItem>
              <ToggleGroupItem
                value="OUTCOME_TRAFFIC"
                disabled={!availableObjectives.traffic}
                className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md disabled:opacity-40"
              >
                Traffic
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      </div>

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
            <p className="text-muted-foreground">Nenhum dado de anúncios disponível para o período selecionado.</p>
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
                  tooltipKey="investimento_ads"
                />
                <ComparisonMetricCard
                  title="ROAS"
                  icon={TrendingUp}
                  metrics={multiMonthMetrics.roas}
                  formatValue={formatRoas}
                  tooltipKey="roas"
                />
                <ComparisonMetricCard
                  title="Conversões (Compras)"
                  icon={ShoppingCart}
                  metrics={multiMonthMetrics.compras}
                  formatValue={formatNumber}
                  tooltipKey="conversoes_total"
                />
                <ComparisonMetricCard
                  title="CPC Médio"
                  icon={Coins}
                  metrics={multiMonthMetrics.cpc}
                  formatValue={formatCurrency}
                  tooltipKey="cpc"
                />
                <ComparisonMetricCard
                  title="Taxa de Conversão"
                  icon={Percent}
                  metrics={multiMonthMetrics.taxaConversao}
                  formatValue={formatPercent}
                  tooltipKey="ctr"
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
                      tooltipKey="resultados_engagement"
                    />
                    <ComparisonMetricCard
                      title="Custo por Resultado"
                      icon={Target}
                      metrics={multiMonthMetrics.cpe}
                      formatValue={formatCurrency}
                      tooltipKey="custo_por_resultado"
                    />
                    <ComparisonMetricCard
                      title="Taxa de Engajamento"
                      icon={Heart}
                      metrics={multiMonthMetrics.taxaEngajamento}
                      formatValue={formatPercent}
                      tooltipKey="taxa_engajamento"
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* ===== ADAPTIVE UI BASED ON OBJECTIVE ===== */}
              {objectivesSummary.isSalesView ? (
                // ===== SALES VIEW =====
                <>
                  {/* ===== BLOCO 1: DECISÃO (3 cards) — FASE 2 ===== */}
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card 1 — ROAS do Negócio */}
                    <KPITooltip metricKey="roas">
                      <Card className={cn("border-2 relative", roasStatusInfo.bgColor)}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold text-foreground">ROAS Ads</span>
                              </div>
                              <Badge
                                variant={correctedRoas >= roasGoal ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {roasStatusInfo.badge}
                              </Badge>
                            </div>

                            <p className={cn("text-3xl font-bold", roasStatusInfo.color)}>
                              {formatRoas(correctedRoas)}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              Receita pixel Meta ÷ investimento total em mídia
                            </p>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatCurrency(metrics.valorConversaoTotal)}</span>
                              <span>/</span>
                              <span>{formatCurrency(totalInvestment)}</span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Meta: {roasGoal}x</span>
                                {trends && (
                                  <span
                                    className={cn(
                                      "flex items-center gap-0.5",
                                      trends.roasTrend >= 0 ? "text-green-600" : "text-red-600",
                                    )}
                                  >
                                    {trends.roasTrend >= 0 ? (
                                      <TrendingUp className="h-3 w-3" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3" />
                                    )}
                                    {trends.roasTrend >= 0 ? "+" : ""}
                                    {trends.roasTrend.toFixed(0)}%
                                  </span>
                                )}
                              </div>
                              <Progress value={roasProgress} className="h-1.5" />
                            </div>

                            <p className="text-xs font-medium">{getRoasInterpretation(correctedRoas)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </KPITooltip>

                    {/* Card 2 — Resultado Bruto de Mídia */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Card className="border relative">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Coins className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-semibold text-foreground">
                                      Resultado Bruto de Mídia
                                    </span>
                                  </div>
                                  {totalInvestment > 0 && (
                                    <Badge
                                      variant={grossMediaResult >= 0 ? "default" : "destructive"}
                                      className="text-xs"
                                    >
                                      {grossMediaResult >= 0 ? "Positivo" : "Negativo"}
                                    </Badge>
                                  )}
                                </div>

                                <p
                                  className={cn(
                                    "text-3xl font-bold",
                                    totalInvestment === 0
                                      ? "text-muted-foreground"
                                      : grossMediaResult >= 0
                                        ? "text-foreground"
                                        : "text-foreground",
                                  )}
                                >
                                  {totalInvestment === 0
                                    ? "—"
                                    : `${grossMediaResult >= 0 ? "+" : ""}${formatCurrency(grossMediaResult)}`}
                                </p>

                                <p className="text-xs text-muted-foreground">Receita - investimento total em mídia</p>

                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{formatCurrency(metrics.valorConversaoTotal)}</span>
                                  <span>−</span>
                                  <span>{formatCurrency(totalInvestment)}</span>
                                </div>

                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Info className="h-3 w-3" />
                                  <span>Não considera custos operacionais</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p>Receita de vendas menos investimento total em mídia. Não considera custos operacionais.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Card 3 — Status Decisional */}
                    <Card className={cn("border-2 relative", decisionalStatus.bgColor)}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold text-foreground">Status Decisional</span>
                          </div>

                          <p className={cn("text-2xl font-bold", decisionalStatus.color)}>{decisionalStatus.label}</p>

                          <p className="text-xs text-muted-foreground">{decisionalStatus.description}</p>

                          <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
                            <div className="flex justify-between">
                              <span>ROAS atual:</span>
                              <span className="font-medium">{formatRoas(correctedRoas)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Meta mínima:</span>
                              <span className="font-medium">{formatRoas(roasMinimo)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>

                  {/* ===== BLOCO 2: DIAGNÓSTICO RÁPIDO (2x4 grid) — FASE 3 ===== */}
                  <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Row 1: Efficiency diagnostics */}
                    <StatusMetricCard
                      title="CTR"
                      value={formatPercent(metrics.ctrMedio)}
                      icon={<MousePointerClick className="h-3 w-3" />}
                      status="neutral"
                      size="compact"
                      tooltipKey="ctr"
                    />
                    <StatusMetricCard
                      title="CPC"
                      value={formatCurrency(metrics.cpcMedio)}
                      icon={<Coins className="h-3 w-3" />}
                      trend={trends?.cpcTrend}
                      invertTrend
                      status="neutral"
                      size="compact"
                      tooltipKey="cpc"
                    />
                    <StatusMetricCard
                      title="CPA"
                      value={formatCurrency(metrics.custoPorCompra)}
                      icon={<Target className="h-3 w-3" />}
                      trend={trends?.cpaTrend}
                      invertTrend
                      status="neutral"
                      size="compact"
                      tooltipKey="cpa"
                    />
                    <StatusMetricCard
                      title="Taxa de Conversão"
                      value={formatPercent(metrics.taxaConversaoCarrinho)}
                      icon={<Percent className="h-3 w-3" />}
                      status="neutral"
                      size="compact"
                      tooltipKey="taxa_conversao_carrinho"
                    />

                    {/* Row 2: Scale context */}
                    <StatusMetricCard
                      title="Investimento (total)"
                      value={formatCurrency(totalInvestment)}
                      icon={<DollarSign className="h-3 w-3" />}
                      trend={trends?.investmentTrend}
                      status="neutral"
                      size="compact"
                      tooltipKey="investimento_ads"
                    />
                    <StatusMetricCard
                      title="Receita atribuída"
                      value={formatCurrency(metrics.valorConversaoTotal)}
                      icon={<Coins className="h-3 w-3" />}
                      trend={trends?.revenueTrend}
                      status={getStatusFromBenchmark(
                        metrics.valorConversaoTotal,
                        totalInvestment * revenueBenchmarkMultiplier,
                        { warningThreshold: 0.67, dangerThreshold: 0.5 },
                      )}
                      size="compact"
                      tooltipKey="receita_ads"
                    />
                    <StatusMetricCard
                      title="Conversões"
                      value={formatNumber(metrics.comprasTotal)}
                      icon={<ShoppingCart className="h-3 w-3" />}
                      trend={trends?.conversionsTrend}
                      status="neutral"
                      size="compact"
                      tooltipKey="conversoes_total"
                    />
                    <StatusMetricCard
                      title="CPM"
                      value={formatCurrency(metrics.cpmMedio)}
                      icon={<Eye className="h-3 w-3" />}
                      status="neutral"
                      size="compact"
                      tooltipKey="cpm"
                    />
                  </section>

                  {/* ===== ROW 3: Compact Funnel + Reach Stats (moved from ROW 2) ===== */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Compact Conversion Funnel */}
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <ShoppingCart className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">Funil de Conversão</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <KPITooltip metricKey="taxa_add_cart">
                            <div className="text-center flex-1 cursor-help">
                              <p className="text-xs text-muted-foreground">Add Cart</p>
                              <p className="text-lg font-bold">{formatPercent(metrics.taxaAddCarrinho)}</p>
                            </div>
                          </KPITooltip>
                          <span className="text-muted-foreground">→</span>
                          <KPITooltip metricKey="taxa_conversao_carrinho">
                            <div className="text-center flex-1 cursor-help">
                              <p className="text-xs text-muted-foreground">Conv. Cart</p>
                              <p className="text-lg font-bold text-green-600">
                                {formatPercent(metrics.taxaConversaoCarrinho)}
                              </p>
                            </div>
                          </KPITooltip>
                          <span className="text-muted-foreground">→</span>
                          <KPITooltip metricKey="taxa_abandono_carrinho">
                            <div className="text-center flex-1 cursor-help">
                              <p className="text-xs text-muted-foreground">Abandono</p>
                              <p className="text-lg font-bold text-yellow-600">
                                {formatPercent(metrics.taxaAbandonoCarrinho)}
                              </p>
                            </div>
                          </KPITooltip>
                          <span className="text-muted-foreground">→</span>
                          <KPITooltip metricKey="conversoes_total">
                            <div className="text-center flex-1 cursor-help">
                              <p className="text-xs text-muted-foreground">Compras</p>
                              <p className="text-lg font-bold text-primary">{formatNumber(metrics.comprasTotal)}</p>
                            </div>
                          </KPITooltip>
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
                          <KPITooltip metricKey="alcance_total">
                            <div className="text-center cursor-help">
                              <p className="text-xs text-muted-foreground">Alcance</p>
                              <p className="text-lg font-bold">{formatNumber(metrics.alcanceTotal)}</p>
                            </div>
                          </KPITooltip>
                          <KPITooltip metricKey="impressoes_total">
                            <div className="text-center cursor-help">
                              <p className="text-xs text-muted-foreground">Impressões</p>
                              <p className="text-lg font-bold">{formatNumber(metrics.impressoesTotal)}</p>
                            </div>
                          </KPITooltip>
                          <KPITooltip metricKey="lpv">
                            <div className="text-center cursor-help">
                              <p className="text-xs text-muted-foreground">LPV</p>
                              <p className="text-lg font-bold">{formatNumber(metrics.visualizacoesPaginaTotal)}</p>
                            </div>
                          </KPITooltip>
                          <KPITooltip metricKey="frequencia">
                            <div className="text-center cursor-help">
                              <p className="text-xs text-muted-foreground">Frequência</p>
                              <p className="text-lg font-bold">{metrics.frequenciaMedia.toFixed(2)}</p>
                            </div>
                          </KPITooltip>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* ===== ROW 4: Métricas Adicionais (Ticket Médio only, ROI moved to BLOCO 1) ===== */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <StatusMetricCard
                      title="Ticket Médio Ads"
                      value={formatCurrency(metrics.ticketMedio)}
                      icon={<Coins className="h-3 w-3" />}
                      status="neutral"
                      size="compact"
                      tooltipKey="ticket_medio_ads"
                    />
                    <StatusMetricCard
                      title="Frequência Média"
                      value={metrics.frequenciaMedia.toFixed(2)}
                      icon={<Eye className="h-3 w-3" />}
                      status="neutral"
                      size="compact"
                      tooltipKey="frequencia"
                    />
                  </div>
                </>
              ) : (
                // ===== ENGAGEMENT VIEW =====
                <>
                  {/* ===== ROW 1: Engagement Card (40%) + Satellite Cards (60%) ===== */}
                  <div className="grid gap-4 lg:grid-cols-5">
                    {/* Main Engagement Card - Compact */}
                    <KPITooltip metricKey="taxa_engajamento">
                      <Card className={cn("lg:col-span-2 border-2 relative", engagementStatusInfo.bgColor)}>
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
                                  <span
                                    className={cn(
                                      "flex items-center gap-0.5",
                                      trends.engagementRateTrend >= 0 ? "text-green-600" : "text-red-600",
                                    )}
                                  >
                                    {trends.engagementRateTrend >= 0 ? (
                                      <TrendingUp className="h-3 w-3" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3" />
                                    )}
                                    {trends.engagementRateTrend >= 0 ? "+" : ""}
                                    {trends.engagementRateTrend.toFixed(0)}%
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
                    </KPITooltip>

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
                        tooltipKey="investimento_ads"
                      />

                      {/* Results */}
                      <StatusMetricCard
                        title="Resultados"
                        value={formatNumber(metrics.resultadosTotal)}
                        icon={<Zap className="h-3 w-3" />}
                        trend={trends?.resultsTrend}
                        status={getStatusFromBenchmark(metrics.resultadosTotal, 100, {
                          warningThreshold: 0.5,
                          dangerThreshold: 0.25,
                        })}
                        size="compact"
                        tooltipKey="resultados_engagement"
                      />

                      {/* CPE (Cost per Result) */}
                      <StatusMetricCard
                        title="Custo/Resultado"
                        value={formatCurrency(metrics.custoPorResultadoMedio)}
                        icon={<Target className="h-3 w-3" />}
                        trend={trends?.cpeTrend}
                        invertTrend
                        status={getStatusFromBenchmark(1.0, metrics.custoPorResultadoMedio, {
                          invertComparison: true,
                          warningThreshold: 0.8,
                          dangerThreshold: 0.5,
                        })}
                        size="compact"
                        tooltipKey="cpe"
                      />

                      {/* Reach */}
                      <StatusMetricCard
                        title="Alcance"
                        value={formatNumber(metrics.alcanceTotal)}
                        icon={<Users className="h-3 w-3" />}
                        status="neutral"
                        size="compact"
                        tooltipKey="alcance_total"
                      />

                      {/* Impressions */}
                      <StatusMetricCard
                        title="Impressões"
                        value={formatNumber(metrics.impressoesTotal)}
                        icon={<Eye className="h-3 w-3" />}
                        status="neutral"
                        size="compact"
                        tooltipKey="impressoes_total"
                      />

                      {/* Clicks */}
                      <StatusMetricCard
                        title="Cliques"
                        value={formatNumber(metrics.cliquesTotal)}
                        icon={<MousePointerClick className="h-3 w-3" />}
                        status="neutral"
                        size="compact"
                        tooltipKey="cliques_total"
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
                          <KPITooltip metricKey="resultados_engagement">
                            <div className="text-center cursor-help">
                              <p className="text-xs text-muted-foreground">Engajamentos</p>
                              <p className="text-lg font-bold">{formatNumber(metrics.engajamentosTotal)}</p>
                            </div>
                          </KPITooltip>
                          <KPITooltip metricKey="visitas_perfil">
                            <div className="text-center cursor-help">
                              <p className="text-xs text-muted-foreground">Visitas Perfil</p>
                              <p className="text-lg font-bold">{formatNumber(metrics.visitasPerfilTotal)}</p>
                            </div>
                          </KPITooltip>
                          <KPITooltip metricKey="alcance_total">
                            <div className="text-center cursor-help">
                              <p className="text-xs text-muted-foreground">Visualizações</p>
                              <p className="text-lg font-bold">{formatNumber(metrics.visualizacoesTotal)}</p>
                            </div>
                          </KPITooltip>
                          <KPITooltip metricKey="ctr">
                            <div className="text-center cursor-help">
                              <p className="text-xs text-muted-foreground">CTR</p>
                              <p className="text-lg font-bold">{formatPercent(metrics.ctrMedio)}</p>
                            </div>
                          </KPITooltip>
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
                          <KPITooltip metricKey="cpm">
                            <div className="text-center cursor-help">
                              <p className="text-xs text-muted-foreground">CPM</p>
                              <p className="text-lg font-bold">{formatCurrency(metrics.cpmMedio)}</p>
                            </div>
                          </KPITooltip>
                          <KPITooltip metricKey="cpc">
                            <div className="text-center cursor-help">
                              <p className="text-xs text-muted-foreground">CPC</p>
                              <p className="text-lg font-bold">{formatCurrency(metrics.cpcMedio)}</p>
                            </div>
                          </KPITooltip>
                          <KPITooltip metricKey="cpe">
                            <div className="text-center cursor-help">
                              <p className="text-xs text-muted-foreground">CPE</p>
                              <p className="text-lg font-bold text-primary">
                                {formatCurrency(metrics.custoPorResultadoMedio)}
                              </p>
                            </div>
                          </KPITooltip>
                          <KPITooltip metricKey="frequencia">
                            <div className="text-center cursor-help">
                              <p className="text-xs text-muted-foreground">Frequência</p>
                              <p className="text-lg font-bold">{metrics.frequenciaMedia.toFixed(2)}</p>
                            </div>
                          </KPITooltip>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* ===== ROW 5: Inline Financial Summary (both views) — FASE 1 fix ===== */}
              <Card className="bg-muted/30">
                <CardContent className="py-3 px-4">
                  <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Investido (total mídia):</span>
                      <span className="font-semibold">{formatCurrency(totalInvestment)}</span>
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
                        <div
                          className={cn(
                            "flex items-center gap-2 font-semibold",
                            grossMediaResult >= 0 ? "text-green-600" : "text-red-600",
                          )}
                        >
                          {grossMediaResult >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span>
                            {grossMediaResult >= 0 ? "+" : ""}
                            {formatCurrency(grossMediaResult)}
                          </span>
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

              {/* ===== ROW 6: Breakdown by Ad (uses activeAdsData for objective-filtered view) ===== */}
              <AdsBreakdown
                ads={activeAdsData}
                selectedMonth={
                  dateRange
                    ? `${dateRange.start.getFullYear()}-${String(dateRange.start.getMonth() + 1).padStart(2, "0")}`
                    : ""
                }
                objective={effectiveObjective}
              />

              {/* ===== ROW 7: Classification Chart ===== */}
              <AdClassificationChart adsData={activeAdsData} objective={effectiveObjective} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Ads;
