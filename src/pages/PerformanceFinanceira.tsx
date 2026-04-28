import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  Package,
  Calendar,
  Loader2,
  Receipt,
  Target,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { StatusMetricCard, getStatusFromBenchmark } from "@/components/dashboard/StatusMetricCard";
import { DailyRevenueChart, ChartViewMode } from "@/components/dashboard/DailyRevenueChart";
import { DailyVolumeChart } from "@/components/dashboard/DailyVolumeChart";
import { RevenueHeroCard } from "@/components/dashboard/RevenueHeroCard";
import { GoalsProgressCard } from "@/components/dashboard/GoalsProgressCard";
import { FinancialBreakdownCard } from "@/components/dashboard/FinancialBreakdownCard";
import { ChannelDonutChart } from "@/components/dashboard/ChannelDonutChart";
import { TopProductsCompact } from "@/components/dashboard/TopProductsCompact";
import { TicketDistributionCompact } from "@/components/dashboard/TicketDistributionCompact";
import { SeasonalityChart } from "@/components/dashboard/SeasonalityChart";
import {
  calculateFinancialMetrics,
  analyzeSeasonality,
  getPlatformPerformanceWithProducts,
} from "@/utils/financialMetrics";
import { filterOrdersByDateRange } from "@/utils/salesCalculator";
import { getOfficialRevenue, getRevenueOrders, getComiDaDragaoOrders } from "@/utils/revenue";
import { filterAdsByDateRange, filterAdsByObjective } from "@/utils/adsParserV2";
import { calculateAdsMetrics } from "@/utils/adsCalculator";
// benchmarksPetFood migrado → sectorBenchmarks (useAppSettings)
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

// R27: metas customizadas por tipo de ROAS, conforme definição operacional
// do Bruno (28/04/26). Antes todos os 4 cards usavam o mesmo threshold genérico
// `sectorBenchmarks.roasMedio` (3x), o que distorcia a leitura: ROAS Meta tem
// natureza diferente (atribuição pixel ≤ 1) e Venda mede só Sales (mais alto).
const ROAS_GOALS = {
  bruto: 3.0,
  real: 3.0,
  venda: 2.5,
  meta: 1.2,
};
// Status: success ≥ goal, warning ≥ 80% goal, danger < 80%.
const roasStatus = (value: number, goal: number): "success" | "warning" | "danger" => {
  if (value >= goal) return "success";
  if (value >= goal * 0.8) return "warning";
  return "danger";
};

