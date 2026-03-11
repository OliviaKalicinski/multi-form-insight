import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Target,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Zap,
  Package,
  Receipt,
  Clock,
  Weight,
} from "lucide-react";
import { StatusMetricCard, getStatusFromBenchmark } from "@/components/dashboard/StatusMetricCard";
import { IncompleteMonthBadge } from "@/components/dashboard/IncompleteMonthBadge";
import {
  calculateExecutiveMetrics,
  filterOrdersByMonth as filterExecOrders,
  filterAdsByMonth,
} from "@/utils/executiveMetricsCalculator";
import { filterOrdersByDateRange } from "@/utils/salesCalculator";
import { gerarAlertas } from "@/utils/alertSystem";
import { gerarRecomendacoes } from "@/utils/recommendationEngine";
import { getPlatformPerformance } from "@/utils/financialMetrics";
import {
  segmentOrders,
  calculateRevenueMix,
  getRevenueOrders,
  getOfficialRevenue,
  SEGMENT_LABELS,
  SEGMENT_COLORS,
  SEGMENT_ORDER,
  SegmentFilter,
} from "@/utils/revenue";
import { SegmentBreakdownBars } from "@/components/dashboard/SegmentBreakdownBars";

import { detectIncompleteMonth, getEqualIntervalComparison } from "@/utils/incompleteMonthDetector";
import { format, subMonths, parse } from "date-fns";
import { ProcessedOrder } from "@/types/marketing";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatPercent = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { salesData, adsData, dateRange, selectedSegment } = useDashboard();
  const selectedMonth = dateRange
    ? `${dateRange.start.getFullYear()}-${String(dateRange.start.getMonth() + 1).padStart(2, "0")}`
    : undefined;
  const isConsolidated = selectedSegment === "all";

  // Get goals from database
  const { financialGoals, sectorBenchmarks } = useAppSettings();

  // ROAS thresholds from sectorBenchmarks
  const roasExcelente = sectorBenchmarks.roasExcelente || 4.0;
  const roasGoal = sectorBenchmarks.roasMedio || 3.0;

  // Company-level: uses all segments (no brand filter)
  const processedOrders = useMemo(() => {
    if (!salesData || salesData.length === 0) return [];
    return salesData as ProcessedOrder[];
  }, [salesData]);

  // Extrair meses disponíveis dos dados de vendas
  const availableSalesMonths = useMemo(() => {
    const months = new Set<string>();
    processedOrders.forEach((o) => months.add(format(o.dataVenda, "yyyy-MM")));
    return Array.from(months).sort();
  }, [processedOrders]);

  // Detectar mês incompleto e calcular intervalos de comparação
  const { monthInfo, comparison } = useMemo(() => {
    if (!selectedMonth) {
      return { monthInfo: null, comparison: null };
    }
    const monthInfo = detectIncompleteMonth(selectedMonth);
    const comparison = getEqualIntervalComparison(selectedMonth);
    return { monthInfo, comparison };
  }, [selectedMonth]);

  // Get current and previous month data - suporta "Todos" (selectedMonth = null)
  const { currentMetrics, previousMetrics, platformData, topProducts, segmentBreakdown } = useMemo(() => {
    if (processedOrders.length === 0) {
      return { currentMetrics: null, previousMetrics: null, platformData: [], topProducts: [], segmentBreakdown: null };
    }

    // Se não há mês selecionado, usar todos os pedidos
    const isAllMonths = !selectedMonth;
    const monthOrders = isAllMonths ? processedOrders : filterExecOrders(processedOrders, selectedMonth);

    const monthAds = isAllMonths ? adsData : filterAdsByMonth(adsData, selectedMonth);

    // Apply segment filter
    const segments = segmentOrders(monthOrders);
    const filteredOrders = selectedSegment === "all" ? monthOrders : segments[selectedSegment];

    // Segment breakdown for consolidated badges
    const segmentBreakdown = SEGMENT_ORDER.reduce(
      (acc, key) => {
        const revOrders = getRevenueOrders(segments[key] || []);
        const revenue = revOrders.reduce((s, o) => s + getOfficialRevenue(o), 0);
        acc[key] = {
          pedidos: revOrders.length,
          ticketMedio: revOrders.length > 0 ? revenue / revOrders.length : 0,
        };
        return acc;
      },
      {} as Record<Exclude<SegmentFilter, "all">, { pedidos: number; ticketMedio: number }>,
    );

    // Para "Todos", calcular métricas agregadas
    const currentMetrics = calculateExecutiveMetrics(
      monthOrders,
      monthAds,
      isAllMonths ? "all" : selectedMonth,
      selectedSegment,
    );

    // Previous period (apenas quando há mês específico selecionado)
    let previousMetrics = null;
    if (!isAllMonths && selectedMonth) {
      const currentDate = parse(selectedMonth, "yyyy-MM", new Date());
      const prevDate = subMonths(currentDate, 1);
      const prevMonth = format(prevDate, "yyyy-MM");

      // Se mês incompleto, usar intervalo igual
      let prevMonthOrders;
      if (comparison?.isIncomplete) {
        prevMonthOrders = filterOrdersByDateRange(
          processedOrders,
          comparison.comparisonPeriod.start,
          comparison.comparisonPeriod.end,
        );
      } else {
        prevMonthOrders = filterExecOrders(processedOrders, prevMonth);
      }

      const prevMonthAds = filterAdsByMonth(adsData, prevMonth);

      previousMetrics = calculateExecutiveMetrics(prevMonthOrders, prevMonthAds, prevMonth, selectedSegment);
    }

    // Platform performance e Top products (usar pedidos filtrados por segmento)
    const platformData = getPlatformPerformance(filteredOrders).slice(0, 5);

    // Top products
    const productMap = new Map<string, { quantidade: number; receita: number }>();
    filteredOrders.forEach((order) => {
      order.produtos.forEach((produto) => {
        if (produto.descricaoAjustada === "Kit de Amostras") return;
        const existing = productMap.get(produto.descricaoAjustada);
        if (existing) {
          existing.quantidade += produto.quantidade;
          existing.receita += produto.preco;
        } else {
          productMap.set(produto.descricaoAjustada, {
            quantidade: produto.quantidade,
            receita: produto.preco,
          });
        }
      });
    });

    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);

    return { currentMetrics, previousMetrics, platformData, topProducts, segmentBreakdown };
  }, [processedOrders, adsData, selectedMonth, comparison, selectedSegment]);

  // Revenue mix (always from full monthOrders, not filtered)
  const revenueMix = useMemo(() => {
    if (processedOrders.length === 0) return null;
    const isAllMonths = !selectedMonth;
    const monthOrders = isAllMonths ? processedOrders : filterExecOrders(processedOrders, selectedMonth);
    return calculateRevenueMix(monthOrders);
  }, [processedOrders, selectedMonth]);

  // Calculate variations - null quando não há mês anterior (período "Todos")
  const variations = useMemo(() => {
    if (!currentMetrics || !previousMetrics) return null;

    const calc = (current: number, previous: number) => (previous > 0 ? ((current - previous) / previous) * 100 : null);

    return {
      receita: calc(currentMetrics.vendas.receita, previousMetrics.vendas.receita),
      pedidos: calc(currentMetrics.vendas.pedidos, previousMetrics.vendas.pedidos),
      ticket: calc(currentMetrics.vendas.ticketMedioReal, previousMetrics.vendas.ticketMedioReal),
      margem: null, // Margem fixa
      roas:
        currentMetrics.marketingApplicable !== false
          ? currentMetrics.marketing.roasAds - previousMetrics.marketing.roasAds
          : null,
      ltv: calc(currentMetrics.clientes.ltv, previousMetrics.clientes.ltv),
      cac:
        currentMetrics.marketingApplicable !== false
          ? calc(currentMetrics.clientes.cac, previousMetrics.clientes.cac)
          : null,
      ltvCac:
        currentMetrics.marketingApplicable !== false
          ? calc(
              currentMetrics.clientes.cac > 0 ? currentMetrics.clientes.ltv / currentMetrics.clientes.cac : 0,
              previousMetrics.clientes.cac > 0 ? previousMetrics.clientes.ltv / previousMetrics.clientes.cac : 0,
            )
          : null,
    };
  }, [currentMetrics, previousMetrics]);

  // Generate alerts and recommendations
  const { alerts, opportunities } = useMemo(() => {
    if (!currentMetrics || !previousMetrics) return { alerts: [], opportunities: [] };

    const alerts = gerarAlertas(currentMetrics, previousMetrics, sectorBenchmarks);
    const recommendations = gerarRecomendacoes(currentMetrics, previousMetrics, sectorBenchmarks);

    // Convert top recommendations to opportunities
    const opportunities = recommendations.slice(0, 3).map((rec) => ({
      id: rec.id,
      title: rec.title,
      description: rec.actions[0],
      impact: rec.impact,
      action: rec.actions[1] || null,
    }));

    return { alerts, opportunities };
  }, [currentMetrics, previousMetrics, sectorBenchmarks]);

  // Calculate goal progress - use financialGoals.receita from database
  const hasRevenueGoal = financialGoals.receita > 0;
  const revenueGoal = hasRevenueGoal ? financialGoals.receita : 0;

  const goalProgress = useMemo(() => {
    if (!currentMetrics || !hasRevenueGoal) return 0;
    return (currentMetrics.vendas.receita / revenueGoal) * 100;
  }, [currentMetrics, hasRevenueGoal, revenueGoal]);

  // LTV/CAC ratio
  const ltvCacRatio = useMemo(() => {
    if (!currentMetrics || currentMetrics.clientes.cac === 0) return 0;
    return currentMetrics.clientes.ltv / currentMetrics.clientes.cac;
  }, [currentMetrics]);

  // No data state
  if (processedOrders.length === 0 && adsData.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-16">
          <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Bem-vindo ao Dashboard Executivo</h2>
          <p className="text-muted-foreground mb-6">
            Faça upload dos dados de vendas e anúncios para visualizar as métricas executivas.
          </p>
          <Button onClick={() => navigate("/upload")}>Ir para Upload de Dados</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* ========== HEADER SIMPLIFICADO - SEM FILTRO LOCAL ========== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🐉 Dashboard Executivo</h1>
          <p className="text-muted-foreground">Visão consolidada do desempenho do negócio</p>
        </div>
        {monthInfo?.isIncomplete && <IncompleteMonthBadge monthInfo={monthInfo} comparison={comparison} />}
      </div>

      {/* Indicator for incomplete month comparison */}
      {monthInfo?.isIncomplete && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  🕐 {comparison?.label} - Comparação com intervalo igual
                </p>
                <p className="text-xs text-muted-foreground mt-1">{comparison?.tooltipText}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== LINHA 1 - KPI PRINCIPAL + SATÉLITES ========== */}
      {currentMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ===== CARD PRINCIPAL - RECEITA (50% da largura) ===== */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
            <CardContent className="pt-6 space-y-4">
              {/* Title */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {selectedMonth ? "Receita do Mês" : "Receita Total"}
                  {selectedSegment !== "all" && ` (${SEGMENT_LABELS[selectedSegment]})`}
                </span>
              </div>

              {/* Main Value */}
              <div>
                <div className="text-4xl font-bold text-primary">{formatCurrency(currentMetrics.vendas.receita)}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedMonth
                    ? "Receita bruta do período selecionado"
                    : `Receita acumulada de ${availableSalesMonths.length} meses`}
                </p>
              </div>

              {/* Revenue Mix badges (consolidated only) */}
              {selectedSegment === "all" && revenueMix && (
                <div className="flex flex-wrap gap-2">
                  {SEGMENT_ORDER.map(
                    (seg) =>
                      revenueMix[seg].value > 0 && (
                        <Badge
                          key={seg}
                          variant="outline"
                          className="text-xs font-medium"
                          style={{
                            borderColor: SEGMENT_COLORS[seg],
                            color: SEGMENT_COLORS[seg],
                          }}
                        >
                          {SEGMENT_LABELS[seg]}: {formatCurrency(revenueMix[seg].value)} (
                          {revenueMix[seg].percent.toFixed(0)}%)
                        </Badge>
                      ),
                  )}
                </div>
              )}

              {/* Progress Goal - hide when no goal set OR in "Todos" mode */}
              {selectedMonth && hasRevenueGoal && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Meta: {formatCurrency(revenueGoal)}</span>
                    <span
                      className={cn(
                        "font-semibold",
                        goalProgress >= 100
                          ? "text-emerald-600"
                          : goalProgress >= 80
                            ? "text-amber-600"
                            : "text-red-600",
                      )}
                    >
                      {goalProgress.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={Math.min(goalProgress, 100)} className="h-2" />
                </div>
              )}

              {/* Goal not defined message */}
              {selectedMonth && !hasRevenueGoal && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Defina sua meta mensal na página Metas
                </p>
              )}

              {/* Trend */}
              {variations && (
                <div className="flex items-center gap-2 pt-2">
                  {variations.receita >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={cn("font-semibold", variations.receita >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {formatPercent(variations.receita)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {monthInfo?.isIncomplete
                      ? `vs ${comparison?.label || "período igual"} do mês anterior`
                      : selectedMonth
                        ? "vs mês anterior"
                        : ""}
                  </span>
                </div>
              )}

              {/* Status Badge */}
              <Badge
                variant={selectedMonth && hasRevenueGoal && goalProgress >= 100 ? "default" : "secondary"}
                className="text-xs"
              >
                {!selectedMonth
                  ? "📊 Visão Consolidada"
                  : !hasRevenueGoal
                    ? "⚙️ Meta não definida"
                    : goalProgress >= 100
                      ? "🎯 Meta Atingida"
                      : goalProgress >= 80
                        ? "📊 Próximo da Meta"
                        : "⚡ Em Progresso"}
              </Badge>
            </CardContent>
          </Card>

          {/* ===== CARDS SATÉLITES (50% dividido em 2x3 grid) ===== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Pedidos */}
            {(() => {
              const pedidosData = segmentBreakdown
                ? SEGMENT_ORDER.reduce(
                    (acc, k) => {
                      acc[k] = segmentBreakdown[k].pedidos;
                      return acc;
                    },
                    {} as Record<Exclude<SegmentFilter, "all">, number>,
                  )
                : null;
              return (
                <StatusMetricCard
                  title="Pedidos"
                  value={isConsolidated ? "Por segmento" : currentMetrics.vendas.pedidos.toString()}
                  icon={<ShoppingCart className="h-4 w-4" />}
                  trend={isConsolidated ? undefined : variations?.pedidos}
                  status={
                    isConsolidated
                      ? undefined
                      : getStatusFromBenchmark(currentMetrics.vendas.pedidos, previousMetrics?.vendas.pedidos || 1)
                  }
                  tooltipKey="total_pedidos"
                >
                  {isConsolidated && pedidosData && <SegmentBreakdownBars data={pedidosData} />}
                </StatusMetricCard>
              );
            })()}

            {/* Ticket Médio Geral */}
            {(() => {
              const ticketMedioData = segmentBreakdown
                ? SEGMENT_ORDER.reduce(
                    (acc, k) => {
                      acc[k] = segmentBreakdown[k].ticketMedio;
                      return acc;
                    },
                    {} as Record<Exclude<SegmentFilter, "all">, number>,
                  )
                : null;
              return (
                <StatusMetricCard
                  title="Ticket Médio"
                  value={isConsolidated ? "Por segmento" : formatCurrency(currentMetrics.vendas.ticketMedio)}
                  icon={<Receipt className="h-4 w-4" />}
                  interpretation={isConsolidated ? undefined : "Todos os pedidos"}
                  tooltipKey="ticket_medio"
                >
                  {isConsolidated && ticketMedioData && (
                    <SegmentBreakdownBars data={ticketMedioData} formatValue={formatCurrency} />
                  )}
                </StatusMetricCard>
              );
            })()}

            {/* Ticket Médio Real */}
            {(() => {
              const ticketRealData = segmentBreakdown
                ? SEGMENT_ORDER.reduce(
                    (acc, k) => {
                      acc[k] = segmentBreakdown[k].ticketMedio;
                      return acc;
                    },
                    {} as Record<Exclude<SegmentFilter, "all">, number>,
                  )
                : null;
              return (
                <StatusMetricCard
                  title="Ticket Real"
                  value={isConsolidated ? "Por segmento" : formatCurrency(currentMetrics.vendas.ticketMedioReal)}
                  icon={<TrendingUp className="h-4 w-4" />}
                  trend={isConsolidated ? undefined : variations?.ticket}
                  status={
                    isConsolidated
                      ? undefined
                      : getStatusFromBenchmark(
                          currentMetrics.vendas.ticketMedioReal,
                          previousMetrics?.vendas.ticketMedioReal || 1,
                        )
                  }
                  interpretation={isConsolidated ? undefined : "Sem amostras"}
                  tooltipKey="ticket_medio_real"
                >
                  {isConsolidated && ticketRealData && (
                    <SegmentBreakdownBars data={ticketRealData} formatValue={formatCurrency} />
                  )}
                </StatusMetricCard>
              );
            })()}

            {/* Marketing cards - only show when not consolidated and applicable */}
            {!isConsolidated && currentMetrics.marketingApplicable !== false && (
              <>
                {/* 1. ROAS Bruto (Receita B2C / Investimento) */}
                <StatusMetricCard
                  title="ROAS Bruto"
                  value={`${currentMetrics.marketing.roasBruto.toFixed(2)}x`}
                  icon={<DollarSign className="h-4 w-4" />}
                  status={
                    currentMetrics.marketing.roasBruto >= roasExcelente
                      ? "success"
                      : currentMetrics.marketing.roasBruto >= roasGoal
                        ? "warning"
                        : "danger"
                  }
                  benchmark={{ value: roasGoal, label: `Meta: ${roasGoal.toFixed(1)}x` }}
                  interpretation="Receita Total ÷ Ads"
                  tooltipKey="roas_bruto"
                />

                {/* 2. ROAS Real (Receita B2C ex-frete / Investimento) */}
                <StatusMetricCard
                  title="ROAS Real"
                  value={`${currentMetrics.marketing.roasReal.toFixed(2)}x`}
                  icon={<DollarSign className="h-4 w-4" />}
                  status={
                    currentMetrics.marketing.roasReal >= roasExcelente
                      ? "success"
                      : currentMetrics.marketing.roasReal >= roasGoal
                        ? "warning"
                        : "danger"
                  }
                  benchmark={{ value: roasGoal, label: `Meta: ${roasGoal.toFixed(1)}x` }}
                  interpretation="Receita ex-frete ÷ Ads"
                  tooltipKey="roas_real"
                />

                {/* 3. ROAS Meta (Valor Meta / Investimento - já ex-frete) */}
                <StatusMetricCard
                  title="ROAS Meta"
                  value={`${currentMetrics.marketing.roasMeta.toFixed(2)}x`}
                  icon={<Target className="h-4 w-4" />}
                  status={
                    currentMetrics.marketing.roasMeta >= roasExcelente
                      ? "success"
                      : currentMetrics.marketing.roasMeta >= roasGoal
                        ? "warning"
                        : "danger"
                  }
                  benchmark={{ value: roasGoal, label: `Meta: ${roasGoal.toFixed(1)}x` }}
                  interpretation="Valor Meta ÷ Ads (ex-frete)"
                  tooltipKey="roas_meta"
                />

                {/* CAC */}
                <StatusMetricCard
                  title="CAC"
                  value={formatCurrency(currentMetrics.clientes.cac)}
                  icon={<Users className="h-4 w-4" />}
                  trend={variations?.cac}
                  invertTrend={true}
                  status={getStatusFromBenchmark(currentMetrics.clientes.cac, 50, { invertComparison: true })}
                  interpretation="Custo por Aquisição"
                  tooltipKey="cac"
                />

                {/* LTV */}
                <StatusMetricCard
                  title="LTV"
                  value={formatCurrency(currentMetrics.clientes.ltv)}
                  icon={<TrendingUp className="h-4 w-4" />}
                  trend={variations?.ltv}
                  status={getStatusFromBenchmark(currentMetrics.clientes.ltv, 200)}
                  interpretation="Valor do Cliente"
                  tooltipKey="ltv"
                />

                {/* LTV/CAC Ratio */}
                <StatusMetricCard
                  title="LTV/CAC"
                  value={`${ltvCacRatio.toFixed(2)}x`}
                  icon={<Zap className="h-4 w-4" />}
                  trend={variations?.ltvCac}
                  status={ltvCacRatio >= 4 ? "success" : ltvCacRatio >= 3 ? "warning" : "danger"}
                  benchmark={{ value: 3.0, label: "Mínimo: 3.0x" }}
                  interpretation="Relação LTV/CAC"
                  tooltipKey="ltv_cac"
                />
              </>
            )}

            {/* Volume KG - only show when not consolidated */}
            {!isConsolidated && (selectedSegment === "b2b" || (currentMetrics.vendas.volumeKg || 0) > 0) && (
              <StatusMetricCard
                title="Volume"
                value={`${((currentMetrics.vendas.volumeKg || 0) / 1000).toFixed(1)} ton`}
                icon={<Weight className="h-4 w-4" />}
                interpretation="Peso líquido total"
              />
            )}
          </div>
        </div>
      )}

      {!isConsolidated && (
        <>
          <Separator />

          {/* ========== LINHA 2 - CONTEXTO (Performance por Canal + Top Produtos) ========== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Performance por Canal */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Performance por Canal
                </CardTitle>
              </CardHeader>
              <CardContent>
                {platformData.length > 0 ? (
                  <div className="space-y-4">
                    {platformData.map((platform) => (
                      <div key={platform.platform} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate">{platform.platform}</span>
                          <span className="font-semibold">{formatCurrency(platform.revenue)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={platform.marketShare} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {platform.marketShare.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => navigate("/performance-financeira")}
                    >
                      Ver análise completa
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nenhum dado de canal disponível para o período selecionado.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Top 5 Produtos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Top 5 Produtos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div key={product.name} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                              index === 0
                                ? "bg-amber-100 text-amber-700"
                                : index === 1
                                  ? "bg-slate-100 text-slate-600"
                                  : index === 2
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-muted text-muted-foreground",
                            )}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[150px]">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.quantidade} unidades</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(product.receita)}</p>
                        </div>
                      </div>
                    ))}

                    <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => navigate("/produtos")}>
                      Ver todos os produtos
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum produto encontrado para o período selecionado.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* ========== LINHA 3 - ALERTAS E OPORTUNIDADES ========== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Alertas Críticos */}
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Alertas Críticos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alerts && alerts.length > 0 ? (
                  <div className="space-y-3">
                    {alerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className="p-3 bg-white rounded-lg border border-red-100">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">
                            {alert.severity === "critical" ? "🔴" : alert.severity === "warning" ? "🟡" : "ℹ️"}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{alert.title}</p>
                            {alert.action && <p className="text-xs text-muted-foreground mt-1">💡 {alert.action}</p>}
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate("/analise-critica")}>
                      Ver análise completa
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 py-4">
                    <span className="text-lg">✅</span>
                    <span className="text-sm">Nenhum alerta crítico no momento.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Oportunidades */}
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-emerald-600" />
                  Oportunidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                {opportunities && opportunities.length > 0 ? (
                  <div className="space-y-3">
                    {opportunities.slice(0, 3).map((opportunity) => (
                      <div key={opportunity.id} className="p-3 bg-white rounded-lg border border-emerald-100">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">✅</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{opportunity.title}</p>
                            {opportunity.action && (
                              <p className="text-xs text-muted-foreground mt-1">🎯 {opportunity.action}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate("/analise-critica")}>
                      Ver todas as oportunidades
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm py-4">
                    Nenhuma oportunidade identificada no momento.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* ========== LINHA 4 - QUICK LINKS ========== */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Navegação Rápida</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={() => navigate("/performance-financeira")}
                >
                  <DollarSign className="h-5 w-5" />
                  <span className="text-xs font-medium">Performance</span>
                  <span className="text-[10px] text-muted-foreground">Financeira</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={() => navigate("/comportamento-cliente")}
                >
                  <Users className="h-5 w-5" />
                  <span className="text-xs font-medium">Clientes</span>
                  <span className="text-[10px] text-muted-foreground">Comportamento</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={() => navigate("/produtos")}
                >
                  <Package className="h-5 w-5" />
                  <span className="text-xs font-medium">Produtos</span>
                  <span className="text-[10px] text-muted-foreground">& Operações</span>
                </Button>

                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate("/ads")}>
                  <Target className="h-5 w-5" />
                  <span className="text-xs font-medium">Marketing</span>
                  <span className="text-[10px] text-muted-foreground">Ads & Social</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
