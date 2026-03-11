import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  CheckCircle2,
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

const VarBadge = ({ value, invert = false }: { value: number | null; invert?: boolean }) => {
  if (value === null) return null;
  const positive = invert ? value < 0 : value >= 0;
  return (
    <span className={cn("text-xs font-semibold", positive ? "text-emerald-600" : "text-red-500")}>
      {positive ? <TrendingUp className="inline h-3 w-3 mr-0.5" /> : <TrendingDown className="inline h-3 w-3 mr-0.5" />}
      {formatPercent(value)}
    </span>
  );
};

const ComparativoChart = ({
  current,
  previous,
  label,
}: {
  current: { receita: number; pedidos: number; ticket: number };
  previous: { receita: number; pedidos: number; ticket: number };
  label: string;
}) => {
  const pctReceita = previous.receita > 0 ? ((current.receita - previous.receita) / previous.receita) * 100 : null;
  const pctPedidos = previous.pedidos > 0 ? ((current.pedidos - previous.pedidos) / previous.pedidos) * 100 : null;
  const pctTicket = previous.ticket > 0 ? ((current.ticket - previous.ticket) / previous.ticket) * 100 : null;
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="space-y-3">
        {[
          { key: "Receita", curr: current.receita, prev: previous.receita, pct: pctReceita, fmt: formatCurrency },
          {
            key: "Pedidos",
            curr: current.pedidos,
            prev: previous.pedidos,
            pct: pctPedidos,
            fmt: (v: number) => v.toLocaleString("pt-BR"),
          },
          { key: "Ticket Médio", curr: current.ticket, prev: previous.ticket, pct: pctTicket, fmt: formatCurrency },
        ].map(({ key, curr, prev, pct, fmt }) => {
          const max = Math.max(curr, prev) || 1;
          const positive = pct === null || pct >= 0;
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">{key}</span>
                <VarBadge value={pct} />
              </div>
              <div className="space-y-1">
                {[
                  { label: "Atual", val: curr, isMain: true },
                  { label: "Anterior", val: prev, isMain: false },
                ].map(({ label: lbl, val, isMain }) => (
                  <div key={lbl} className="flex items-center gap-2">
                    <div className="w-16 text-[10px] text-muted-foreground shrink-0">{lbl}</div>
                    <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${(val / max) * 100}%`,
                          backgroundColor: isMain ? (positive ? "#2563eb" : "#ef4444") : "#94a3b8",
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs tabular-nums w-24 text-right",
                        isMain ? "font-semibold" : "text-muted-foreground",
                      )}
                    >
                      {fmt(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BusinessHealthScore = ({
  score,
  components,
}: {
  score: number;
  components: { label: string; ok: boolean; detail: string }[];
}) => {
  const color = score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  const label = score >= 75 ? "Saudável" : score >= 50 ? "Atenção" : "Crítico";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={`${(score / 100) * 201} 201`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold" style={{ color }}>
              {score}
            </span>
          </div>
        </div>
        <div>
          <p className="text-lg font-bold" style={{ color }}>
            {label}
          </p>
          <p className="text-xs text-muted-foreground">Score de saúde do negócio</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {components.map((c) => (
          <div key={c.label} className="flex items-center gap-2 text-xs">
            {c.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            )}
            <span className={c.ok ? "text-muted-foreground" : "text-foreground font-medium"}>{c.label}</span>
            <span className="text-muted-foreground ml-auto">{c.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { salesData, adsData, dateRange, selectedSegment } = useDashboard();
  const selectedMonth = dateRange
    ? `${dateRange.start.getFullYear()}-${String(dateRange.start.getMonth() + 1).padStart(2, "0")}`
    : undefined;
  const isConsolidated = selectedSegment === "all";
  const { financialGoals, sectorBenchmarks } = useAppSettings();
  const roasExcelente = sectorBenchmarks.roasExcelente || 4.0;
  const roasGoal = sectorBenchmarks.roasMedio || 3.0;

  const processedOrders = useMemo(() => (!salesData?.length ? [] : (salesData as ProcessedOrder[])), [salesData]);

  const availableSalesMonths = useMemo(() => {
    const months = new Set<string>();
    processedOrders.forEach((o) => months.add(format(o.dataVenda, "yyyy-MM")));
    return Array.from(months).sort();
  }, [processedOrders]);

  const { monthInfo, comparison } = useMemo(() => {
    if (!selectedMonth) return { monthInfo: null, comparison: null };
    return { monthInfo: detectIncompleteMonth(selectedMonth), comparison: getEqualIntervalComparison(selectedMonth) };
  }, [selectedMonth]);

  const { currentMetrics, previousMetrics, platformData, topProducts, segmentBreakdown } = useMemo(() => {
    if (!processedOrders.length)
      return { currentMetrics: null, previousMetrics: null, platformData: [], topProducts: [], segmentBreakdown: null };
    const isAllMonths = !selectedMonth;
    const monthOrders = isAllMonths ? processedOrders : filterExecOrders(processedOrders, selectedMonth);
    const monthAds = isAllMonths ? adsData : filterAdsByMonth(adsData, selectedMonth);
    const segments = segmentOrders(monthOrders);
    const filteredOrders = selectedSegment === "all" ? monthOrders : segments[selectedSegment];
    const segmentBreakdown = SEGMENT_ORDER.reduce(
      (acc, key) => {
        const revOrders = getRevenueOrders(segments[key] || []);
        const revenue = revOrders.reduce((s, o) => s + getOfficialRevenue(o), 0);
        acc[key] = { pedidos: revOrders.length, ticketMedio: revOrders.length > 0 ? revenue / revOrders.length : 0 };
        return acc;
      },
      {} as Record<Exclude<SegmentFilter, "all">, { pedidos: number; ticketMedio: number }>,
    );
    const currentMetrics = calculateExecutiveMetrics(
      monthOrders,
      monthAds,
      isAllMonths ? "all" : selectedMonth,
      selectedSegment,
    );
    let previousMetrics = null;
    if (!isAllMonths && selectedMonth) {
      const prevDate = subMonths(parse(selectedMonth, "yyyy-MM", new Date()), 1);
      const prevMonth = format(prevDate, "yyyy-MM");
      const prevMonthOrders = comparison?.isIncomplete
        ? filterOrdersByDateRange(processedOrders, comparison.comparisonPeriod.start, comparison.comparisonPeriod.end)
        : filterExecOrders(processedOrders, prevMonth);
      previousMetrics = calculateExecutiveMetrics(
        prevMonthOrders,
        filterAdsByMonth(adsData, prevMonth),
        prevMonth,
        selectedSegment,
      );
    }
    const platformData = getPlatformPerformance(filteredOrders).slice(0, 5);
    const productMap = new Map<string, { quantidade: number; receita: number }>();
    filteredOrders.forEach((order) => {
      order.produtos.forEach((produto) => {
        if (produto.descricaoAjustada === "Kit de Amostras") return;
        const ex = productMap.get(produto.descricaoAjustada);
        if (ex) {
          ex.quantidade += produto.quantidade;
          ex.receita += produto.preco;
        } else productMap.set(produto.descricaoAjustada, { quantidade: produto.quantidade, receita: produto.preco });
      });
    });
    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);
    return { currentMetrics, previousMetrics, platformData, topProducts, segmentBreakdown };
  }, [processedOrders, adsData, selectedMonth, comparison, selectedSegment]);

  const revenueMix = useMemo(() => {
    if (!processedOrders.length) return null;
    const monthOrders = !selectedMonth ? processedOrders : filterExecOrders(processedOrders, selectedMonth);
    return calculateRevenueMix(monthOrders);
  }, [processedOrders, selectedMonth]);

  const variations = useMemo(() => {
    if (!currentMetrics || !previousMetrics) return null;
    const calc = (c: number, p: number) => (p > 0 ? ((c - p) / p) * 100 : null);
    return {
      receita: calc(currentMetrics.vendas.receita, previousMetrics.vendas.receita),
      pedidos: calc(currentMetrics.vendas.pedidos, previousMetrics.vendas.pedidos),
      ticket: calc(currentMetrics.vendas.ticketMedioReal, previousMetrics.vendas.ticketMedioReal),
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

  const { alerts, opportunities } = useMemo(() => {
    if (!currentMetrics) return { alerts: [], opportunities: [] };
    let prevForAlerts = previousMetrics;
    if (!prevForAlerts && availableSalesMonths.length >= 2) {
      const lastMonth = availableSalesMonths[availableSalesMonths.length - 1];
      const secondLastMonth = availableSalesMonths[availableSalesMonths.length - 2];
      prevForAlerts = calculateExecutiveMetrics(
        filterExecOrders(processedOrders, secondLastMonth),
        filterAdsByMonth(adsData, secondLastMonth),
        secondLastMonth,
        selectedSegment,
      );
    }
    if (!prevForAlerts) return { alerts: [], opportunities: [] };
    const alerts = gerarAlertas(currentMetrics, prevForAlerts, sectorBenchmarks);
    const recommendations = gerarRecomendacoes(currentMetrics, prevForAlerts, sectorBenchmarks);
    const opportunities = recommendations.slice(0, 3).map((rec) => ({
      id: rec.id,
      title: rec.title,
      description: rec.actions[0],
      impact: rec.impact,
      action: rec.actions[1] || null,
    }));
    return { alerts, opportunities };
  }, [
    currentMetrics,
    previousMetrics,
    processedOrders,
    adsData,
    availableSalesMonths,
    selectedSegment,
    sectorBenchmarks,
  ]);

  const healthScore = useMemo(() => {
    if (!currentMetrics) return { score: 0, components: [] };
    const hasGoal = financialGoals.receita > 0;
    const goalPct = hasGoal ? (currentMetrics.vendas.receita / financialGoals.receita) * 100 : null;
    const ltvCac = currentMetrics.clientes.cac > 0 ? currentMetrics.clientes.ltv / currentMetrics.clientes.cac : 0;
    const roas = currentMetrics.marketing?.roasReal || 0;
    const varReceita = variations?.receita ?? 0;
    const components = [
      {
        label: "Receita vs Meta",
        ok: goalPct === null || goalPct >= 80,
        detail: goalPct !== null ? `${goalPct.toFixed(0)}%` : "Meta não definida",
      },
      { label: "Crescimento receita", ok: varReceita >= 0, detail: varReceita !== 0 ? formatPercent(varReceita) : "—" },
      { label: "LTV/CAC", ok: ltvCac >= 3, detail: ltvCac > 0 ? `${ltvCac.toFixed(1)}x` : "N/A" },
      { label: "ROAS", ok: roas >= roasGoal, detail: roas > 0 ? `${roas.toFixed(1)}x` : "N/A" },
      {
        label: "Alertas críticos",
        ok: alerts.filter((a) => a.severity === "critical").length === 0,
        detail: `${alerts.length} alertas`,
      },
    ];
    return { score: Math.round((components.filter((c) => c.ok).length / components.length) * 100), components };
  }, [currentMetrics, financialGoals, variations, alerts, roasGoal]);

  const hasRevenueGoal = financialGoals.receita > 0;
  const revenueGoal = hasRevenueGoal ? financialGoals.receita : 0;
  const goalProgress = useMemo(
    () => (!currentMetrics || !hasRevenueGoal ? 0 : (currentMetrics.vendas.receita / revenueGoal) * 100),
    [currentMetrics, hasRevenueGoal, revenueGoal],
  );
  const ltvCacRatio = useMemo(
    () =>
      !currentMetrics || !currentMetrics.clientes.cac ? 0 : currentMetrics.clientes.ltv / currentMetrics.clientes.cac,
    [currentMetrics],
  );

  if (!processedOrders.length && !adsData.length) {
    return (
      <div className="container mx-auto px-6 py-8 text-center py-16">
        <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Bem-vindo ao Dashboard Executivo</h2>
        <p className="text-muted-foreground mb-6">
          Faça upload dos dados de vendas e anúncios para visualizar as métricas executivas.
        </p>
        <Button onClick={() => navigate("/upload")}>Ir para Upload de Dados</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🐉 Dashboard Executivo</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Saúde estratégica do negócio{selectedSegment !== "all" && ` · ${SEGMENT_LABELS[selectedSegment]}`}
          </p>
        </div>
        {monthInfo?.isIncomplete && <IncompleteMonthBadge monthInfo={monthInfo} comparison={comparison} />}
      </div>

      {monthInfo?.isIncomplete && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">{comparison?.label} — Comparação com intervalo igual</p>
                <p className="text-xs text-muted-foreground mt-0.5">{comparison?.tooltipText}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RECEITA + SAÚDE */}
      {currentMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 h-full">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {selectedMonth ? "Receita do Mês" : "Receita Total"}
                    {selectedSegment !== "all" && ` (${SEGMENT_LABELS[selectedSegment]})`}
                  </span>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary">{formatCurrency(currentMetrics.vendas.receita)}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedMonth
                      ? "Receita bruta do período selecionado"
                      : `Receita acumulada de ${availableSalesMonths.length} meses`}
                  </p>
                </div>
                {selectedSegment === "all" && revenueMix && (
                  <div className="flex flex-wrap gap-2">
                    {SEGMENT_ORDER.map(
                      (seg) =>
                        revenueMix[seg].value > 0 && (
                          <Badge
                            key={seg}
                            variant="outline"
                            className="text-xs font-medium"
                            style={{ borderColor: SEGMENT_COLORS[seg], color: SEGMENT_COLORS[seg] }}
                          >
                            {SEGMENT_LABELS[seg]}: {formatCurrency(revenueMix[seg].value)} (
                            {revenueMix[seg].percent.toFixed(0)}%)
                          </Badge>
                        ),
                    )}
                  </div>
                )}
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
                {selectedMonth && !hasRevenueGoal && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" /> Defina sua meta mensal na página Metas
                  </p>
                )}
                {variations && (
                  <div className="flex items-center gap-2 pt-1">
                    <VarBadge value={variations.receita} />
                    <span className="text-sm text-muted-foreground">
                      {monthInfo?.isIncomplete
                        ? `vs ${comparison?.label || "período igual"} do mês anterior`
                        : "vs mês anterior"}
                    </span>
                  </div>
                )}
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
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                Saúde do Negócio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BusinessHealthScore score={healthScore.score} components={healthScore.components} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPIs */}
      {currentMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(() => {
            const d = segmentBreakdown
              ? SEGMENT_ORDER.reduce(
                  (a, k) => {
                    a[k] = segmentBreakdown[k].pedidos;
                    return a;
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
                {isConsolidated && d && <SegmentBreakdownBars data={d} />}
              </StatusMetricCard>
            );
          })()}
          {(() => {
            const d = segmentBreakdown
              ? SEGMENT_ORDER.reduce(
                  (a, k) => {
                    a[k] = segmentBreakdown[k].ticketMedio;
                    return a;
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
                {isConsolidated && d && <SegmentBreakdownBars data={d} formatValue={formatCurrency} />}
              </StatusMetricCard>
            );
          })()}
          {(() => {
            const d = segmentBreakdown
              ? SEGMENT_ORDER.reduce(
                  (a, k) => {
                    a[k] = segmentBreakdown[k].ticketMedio;
                    return a;
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
                {isConsolidated && d && <SegmentBreakdownBars data={d} formatValue={formatCurrency} />}
              </StatusMetricCard>
            );
          })()}
          {!isConsolidated && currentMetrics.marketingApplicable !== false && (
            <>
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
              <StatusMetricCard
                title="LTV"
                value={formatCurrency(currentMetrics.clientes.ltv)}
                icon={<TrendingUp className="h-4 w-4" />}
                trend={variations?.ltv}
                status={getStatusFromBenchmark(currentMetrics.clientes.ltv, 200)}
                interpretation="Valor do Cliente"
                tooltipKey="ltv"
              />
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
          {!isConsolidated && (selectedSegment === "b2b" || (currentMetrics.vendas.volumeKg || 0) > 0) && (
            <StatusMetricCard
              title="Volume"
              value={`${((currentMetrics.vendas.volumeKg || 0) / 1000).toFixed(1)} ton`}
              icon={<Weight className="h-4 w-4" />}
              interpretation="Peso líquido total"
            />
          )}
        </div>
      )}

      <Separator />

      {/* COMPARATIVO + TOP PRODUTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Comparativo Mês Anterior
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentMetrics && previousMetrics ? (
              <ComparativoChart
                current={{
                  receita: currentMetrics.vendas.receita,
                  pedidos: currentMetrics.vendas.pedidos,
                  ticket: currentMetrics.vendas.ticketMedioReal,
                }}
                previous={{
                  receita: previousMetrics.vendas.receita,
                  pedidos: previousMetrics.vendas.pedidos,
                  ticket: previousMetrics.vendas.ticketMedioReal,
                }}
                label={
                  monthInfo?.isIncomplete
                    ? `${comparison?.label || "Período igual"} vs mês anterior`
                    : "Mês atual vs mês anterior"
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Selecione um mês específico para ver o comparativo.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Top 5 Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between py-1.5 border-b last:border-0">
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
                    <p className="text-sm font-semibold">{formatCurrency(product.receita)}</p>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => navigate("/produtos")}>
                  Ver todos os produtos <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4">Nenhum produto encontrado para o período.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ALERTAS + OPORTUNIDADES — sempre visíveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Alertas Críticos
              {alerts.length > 0 && (
                <Badge variant="destructive" className="text-xs ml-auto">
                  {alerts.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="p-3 bg-white rounded-lg border border-red-100">
                    <div className="flex items-start gap-2">
                      <span className="text-lg shrink-0">
                        {alert.severity === "critical" ? "🔴" : alert.severity === "warning" ? "🟡" : "ℹ️"}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{alert.title}</p>
                        {alert.action && <p className="text-xs text-muted-foreground mt-1">💡 {alert.action}</p>}
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate("/analise-critica")}>
                  Ver análise completa <ArrowRight className="h-4 w-4 ml-1" />
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

        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-emerald-600" />
              Oportunidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {opportunities.length > 0 ? (
              <div className="space-y-3">
                {opportunities.slice(0, 3).map((opportunity) => (
                  <div key={opportunity.id} className="p-3 bg-white rounded-lg border border-emerald-100">
                    <div className="flex items-start gap-2">
                      <span className="text-lg shrink-0">✅</span>
                      <div>
                        <p className="text-sm font-medium">{opportunity.title}</p>
                        {opportunity.action && (
                          <p className="text-xs text-muted-foreground mt-1">🎯 {opportunity.action}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate("/analise-critica")}>
                  Ver todas as oportunidades <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm py-4">
                {availableSalesMonths.length < 2
                  ? "Carregue dados de pelo menos 2 meses para gerar oportunidades."
                  : "Nenhuma oportunidade identificada no momento."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CANAIS — sempre visível se houver dados */}
      {platformData.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Performance por Canal
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  Ver análise completa <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