export default function PerformanceFinanceira() {
  const { salesData, adsData, dateRange, comparisonDateRange, comparisonMode } = useDashboard();

  const { financialGoals, sectorBenchmarks, isLoading: goalsLoading } = useAppSettings();

  const [seasonalityView, setSeasonalityView] = useState<"monthly" | "quarterly">("monthly");
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>("daily");

  // Brand-level: excludes B2B (Lets Fly)
  const cdSalesData = useMemo(() => getComiDaDragaoOrders(salesData), [salesData]);

  // Pedidos do período principal
  const periodOrders = useMemo(() => {
    if (!dateRange) return cdSalesData;
    return filterOrdersByDateRange(cdSalesData, dateRange.start, dateRange.end);
  }, [cdSalesData, dateRange]);

  // Pedidos do período de comparação
  const comparisonOrders = useMemo(() => {
    if (!comparisonDateRange) return [];
    return filterOrdersByDateRange(cdSalesData, comparisonDateRange.start, comparisonDateRange.end);
  }, [cdSalesData, comparisonDateRange]);

  // Métricas do período principal
  const financialMetrics = useMemo(() => {
    if (cdSalesData.length === 0) return null;
    return calculateFinancialMetrics(periodOrders, "range");
  }, [periodOrders, cdSalesData]);

  // Métricas do período de comparação
  const previousMetrics = useMemo(() => {
    if (comparisonOrders.length === 0) return null;
    return calculateFinancialMetrics(comparisonOrders, "range");
  }, [comparisonOrders]);

  // Variações período atual vs comparação
  const variations = useMemo((): { revenue: number | null; ticket: number | null; orders: number | null } | null => {
    if (!financialMetrics || !previousMetrics) return null;
    const calc = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
    return {
      revenue: calc(financialMetrics.faturamentoTotal, previousMetrics.faturamentoTotal),
      ticket: calc(financialMetrics.ticketMedioReal, previousMetrics.ticketMedioReal),
      orders: calc(financialMetrics.totalPedidos, previousMetrics.totalPedidos),
    };
  }, [financialMetrics, previousMetrics]);

  // Métricas de comparação (modo comparação ativo — 2 períodos)
  const comparisonMetrics = useMemo(() => {
    if (!comparisonMode || !comparisonDateRange || !financialMetrics || !previousMetrics) return null;

    const COLORS = ["#8b5cf6", "#3b82f6"];

    const toMetric = (metrics: typeof financialMetrics, label: string, color: string) => ({
      month: label.toLowerCase().replace(" ", "-"),
      monthLabel: label,
      color,
      value: 0, // placeholder — cada campo usa o próprio valor
      faturamento: metrics!.faturamentoTotal,
      ticket: metrics!.ticketMedioReal,
      pedidos: metrics!.totalPedidos,
      clientes: 0,
      produtos: metrics!.produtoMedio,
    });

    const a = toMetric(financialMetrics, "Período A", COLORS[0]);
    const b = toMetric(previousMetrics, "Período B", COLORS[1]);

    const makeSeries = (key: keyof typeof a) => {
      const base = a[key] as number;
      const comp = b[key] as number;
      const change = base > 0 ? ((comp - base) / base) * 100 : undefined;
      return [
        { month: a.month, monthLabel: a.monthLabel, color: a.color, value: base },
        { month: b.month, monthLabel: b.monthLabel, color: b.color, value: comp, percentageChange: change },
      ];
    };

    return {
      revenue: makeSeries("faturamento"),
      averageTicket: makeSeries("ticket"),
      totalOrders: makeSeries("pedidos"),
      totalCustomers: makeSeries("clientes"),
      averageProducts: makeSeries("produtos"),
    };
  }, [comparisonMode, comparisonDateRange, financialMetrics, previousMetrics]);

  // Sazonalidade (todos os dados — sem filtro de período)
  const seasonalityAnalysis = useMemo(() => {
    if (cdSalesData.length === 0) return null;
    return analyzeSeasonality(cdSalesData);
  }, [cdSalesData]);

  // ROAS
  const roasMetrics = useMemo(() => {
    if (cdSalesData.length === 0) return null;
    const filteredAds = dateRange ? filterAdsByDateRange(adsData, dateRange.start, dateRange.end) : adsData;
    const adsMetrics = filteredAds.length > 0 ? calculateAdsMetrics(filteredAds) : null;
    const investimentoAds = adsMetrics?.investimentoTotal || 0;
    const valorConversaoMeta = adsMetrics?.valorConversaoTotal || 0;

    // R24: ROAS Venda — só ads de campanhas Vendas (OUTCOME_SALES).
    // Numerador e denominador filtrados → mostra eficiência pura das
    // campanhas de conversão direta, separada do mix com Outros.
    const vendasAds = filterAdsByObjective(filteredAds, "VENDAS");
    const vendasMetrics = vendasAds.length > 0 ? calculateAdsMetrics(vendasAds) : null;
    const investimentoVendas = vendasMetrics?.investimentoTotal || 0;
    const valorConversaoVendas = vendasMetrics?.valorConversaoTotal || 0;

    const revenueOrders = getRevenueOrders(periodOrders);
    const faturamentoTotal = revenueOrders.reduce((s, o) => s + getOfficialRevenue(o), 0);
    const freteTotal = revenueOrders.reduce((s, o) => s + (o.valorFrete || 0), 0);
    const faturamentoExFrete = faturamentoTotal - freteTotal;
    return {
      roasBruto: investimentoAds > 0 ? faturamentoTotal / investimentoAds : 0,
      roasReal: investimentoAds > 0 ? faturamentoExFrete / investimentoAds : 0,
      roasMeta: investimentoAds > 0 ? valorConversaoMeta / investimentoAds : 0,
      roasVenda: investimentoVendas > 0 ? valorConversaoVendas / investimentoVendas : 0,
      investimentoAds,
      investimentoVendas,
      hasAdsData: filteredAds.length > 0,
    };
  }, [cdSalesData, adsData, periodOrders, dateRange]);

  // R24: crescimento dinâmico — período atual vs período anterior do MESMO TAMANHO.
  // Antes só calculava quando havia mês explicitamente selecionado (yyyy-MM),
  // ficando 0 em "7 dias", "30 dias", "12 meses", "Mês atual" → bug visível.
  const growthRateDynamic = useMemo<number | null>(() => {
    if (!dateRange) return null;
    const oneDay = 1000 * 60 * 60 * 24;
    const rangeDays = Math.max(1, Math.round((dateRange.end.getTime() - dateRange.start.getTime()) / oneDay) + 1);
    const prevEnd = new Date(dateRange.start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - rangeDays + 1);

    const prevOrders = filterOrdersByDateRange(cdSalesData, prevStart, prevEnd);
    const prevRevenue = getRevenueOrders(prevOrders).reduce((s, o) => s + getOfficialRevenue(o), 0);
    const currentRevenue = getRevenueOrders(periodOrders).reduce((s, o) => s + getOfficialRevenue(o), 0);
    if (prevRevenue <= 0) return null;
    return ((currentRevenue - prevRevenue) / prevRevenue) * 100;
  }, [cdSalesData, dateRange, periodOrders]);

  // Metas
  const goalsData = useMemo(() => {
    if (!financialMetrics) return [];
    return [
      {
        label: "Receita",
        current: financialMetrics.faturamentoTotal,
        goal: financialGoals.receita,
        format: "currency" as const,
      },
      {
        label: "Pedidos",
        current: financialMetrics.totalPedidos,
        goal: financialGoals.pedidos,
        format: "number" as const,
      },
      {
        label: "Ticket Médio",
        current: financialMetrics.ticketMedioReal,
        goal: financialGoals.ticketMedio,
        format: "currency" as const,
      },
      {
        label: "Margem",
        current: (1 - financialGoals.custoFixo) * 100,
        goal: financialGoals.margem,
        format: "percent" as const,
      },
    ];
  }, [financialMetrics, financialGoals]);

  // Breakdown por canal + produtos
  const platformWithProducts = useMemo(() => {
    return getPlatformPerformanceWithProducts(periodOrders, 5);
  }, [periodOrders]);

  if (cdSalesData.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              💰 Performance Financeira
            </CardTitle>
            <CardDescription>
              Carregue os dados de vendas na página "Upload" para visualizar as análises financeiras.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (goalsLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando metas...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* ===== HEADER ===== */}
      <div className="flex items-center gap-3">
        <DollarSign className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">💰 Performance Financeira</h1>
          <p className="text-muted-foreground">Análise completa de receita, margem e tendências</p>
        </div>
      </div>

      {/* Indicador de período */}
      {!dateRange && !comparisonMode && (
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-500" />
              <p className="text-sm font-medium">
                📅 Todos os períodos — use o filtro acima para selecionar um intervalo
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== BLOCO 1: HERO METRICS ===== */}
      {!comparisonMode && financialMetrics && (
        <div className="grid gap-4 lg:grid-cols-2">
          <RevenueHeroCard
            totalRevenue={financialMetrics.faturamentoTotal}
            netRevenue={financialMetrics.faturamentoLiquido}
            shippingTotal={financialMetrics.freteTotal}
            variation={variations?.revenue}
            revenueGoal={financialGoals.receita}
            costPercentage={financialGoals.custoFixo}
          />

          <div className="grid grid-cols-3 gap-2">
            <StatusMetricCard
              title="Pedidos"
              value={financialMetrics.totalPedidos.toLocaleString("pt-BR")}
              icon={<ShoppingCart className="h-3 w-3" />}
              trend={variations?.orders}
              size="compact"
              tooltipKey="pedidos"
            />
            <StatusMetricCard
              title="Ticket Médio"
              value={formatCurrency(financialMetrics.ticketMedio)}
              icon={<Receipt className="h-3 w-3" />}
              size="compact"
              tooltipKey="ticket_medio"
            />
            <StatusMetricCard
              title="Ticket Real"
              value={formatCurrency(financialMetrics.ticketMedioReal)}
              icon={<TrendingUp className="h-3 w-3" />}
              trend={variations?.ticket}
              status={getStatusFromBenchmark(financialMetrics.ticketMedioReal, sectorBenchmarks.ticketMedio)}
              size="compact"
              tooltipKey="ticket_medio_real"
            />
            <StatusMetricCard
              title="Itens/Pedido"
              value={`${financialMetrics.produtoMedio.toFixed(1)}`}
              icon={<Package className="h-3 w-3" />}
              size="compact"
              tooltipKey="itens_pedido"
            />
            <StatusMetricCard
              title="Receita Líq."
              value={formatCurrency(financialMetrics.faturamentoLiquido)}
              icon={<DollarSign className="h-3 w-3" />}
              status="neutral"
              size="compact"
              tooltipKey="receita_liquida"
            />
            <StatusMetricCard
              title="Crescimento"
              value={
                growthRateDynamic === null
                  ? "—"
                  : `${growthRateDynamic >= 0 ? "+" : ""}${growthRateDynamic.toFixed(1)}%`
              }
              icon={
                (growthRateDynamic ?? 0) >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )
              }
              status={
                growthRateDynamic === null
                  ? "neutral"
                  : growthRateDynamic > 10
                    ? "success"
                    : growthRateDynamic < -10
                      ? "danger"
                      : growthRateDynamic < 0
                        ? "warning"
                        : "neutral"
              }
              size="compact"
              tooltipKey="crescimento"
            />
          </div>
        </div>
      )}

      {/* ===== ROAS ===== */}
      {!comparisonMode && roasMetrics && roasMetrics.hasAdsData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              📈 ROAS - Retorno sobre Investimento em Ads
            </CardTitle>
            <CardDescription>
              4 métricas de ROAS: bruto e real (caixa real), Meta (atribuído pelo pixel) e Venda
              (eficiência só de campanhas Vendas).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatusMetricCard
                title="ROAS Bruto"
                value={`${roasMetrics.roasBruto.toFixed(2)}x`}
                icon={<DollarSign className="h-3 w-3" />}
                status={roasStatus(roasMetrics.roasBruto, ROAS_GOALS.bruto)}
                benchmark={{ value: ROAS_GOALS.bruto, label: `Meta: ${ROAS_GOALS.bruto.toFixed(1)}x` }}
                interpretation="Receita Total ÷ Ads"
                size="compact"
                tooltipKey="roas_bruto"
              />
              <StatusMetricCard
                title="ROAS Real"
                value={`${roasMetrics.roasReal.toFixed(2)}x`}
                icon={<DollarSign className="h-3 w-3" />}
                status={roasStatus(roasMetrics.roasReal, ROAS_GOALS.real)}
                benchmark={{ value: ROAS_GOALS.real, label: `Meta: ${ROAS_GOALS.real.toFixed(1)}x` }}
                interpretation="Receita ex-frete ÷ Ads"
                size="compact"
                tooltipKey="roas_real"
              />
              <StatusMetricCard
                title="ROAS Meta"
                value={`${roasMetrics.roasMeta.toFixed(2)}x`}
                icon={<Target className="h-3 w-3" />}
                status={roasStatus(roasMetrics.roasMeta, ROAS_GOALS.meta)}
                benchmark={{ value: ROAS_GOALS.meta, label: `Meta: ${ROAS_GOALS.meta.toFixed(1)}x` }}
                interpretation="Valor Meta ÷ Ads (ex-frete)"
                size="compact"
                tooltipKey="roas_meta"
              />
              {/* R24: ROAS Venda — eficiência apenas de campanhas Vendas
                   (numerador e denominador filtrados por OUTCOME_SALES). */}
              <StatusMetricCard
                title="ROAS Venda"
                value={
                  roasMetrics.investimentoVendas > 0 ? `${roasMetrics.roasVenda.toFixed(2)}x` : "—"
                }
                icon={<Target className="h-3 w-3" />}
                status={
                  roasMetrics.investimentoVendas <= 0
                    ? "neutral"
                    : roasStatus(roasMetrics.roasVenda, ROAS_GOALS.venda)
                }
                benchmark={{ value: ROAS_GOALS.venda, label: `Meta: ${ROAS_GOALS.venda.toFixed(1)}x` }}
                interpretation="Valor Meta ÷ Ads Vendas"
                size="compact"
                tooltipKey="roas_meta"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== COMPARAÇÃO ===== */}
      {comparisonMode && comparisonMetrics && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <ComparisonMetricCard
              title="Faturamento Total"
              icon={DollarSign}
              metrics={comparisonMetrics.revenue}
              formatValue={formatCurrency}
            />
            <ComparisonMetricCard
              title="Ticket Médio"
              icon={TrendingUp}
              metrics={comparisonMetrics.averageTicket}
              formatValue={formatCurrency}
            />
            <ComparisonMetricCard
              title="Total de Pedidos"
              icon={ShoppingCart}
              metrics={comparisonMetrics.totalOrders}
            />
            <ComparisonMetricCard title="Total de Clientes" icon={Users} metrics={comparisonMetrics.totalCustomers} />
            <ComparisonMetricCard
              title="Produto Médio"
              icon={Package}
              metrics={comparisonMetrics.averageProducts}
              formatValue={(v) => `${v.toFixed(1)} itens`}
            />
          </div>

          {/* Barra comparativa de faturamento */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Comparação de Faturamento</CardTitle>
              <CardDescription>Período A vs Período B</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comparisonMetrics.revenue.map((metric) => {
                  const max = Math.max(...comparisonMetrics.revenue.map((m) => m.value), 0);
                  return (
                    <div key={metric.month} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: metric.color }} />
                          <span className="font-medium">{metric.monthLabel}</span>
                          {metric.percentageChange !== undefined && (
                            <span
                              className={cn(
                                "text-xs",
                                metric.percentageChange >= 0 ? "text-green-600" : "text-red-500",
                              )}
                            >
                              {metric.percentageChange >= 0 ? "+" : ""}
                              {metric.percentageChange.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <span className="text-lg font-bold">{formatCurrency(metric.value)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="h-3 rounded-full transition-all"
                          style={{
                            width: `${max > 0 ? (metric.value / max) * 100 : 0}%`,
                            backgroundColor: metric.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ===== EVOLUÇÃO TEMPORAL ===== */}
      {!comparisonMode && financialMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DailyRevenueChart rawOrders={periodOrders} viewMode={chartViewMode} onViewModeChange={setChartViewMode} />
          <DailyVolumeChart rawOrders={periodOrders} viewMode={chartViewMode} onViewModeChange={setChartViewMode} />
        </div>
      )}

      {/* ===== ANÁLISE POR DIMENSÃO ===== */}
      {!comparisonMode && financialMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChannelDonutChart data={financialMetrics.platformPerformance} rawOrders={periodOrders} />
          <TopProductsCompact data={financialMetrics.revenueByProduct} limit={8} />
          <TicketDistributionCompact
            data={financialMetrics.orderDistribution}
            averageTicket={financialMetrics.ticketMedioReal}
            rawOrders={periodOrders}
          />
        </div>
      )}

      {/* ===== SAZONALIDADE + METAS ===== */}
      {!comparisonMode && financialMetrics && seasonalityAnalysis && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  seasonalityView === "monthly" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
                )}
                onClick={() => setSeasonalityView("monthly")}
              >
                📅 Mensal
              </button>
              <button
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  seasonalityView === "quarterly" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
                )}
                onClick={() => setSeasonalityView("quarterly")}
              >
                📊 Trimestral
              </button>
            </div>
            <SeasonalityChart
              monthlyData={seasonalityAnalysis.monthly}
              quarterlyData={seasonalityAnalysis.quarterly}
              viewMode={seasonalityView}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GoalsProgressCard goals={goalsData} />
            <FinancialBreakdownCard
              grossRevenue={financialMetrics.faturamentoBruto}
              shippingCost={financialMetrics.freteTotal}
              costPercentage={financialGoals.custoFixo}
              platformBreakdown={platformWithProducts}
              maxProductsPerChannel={5}
            />
          </div>
        </div>
      )}
    </div>
  );
}
