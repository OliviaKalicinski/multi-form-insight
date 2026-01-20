import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { DollarSign, TrendingUp, TrendingDown, Users, ShoppingCart, Package, Calendar, Loader2, Receipt, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { calculateFinancialMetrics, analyzeSeasonality } from "@/utils/financialMetrics";
import { filterOrdersByMonth } from "@/utils/salesCalculator";
import { filterAdsByMonth } from "@/utils/executiveMetricsCalculator";
import { calculateAdsMetrics } from "@/utils/adsCalculator";
import { calculateComparisonMetrics } from "@/utils/comparisonCalculator";
import { benchmarksPetFood } from "@/data/executiveData";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function PerformanceFinanceira() {
  const {
    salesData,
    adsData,
    selectedMonth,
    availableMonths,
    comparisonMode,
    selectedMonths,
  } = useDashboard();

  const { financialGoals, isLoading: goalsLoading } = useAppSettings();

  const [seasonalityView, setSeasonalityView] = useState<'monthly' | 'quarterly'>('monthly');
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('daily');

  const isLast12MonthsView = selectedMonth === "last-12-months";

  const availableSalesMonths = useMemo(() => {
    const months = new Set<string>();
    salesData.forEach(o => months.add(format(o.dataVenda, "yyyy-MM")));
    return Array.from(months).sort();
  }, [salesData]);

  // Calcular métricas do mês selecionado
  const financialMetrics = useMemo(() => {
    if (salesData.length === 0) return null;
    const filteredOrders = selectedMonth
      ? filterOrdersByMonth(salesData, selectedMonth, availableSalesMonths)
      : salesData;
    return calculateFinancialMetrics(filteredOrders, selectedMonth || 'all');
  }, [salesData, selectedMonth, availableSalesMonths]);

  // Calcular métricas do mês anterior para comparação
  const previousMonthMetrics = useMemo(() => {
    if (salesData.length === 0 || !selectedMonth || selectedMonth === 'last-12-months') return null;
    
    const currentDate = parse(selectedMonth, "yyyy-MM", new Date());
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = format(prevMonth, "yyyy-MM");
    
    if (!availableSalesMonths.includes(prevMonthStr)) return null;
    
    const filteredOrders = filterOrdersByMonth(salesData, prevMonthStr, availableSalesMonths);
    return calculateFinancialMetrics(filteredOrders, prevMonthStr);
  }, [salesData, selectedMonth, availableSalesMonths]);

  // Calcular variações
  const variations = useMemo((): { revenue: number | null; ticket: number | null; orders: number | null } | null => {
    if (!financialMetrics || !previousMonthMetrics) return null;
    
    const calc = (current: number, previous: number): number | null =>
      previous > 0 ? ((current - previous) / previous) * 100 : null;
    
    return {
      revenue: calc(financialMetrics.faturamentoTotal, previousMonthMetrics.faturamentoTotal),
      ticket: calc(financialMetrics.ticketMedioReal, previousMonthMetrics.ticketMedioReal),
      orders: calc(financialMetrics.totalPedidos, previousMonthMetrics.totalPedidos),
    };
  }, [financialMetrics, previousMonthMetrics]);

  // Métricas de comparação (quando comparisonMode ativo)
  const comparisonMetrics = useMemo(() => {
    if (!comparisonMode || selectedMonths.length === 0 || salesData.length === 0) {
      return null;
    }
    return calculateComparisonMetrics(salesData, selectedMonths, availableMonths);
  }, [comparisonMode, selectedMonths, salesData, availableMonths]);

  // Análise de sazonalidade (todos os dados)
  const seasonalityAnalysis = useMemo(() => {
    if (salesData.length === 0) return null;
    return analyzeSeasonality(salesData);
  }, [salesData]);

  // === ROAS METRICS ===
  const roasMetrics = useMemo(() => {
    if (salesData.length === 0) return null;
    
    // Filtrar pedidos do período
    const filteredOrders = selectedMonth
      ? filterOrdersByMonth(salesData, selectedMonth, availableSalesMonths)
      : salesData;
    
    // Filtrar ads do período
    const filteredAds = selectedMonth && selectedMonth !== 'last-12-months'
      ? filterAdsByMonth(adsData, selectedMonth)
      : adsData;
    
    // Calcular métricas de ads
    const adsMetrics = filteredAds.length > 0 ? calculateAdsMetrics(filteredAds) : null;
    const investimentoAds = adsMetrics?.investimentoTotal || 0;
    const valorConversaoMeta = adsMetrics?.valorConversaoTotal || 0;
    
    // Calcular faturamento e frete
    const faturamentoTotal = filteredOrders.reduce((sum, o) => sum + o.valorTotal, 0);
    const freteTotal = filteredOrders.reduce((sum, o) => sum + (o.valorFrete || 0), 0);
    const faturamentoExFrete = faturamentoTotal - freteTotal;
    
    // 3 ROAS (ROAS Meta já é ex-frete pelo pixel)
    const roasBruto = investimentoAds > 0 ? faturamentoTotal / investimentoAds : 0;
    const roasReal = investimentoAds > 0 ? faturamentoExFrete / investimentoAds : 0;
    const roasMeta = investimentoAds > 0 ? valorConversaoMeta / investimentoAds : 0;
    
    return {
      roasBruto,
      roasReal,
      roasMeta,
      investimentoAds,
      hasAdsData: filteredAds.length > 0
    };
  }, [salesData, adsData, selectedMonth, availableSalesMonths]);

  // Goals data para o card de metas
  const goalsData = useMemo(() => {
    if (!financialMetrics) return [];
    return [
      { 
        label: "Receita", 
        current: financialMetrics.faturamentoTotal, 
        goal: financialGoals.receita, 
        format: 'currency' as const 
      },
      { 
        label: "Pedidos", 
        current: financialMetrics.totalPedidos, 
        goal: financialGoals.pedidos, 
        format: 'number' as const 
      },
      { 
        label: "Ticket Médio", 
        current: financialMetrics.ticketMedioReal, 
        goal: financialGoals.ticketMedio, 
        format: 'currency' as const 
      },
      {
        label: "Margem",
        current: (1 - financialGoals.custoFixo) * 100,
        goal: financialGoals.margem,
        format: "percent" as const
      },
    ];
  }, [financialMetrics, financialGoals]);

  if (salesData.length === 0) {
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
          <p className="text-muted-foreground">
            Análise completa de receita, margem e tendências
          </p>
        </div>
      </div>

      {/* Period indicator for multi-month views */}
      {!selectedMonth && !comparisonMode && (
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  📅 Visão Completa - Todos os Períodos
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Mostrando dados de {availableSalesMonths.length} meses com vendas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLast12MonthsView && !comparisonMode && (
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  📅 Visão - Últimos 12 meses
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Mostrando janela móvel dos últimos 12 meses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== BLOCO 1: HERO METRICS ===== */}
      {!comparisonMode && financialMetrics && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Card Principal: Receita vs Meta */}
          <RevenueHeroCard
            totalRevenue={financialMetrics.faturamentoTotal}
            netRevenue={financialMetrics.faturamentoLiquido}
            shippingTotal={financialMetrics.freteTotal}
            variation={variations?.revenue}
            revenueGoal={financialGoals.receita}
            costPercentage={financialGoals.custoFixo}
          />

          {/* Cards Satélites (Grid 2x3) */}
          <div className="grid grid-cols-3 gap-2">
            {/* Linha 1: Primários */}
            <StatusMetricCard
              title="Pedidos"
              value={financialMetrics.totalPedidos.toLocaleString('pt-BR')}
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
              status={getStatusFromBenchmark(financialMetrics.ticketMedioReal, benchmarksPetFood.ticketMedio)}
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

            {/* Linha 2: Secundários */}
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
              value={`${(financialMetrics.growthRate || 0) >= 0 ? '+' : ''}${(financialMetrics.growthRate || 0).toFixed(1)}%`}
              icon={financialMetrics.growthRate >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              status={
                (financialMetrics.growthRate || 0) > 10 ? 'success' :
                (financialMetrics.growthRate || 0) < -10 ? 'danger' :
                (financialMetrics.growthRate || 0) < 0 ? 'warning' : 'neutral'
              }
              size="compact"
              tooltipKey="crescimento"
            />
          </div>
        </div>
      )}

      {/* ===== BLOCO ROAS (3 Cards) ===== */}
      {!comparisonMode && roasMetrics && roasMetrics.hasAdsData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              📈 ROAS - Retorno sobre Investimento em Ads
            </CardTitle>
            <CardDescription>
              Comparação de 3 métricas de ROAS: bruto, real e Meta (já ex-frete)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {/* 1. ROAS Bruto */}
              <StatusMetricCard
                title="ROAS Bruto"
                value={`${roasMetrics.roasBruto.toFixed(2)}x`}
                icon={<DollarSign className="h-3 w-3" />}
                status={
                  roasMetrics.roasBruto >= 4 ? 'success' :
                  roasMetrics.roasBruto >= 3 ? 'warning' : 'danger'
                }
                benchmark={{ value: 3.0, label: 'Meta: 3.0x' }}
                interpretation="Receita Total ÷ Ads"
                size="compact"
                tooltipKey="roas_bruto"
              />

              {/* 2. ROAS Real */}
              <StatusMetricCard
                title="ROAS Real"
                value={`${roasMetrics.roasReal.toFixed(2)}x`}
                icon={<DollarSign className="h-3 w-3" />}
                status={
                  roasMetrics.roasReal >= 4 ? 'success' :
                  roasMetrics.roasReal >= 3 ? 'warning' : 'danger'
                }
                benchmark={{ value: 3.0, label: 'Meta: 3.0x' }}
                interpretation="Receita ex-frete ÷ Ads"
                size="compact"
                tooltipKey="roas_real"
              />

              {/* 3. ROAS Meta (já ex-frete pelo pixel) */}
              <StatusMetricCard
                title="ROAS Meta"
                value={`${roasMetrics.roasMeta.toFixed(2)}x`}
                icon={<Target className="h-3 w-3" />}
                status={
                  roasMetrics.roasMeta >= 4 ? 'success' :
                  roasMetrics.roasMeta >= 3 ? 'warning' : 'danger'
                }
                benchmark={{ value: 3.0, label: 'Meta: 3.0x' }}
                interpretation="Valor Meta ÷ Ads (ex-frete)"
                size="compact"
                tooltipKey="roas_meta"
              />
            </div>
          </CardContent>
        </Card>
      )}


      {/* Cards de comparação */}
      {comparisonMode && comparisonMetrics && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ComparisonMetricCard
            title="Faturamento Total"
            icon={DollarSign}
            metrics={comparisonMetrics.revenue}
            formatValue={(v) => formatCurrency(v)}
          />
          <ComparisonMetricCard
            title="Ticket Médio"
            icon={TrendingUp}
            metrics={comparisonMetrics.averageTicket}
            formatValue={(v) => formatCurrency(v)}
          />
          <ComparisonMetricCard
            title="Total de Pedidos"
            icon={ShoppingCart}
            metrics={comparisonMetrics.totalOrders}
          />
          <ComparisonMetricCard
            title="Total de Clientes"
            icon={Users}
            metrics={comparisonMetrics.totalCustomers}
          />
          <ComparisonMetricCard
            title="Produto Médio"
            icon={Package}
            metrics={comparisonMetrics.averageProducts}
            formatValue={(v) => `${v.toFixed(1)} itens`}
          />
        </div>
      )}

      {/* ===== BLOCO 2: EVOLUÇÃO TEMPORAL ===== */}
      {!comparisonMode && financialMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DailyRevenueChart
            data={
              chartViewMode === 'daily' 
                ? financialMetrics.revenueByDay.map(d => ({ date: d.date, revenue: d.revenue }))
                : chartViewMode === 'weekly'
                ? financialMetrics.revenueByWeek
                : financialMetrics.revenueByMonth.map(d => ({
                    month: format(parse(d.month, "yyyy-MM", new Date()), "MMM/yy", { locale: ptBR }),
                    revenue: d.revenue
                  }))
            }
            viewMode={chartViewMode}
            onViewModeChange={setChartViewMode}
            showMovingAverage={true}
          />
          <DailyVolumeChart
            data={
              chartViewMode === 'daily'
                ? financialMetrics.ordersByDay
                : chartViewMode === 'weekly'
                ? financialMetrics.ordersByWeek
                : financialMetrics.ordersByMonth
            }
            viewMode={chartViewMode}
            onViewModeChange={setChartViewMode}
            dailyGoal={Math.round(financialGoals.pedidos / 30)}
          />
        </div>
      )}

      {/* ===== BLOCO 3: ANÁLISE POR DIMENSÃO ===== */}
      {!comparisonMode && financialMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Por Canal (Donut) */}
          <ChannelDonutChart data={financialMetrics.platformPerformance} />
          
          {/* Top Produtos (Barras Horizontais) */}
          <TopProductsCompact data={financialMetrics.revenueByProduct} limit={8} />
          
          {/* Distribuição de Ticket (Histograma) */}
          <TicketDistributionCompact 
            data={financialMetrics.orderDistribution}
            averageTicket={financialMetrics.ticketMedioReal}
          />
        </div>
      )}

      {/* ===== BLOCO 4: INSIGHTS E SAZONALIDADE ===== */}
      {!comparisonMode && financialMetrics && seasonalityAnalysis && (
        <div className="space-y-6">
          {/* Sazonalidade (100% largura) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  seasonalityView === 'monthly' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                )}
                onClick={() => setSeasonalityView('monthly')}
              >
                📅 Mensal
              </button>
              <button
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  seasonalityView === 'quarterly' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                )}
                onClick={() => setSeasonalityView('quarterly')}
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

          {/* Grid 50/50: Metas + Breakdown Financeiro */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GoalsProgressCard goals={goalsData} />
            <FinancialBreakdownCard
              grossRevenue={financialMetrics.faturamentoBruto}
              shippingCost={financialMetrics.freteTotal}
              costPercentage={financialGoals.custoFixo}
            />
          </div>
        </div>
      )}

      {/* Comparison mode - evolution tab content */}
      {comparisonMode && comparisonMetrics && (() => {
        const maxRevenue = Math.max(...comparisonMetrics.revenue.map(m => m.value), 0);
        return (
          <Card>
            <CardHeader>
              <CardTitle>📊 Comparação de Faturamento por Mês</CardTitle>
              <CardDescription>
                Comparando {selectedMonths.length} meses selecionados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comparisonMetrics.revenue.map((metric) => (
                  <div key={metric.month} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: metric.color }}
                        />
                        <span className="font-medium">{metric.monthLabel}</span>
                      </div>
                      <span className="text-lg font-bold">
                        {formatCurrency(metric.value)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          width: `${maxRevenue > 0 ? (metric.value / maxRevenue) * 100 : 0}%`,
                          backgroundColor: metric.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
