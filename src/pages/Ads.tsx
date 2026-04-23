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
import { AdPerformanceRanking } from "@/components/dashboard/AdPerformanceRanking";
import { AdsTrendChart } from "@/components/dashboard/AdsTrendChart";
import { MetaTokenAlert } from "@/components/dashboard/MetaTokenAlert";
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
      color: "text-emerald-600",
      dot: "bg-emerald-500",
      description: "Performance dentro da meta. Candidato a escala controlada.",
    };
  if (roas >= thresholds.medio)
    return {
      label: "Saudável",
      color: "text-blue-600",
      dot: "bg-blue-500",
      description: "Retorno dentro da meta. Manter e otimizar.",
    };
  if (roas >= thresholds.minimo)
    return {
      label: "Em observação",
      color: "text-amber-600",
      dot: "bg-amber-500",
      description: "Abaixo da meta. Revisar segmentação e criativos.",
    };
  return {
    label: "Abaixo da meta",
    color: "text-red-500",
    dot: "bg-red-500",
    description: "ROAS abaixo do mínimo. Revisar campanhas antes de aumentar investimento.",
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
    isLoadingData,
  } = useDashboard();

  // Get goals from database
  const { sectorBenchmarks } = useAppSettings();

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncMetaAds = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-meta-ads", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Sincronização concluída",
        description: `${data.synced} registros sincronizados (${data.period?.since} → ${data.period?.until})`,
      });
      // Reload to pick up new data
      window.location.reload();
    } catch (err: any) {
      // Se o erro menciona token, provavelmente expirou
      const msg = err.message || "";
      const tokenError = msg.toLowerCase().includes("token") || msg.includes("190") || msg.includes("401");
      toast({
        title: tokenError ? "Token Meta expirado" : "Erro na sincronização",
        description: tokenError
          ? "O token de acesso expirou. Renove em developers.facebook.com/tools/explorer"
          : msg || "Falha ao sincronizar com Meta Ads",
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

  // ===== R08: classificação binária VENDAS/OUTROS =====
  const detectedObjective = useMemo(() => {
    return determinePrimaryObjective(currentMonthAdsData);
  }, [currentMonthAdsData]);

  const effectiveObjective = useMemo(() => {
    if (manualObjective === "auto") return detectedObjective;
    if (hasObjective(currentMonthAdsData, manualObjective)) return manualObjective;
    return detectedObjective;
  }, [manualObjective, detectedObjective, currentMonthAdsData]);

  // Available objectives for toggle (R08: só VENDAS e OUTROS).
  const availableObjectives = useMemo(
    () => ({
      vendas: hasObjective(currentMonthAdsData, "VENDAS"),
      outros: hasObjective(currentMonthAdsData, "OUTROS"),
    }),
    [currentMonthAdsData],
  );

  // ===== ACTIVE ADS DATA: filtrado por VENDAS/OUTROS =====
  const activeAdsData = useMemo(() => {
    if (effectiveObjective === "VENDAS") {
      return filterAdsByObjective(currentMonthAdsData, "VENDAS");
    }
    if (effectiveObjective === "OUTROS") {
      return filterAdsByObjective(currentMonthAdsData, "OUTROS");
    }
    return currentMonthAdsData;
  }, [currentMonthAdsData, effectiveObjective]);

  // ===== Sumário da classificação binária =====
  const objectivesSummary = useMemo(() => {
    const vendasCount = currentMonthAdsData.filter((ad) => getAdObjective(ad) === "VENDAS").length;
    const outrosCount = currentMonthAdsData.filter((ad) => getAdObjective(ad) === "OUTROS").length;
    const unknownCount = currentMonthAdsData.filter((ad) => getAdObjective(ad) === "UNKNOWN").length;

    return {
      hasVendas: vendasCount > 0,
      hasOutros: outrosCount > 0,
      vendasCount,
      outrosCount,
      unknownCount,
      total: currentMonthAdsData.length,
      primaryObjective: effectiveObjective,
      isVendasView: effectiveObjective === "VENDAS",
      isOutrosView: effectiveObjective === "OUTROS",
    };
  }, [currentMonthAdsData, effectiveObjective]);

  // Calculate current metrics (ALWAYS from activeAdsData, never from generic summaries)
  const metrics = useMemo(() => {
    return calculateAdsMetrics(activeAdsData);
  }, [activeAdsData]);

  // Investimento total de TODOS os objetivos (para card "Investido (total)").
  const totalInvestment = useMemo(() => {
    return calculateAdsMetrics(currentMonthAdsData).investimentoTotal;
  }, [currentMonthAdsData]);

  // ===== Semantic aliases =====
  const objectiveInvestment = metrics.investimentoTotal;
  const revenueBenchmarkMultiplier = 3;
  const grossMediaResult = metrics.valorConversaoTotal - totalInvestment;

  // R08: ROAS único e honesto — receita Vendas ÷ investimento Vendas.
  // Removida a lógica R06-1 do roasTotal: mesmo somando todos os ads, a
  // receita total = receita Vendas (purchase_value não é atribuído a non-Sales
  // no banco). O card ROAS Total foi removido porque não reconciliava com Meta.
  const roasSales = objectiveInvestment > 0 ? metrics.valorConversaoTotal / objectiveInvestment : 0;

  // Alias para código legado que usa correctedRoas em trends/progress/status.
  const correctedRoas = roasSales;

  // Calculate trends vs comparison period
  const trends = useMemo(() => {
    if (!comparisonDateRange) return null;

    let previousData = filterAdsByDateRange(adsData, comparisonDateRange.start, comparisonDateRange.end);
    if (effectiveObjective === "VENDAS") {
      previousData = filterAdsByObjective(previousData, "VENDAS");
    } else if (effectiveObjective === "OUTROS") {
      previousData = filterAdsByObjective(previousData, "OUTROS");
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

  // Build objectives label for header (R08: binário Vendas/Outros).
  const objectivesLabel = useMemo(() => {
    const labels: string[] = [];
    if (objectivesSummary.hasVendas) labels.push(`Vendas (${objectivesSummary.vendasCount})`);
    if (objectivesSummary.hasOutros) labels.push(`Outros (${objectivesSummary.outrosCount})`);
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
          <Button variant="outline" size="sm" onClick={handleSyncMetaAds} disabled={isSyncing} className="gap-1.5">
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {isSyncing ? "Sincronizando..." : "Sincronizar Meta Ads"}
          </Button>
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
                {manualObjective === "auto" && detectedObjective !== "ALL" ? `(${detectedObjective})` : ""}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="VENDAS"
                disabled={!availableObjectives.vendas}
                className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md disabled:opacity-40"
              >
                Vendas
              </ToggleGroupItem>
              <ToggleGroupItem
                value="OUTROS"
                disabled={!availableObjectives.outros}
                className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md disabled:opacity-40"
              >
                Outros
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      </div>

      {/* Token expiry alert */}
      <MetaTokenAlert />

      {/* Empty state */}
      {isLoadingData ? null : adsData.length === 0 ? (
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

              {/* Métricas de Engajamento (R08: mostra quando há ads OUTROS) */}
              {objectivesSummary.hasOutros && (
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
              {/* ===== ADAPTIVE UI (R08: binário Vendas/Outros) ===== */}
              {objectivesSummary.isVendasView ? (
                // ===== VENDAS VIEW =====
                <>
                  {/* ===== BLOCO 1: DECISÃO — ROAS único + 4 satélites =====
                       R08: removido o card ROAS Total (dual card da R06-1).
                       Motivo: mesmo somando todos os ads do banco, a receita
                       total = receita Sales (não há receita purchase atribuída
                       a campanhas non-Sales no Meta). O card criava expectativa
                       de reconciliação que não acontece. Mantemos só ROAS Sales,
                       que É o número operacional verdadeiro.
                  */}
                  <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Card principal — ROAS Vendas (hero) */}
                    <KPITooltip metricKey="roas">
                      <Card className="lg:col-span-1 border relative">
                        <CardContent className="p-5">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-muted-foreground">ROAS Vendas</span>
                              <div className="flex items-center gap-1.5">
                                <span className={cn("w-2 h-2 rounded-full", decisionalStatus.dot)} />
                                <span className={cn("text-xs font-semibold", decisionalStatus.color)}>
                                  {decisionalStatus.label}
                                </span>
                              </div>
                            </div>

                            <div>
                              <p className={cn("text-5xl font-bold tracking-tight", roasStatusInfo.color)}>
                                {formatRoas(roasSales)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatCurrency(metrics.valorConversaoTotal)} receita ·{" "}
                                {formatCurrency(objectiveInvestment)} investido
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Só campanhas Vendas · performance operacional
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Meta: {roasGoal}x</span>
                                <span>{Math.round(roasProgress)}%</span>
                              </div>
                              <Progress value={roasProgress} className="h-1.5" />
                            </div>

                            {trends ? (
                              <div
                                className={cn(
                                  "flex items-center gap-1 text-xs font-medium",
                                  trends.roasTrend >= 0 ? "text-emerald-600" : "text-red-500",
                                )}
                              >
                                {trends.roasTrend >= 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {trends.roasTrend >= 0 ? "+" : ""}
                                {trends.roasTrend.toFixed(0)}% vs anterior
                                <span className="text-muted-foreground font-normal ml-1">
                                  · {decisionalStatus.description}
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">{decisionalStatus.description}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </KPITooltip>

                    {/* Satélites — 2x2 grid */}
                    <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                      {/* Investimento total (todos os objetivos) */}
                      <Card className="border">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Investido (total)</p>
                          <p className="text-2xl font-bold">{formatCurrency(totalInvestment)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Vendas + Outros
                          </p>
                          {trends && (
                            <p
                              className={cn(
                                "text-xs mt-1 flex items-center gap-0.5",
                                trends.investmentTrend >= 0 ? "text-emerald-600" : "text-red-500",
                              )}
                            >
                              {trends.investmentTrend >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {trends.investmentTrend >= 0 ? "+" : ""}
                              {trends.investmentTrend.toFixed(0)}% vs anterior
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Receita atribuída (só Vendas) */}
                      <Card className="border">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Receita atribuída</p>
                          <p className="text-2xl font-bold">{formatCurrency(metrics.valorConversaoTotal)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            só Vendas · via pixel Meta
                          </p>
                        </CardContent>
                      </Card>

                      {/* Resultado bruto */}
                      <Card className="border">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Resultado bruto</p>
                          <p
                            className={cn(
                              "text-2xl font-bold",
                              grossMediaResult >= 0 ? "text-foreground" : "text-red-500",
                            )}
                          >
                            {grossMediaResult >= 0 ? "+" : ""}
                            {formatCurrency(grossMediaResult)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            receita Vendas − investimento total
                          </p>
                        </CardContent>
                      </Card>

                      {/* Conversões */}
                      <Card className="border">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Conversões</p>
                          <p className="text-2xl font-bold">{formatNumber(metrics.comprasTotal)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            CPA: {formatCurrency(metrics.custoPorCompra)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </section>

                  {/* ===== BLOCO 2: TENDÊNCIA ===== */}
                  <AdsTrendChart ads={activeAdsData} />

                  {/* ===== BLOCO 3: DIAGNÓSTICO RÁPIDO (4 cards) ===== */}
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

              {/* ===== ROW 6: Performance Ranking (Top/Bottom performers) ===== */}
              <AdPerformanceRanking ads={activeAdsData} objective={effectiveObjective} />

              {/* ===== ROW 7: Breakdown by Ad (uses activeAdsData for objective-filtered view) ===== */}
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
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Ads;
