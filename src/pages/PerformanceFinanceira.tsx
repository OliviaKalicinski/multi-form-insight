import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { DollarSign, TrendingUp, TrendingDown, Users, ShoppingCart, Package, Percent, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { StatusMetricCard, getStatusFromBenchmark, formatBenchmarkInterpretation } from "@/components/dashboard/StatusMetricCard";
import { DailyRevenueChart } from "@/components/dashboard/DailyRevenueChart";
import { DailyVolumeChart } from "@/components/dashboard/DailyVolumeChart";
import { ProductRevenuePieChart } from "@/components/dashboard/ProductRevenuePieChart";
import { SeasonalityChart } from "@/components/dashboard/SeasonalityChart";
import { OrderDistributionChart } from "@/components/dashboard/OrderDistributionChart";
import { PlatformComparisonChart } from "@/components/dashboard/PlatformComparisonChart";
import { calculateFinancialMetrics, analyzeSeasonality } from "@/utils/financialMetrics";
import { filterOrdersByMonth } from "@/utils/salesCalculator";
import { calculateComparisonMetrics } from "@/utils/comparisonCalculator";
import { calculateROAS } from "@/utils/roasCalculator";
import { filterAdsByMonth } from "@/utils/adsParserV2";
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

  const [seasonalityView, setSeasonalityView] = useState<'monthly' | 'quarterly'>('monthly');
  const [platformMetric, setPlatformMetric] = useState<'revenue' | 'orders' | 'averageTicket'>('revenue');

  // Calcular métricas do mês selecionado
  const financialMetrics = useMemo(() => {
    if (salesData.length === 0 || !selectedMonth) return null;
    const filteredOrders = filterOrdersByMonth(salesData, selectedMonth, availableMonths);
    return calculateFinancialMetrics(filteredOrders, selectedMonth);
  }, [salesData, selectedMonth, availableMonths]);

  // Calcular métricas do mês anterior para comparação
  const previousMonthMetrics = useMemo(() => {
    if (salesData.length === 0 || !selectedMonth || selectedMonth === 'last-12-months') return null;
    
    const currentDate = parse(selectedMonth, "yyyy-MM", new Date());
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = format(prevMonth, "yyyy-MM");
    
    if (!availableMonths.includes(prevMonthStr)) return null;
    
    const filteredOrders = filterOrdersByMonth(salesData, prevMonthStr, availableMonths);
    return calculateFinancialMetrics(filteredOrders, prevMonthStr);
  }, [salesData, selectedMonth, availableMonths]);

  // Calcular variações
  const variations = useMemo(() => {
    if (!financialMetrics || !previousMonthMetrics) return null;
    
    const calc = (current: number, previous: number) => 
      previous > 0 ? ((current - previous) / previous) * 100 : 0;
    
    return {
      revenue: calc(financialMetrics.faturamentoTotal, previousMonthMetrics.faturamentoTotal),
      ticket: calc(financialMetrics.ticketMedioReal, previousMonthMetrics.ticketMedioReal),
      orders: calc(financialMetrics.totalPedidos, previousMonthMetrics.totalPedidos),
    };
  }, [financialMetrics, previousMonthMetrics]);

  // Calcular ROAS
  const roasMetrics = useMemo(() => {
    if (salesData.length === 0 || adsData.length === 0 || !selectedMonth) return null;
    
    const filteredOrders = filterOrdersByMonth(salesData, selectedMonth, availableMonths);
    const filteredAds = filterAdsByMonth(adsData, selectedMonth);
    
    return calculateROAS(filteredOrders, filteredAds);
  }, [salesData, adsData, selectedMonth, availableMonths]);

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

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <DollarSign className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">💰 Performance Financeira</h1>
          <p className="text-muted-foreground">
            Análise detalhada de faturamento, ticket médio e sazonalidade
          </p>
        </div>
      </div>


      {/* Cards resumo - HIERARQUIA VISUAL (Padrão Ads.tsx) */}
      {!comparisonMode && financialMetrics && (
        <>
          {/* ===== ROW 1: ROAS Compact (40%) + Satellite Cards (60%) ===== */}
          <div className="grid gap-4 lg:grid-cols-5">
            {/* Main ROAS Card - Compact */}
            {roasMetrics && (
              <Card className={cn(
                "lg:col-span-2 border-2 relative",
                roasMetrics.roas >= 3 ? "bg-green-50 border-green-200" :
                roasMetrics.roas >= 2 ? "bg-yellow-50 border-yellow-200" :
                "bg-red-50 border-red-200"
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
                        variant={roasMetrics.roas >= 3 ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {roasMetrics.roas >= 4 ? "🏆 Premium" :
                         roasMetrics.roas >= 3 ? "✓ Meta" :
                         roasMetrics.roas >= 2 ? "⚠️ Baixo" : "🚨 Crítico"}
                      </Badge>
                    </div>

                    {/* Main Value */}
                    <p className={cn(
                      "text-3xl font-bold",
                      roasMetrics.roas >= 3 ? "text-green-600" :
                      roasMetrics.roas >= 2 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {roasMetrics.roas.toFixed(2)}x
                    </p>

                    {/* Compact Calculation */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatCurrency(roasMetrics.faturamentoLiquido)}</span>
                      <span>/</span>
                      <span>{formatCurrency(roasMetrics.investimentoAds)}</span>
                    </div>

                    {/* Progress + ROI */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Meta: 3.0x</span>
                        <span className={cn(
                          "flex items-center gap-0.5",
                          roasMetrics.roi >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {roasMetrics.roi >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          ROI: {roasMetrics.roi >= 0 ? '+' : ''}{roasMetrics.roi.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={Math.min((roasMetrics.roas / 3) * 100, 150)} className="h-1.5" />
                    </div>

                    {/* Compact Interpretation */}
                    <p className="text-xs font-medium">
                      {roasMetrics.roas >= 4 ? "🎯 Excelente! Campanhas muito rentáveis." :
                       roasMetrics.roas >= 3 ? "✅ Bom desempenho, dentro da meta." :
                       roasMetrics.roas >= 2 ? "⚠️ Abaixo da meta, revisar campanhas." :
                       "🚨 ROAS crítico, ação urgente necessária."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Satellite Cards Grid (3x2) - Compact */}
            <div className={cn(
              "grid grid-cols-3 gap-2",
              roasMetrics ? "lg:col-span-3" : "lg:col-span-5"
            )}>
              {/* Receita Total */}
              <StatusMetricCard
                title="Receita Total"
                value={formatCurrency(financialMetrics.faturamentoTotal)}
                icon={<DollarSign className="h-3 w-3" />}
                trend={variations?.revenue}
                status="neutral"
                size="compact"
              />

              {/* Ticket Médio */}
              <StatusMetricCard
                title="Ticket Médio"
                value={formatCurrency(financialMetrics.ticketMedioReal)}
                icon={<TrendingUp className="h-3 w-3" />}
                trend={variations?.ticket}
                status={getStatusFromBenchmark(financialMetrics.ticketMedioReal, benchmarksPetFood.ticketMedio)}
                size="compact"
              />

              {/* Total Pedidos */}
              <StatusMetricCard
                title="Pedidos"
                value={financialMetrics.totalPedidos.toLocaleString('pt-BR')}
                icon={<ShoppingCart className="h-3 w-3" />}
                trend={variations?.orders}
                size="compact"
              />

              {/* Produto Médio */}
              <StatusMetricCard
                title="Prod. Médio"
                value={`${financialMetrics.produtoMedio.toFixed(1)} itens`}
                icon={<Package className="h-3 w-3" />}
                size="compact"
              />

              {/* Investimento Ads */}
              {roasMetrics && (
                <StatusMetricCard
                  title="Invest. Ads"
                  value={formatCurrency(roasMetrics.investimentoAds)}
                  icon={<Target className="h-3 w-3" />}
                  status="neutral"
                  size="compact"
                />
              )}

              {/* Crescimento */}
              <StatusMetricCard
                title="Crescimento"
                value={`${(financialMetrics.growthRate || 0) >= 0 ? '+' : ''}${(financialMetrics.growthRate || 0).toFixed(1)}%`}
                icon={<TrendingUp className="h-3 w-3" />}
                status={
                  (financialMetrics.growthRate || 0) > 10 ? 'success' :
                  (financialMetrics.growthRate || 0) < -10 ? 'danger' :
                  (financialMetrics.growthRate || 0) < 0 ? 'warning' : 'neutral'
                }
                size="compact"
              />
            </div>
          </div>
        </>
      )}

      {/* Cards de comparação */}
      {comparisonMode && comparisonMetrics && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ComparisonMetricCard
            title="Faturamento Total"
            icon={DollarSign}
            metrics={comparisonMetrics.revenue}
            formatValue={(v) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(v)
            }
          />
          <ComparisonMetricCard
            title="Ticket Médio"
            icon={TrendingUp}
            metrics={comparisonMetrics.averageTicket}
            formatValue={(v) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(v)
            }
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

      {/* Tabs com análises */}
      <Tabs defaultValue="evolution" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="evolution">📈 Evolução</TabsTrigger>
          <TabsTrigger value="seasonality">📅 Sazonalidade</TabsTrigger>
          <TabsTrigger value="distribution">🎯 Distribuição</TabsTrigger>
          <TabsTrigger value="platforms">🏪 Plataformas</TabsTrigger>
        </TabsList>

        {/* Tab 1: Evolução do faturamento */}
        <TabsContent value="evolution" className="space-y-6">
          {!comparisonMode && financialMetrics && (
            <>
              {/* Grid com 2 gráficos lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Faturamento (Diário ou Mensal) */}
                {financialMetrics.isMultiMonth ? (
                  <DailyRevenueChart
                    data={financialMetrics.revenueByMonth.map(d => ({
                      month: format(parse(d.month, "yyyy-MM", new Date()), "MMM/yy", { locale: ptBR }),
                      revenue: d.revenue
                    }))}
                    title="Faturamento Mensal"
                    description="Receita gerada por mês no período"
                    isMonthly={true}
                  />
                ) : (
                  <DailyRevenueChart
                    data={financialMetrics.revenueByDay.map(d => ({
                      date: d.date,
                      revenue: d.revenue
                    }))}
                    title="Faturamento Diário"
                    description="Receita gerada por dia no período"
                    isMonthly={false}
                  />
                )}
                
                {/* 2. Volume (Diário ou Mensal) */}
                {financialMetrics.isMultiMonth ? (
                  <DailyVolumeChart
                    data={financialMetrics.ordersByMonth}
                    title="Volume Mensal"
                    description="Número de pedidos realizados por mês"
                    isMonthly={true}
                  />
                ) : (
                  <DailyVolumeChart
                    data={financialMetrics.ordersByDay}
                    title="Volume Diário"
                    description="Número de pedidos realizados por dia"
                    isMonthly={false}
                  />
                )}
              </div>
              
              {/* 3. Faturamento Acumulado por Produto */}
              <ProductRevenuePieChart
                data={financialMetrics.revenueByProduct}
                title="Faturamento Acumulado por Produto"
                description="Top 15 produtos individuais (kits desmembrados)"
              />
            </>
          )}
          
          {comparisonMode && comparisonMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Comparação de Faturamento por Mês</CardTitle>
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
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(metric.value)}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="h-3 rounded-full transition-all"
                          style={{
                            width: `${(metric.value / Math.max(...comparisonMetrics.revenue.map(m => m.value))) * 100}%`,
                            backgroundColor: metric.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Sazonalidade */}
        <TabsContent value="seasonality">
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-md transition-colors ${
                  seasonalityView === 'monthly' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                }`}
                onClick={() => setSeasonalityView('monthly')}
              >
                Mensal
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-colors ${
                  seasonalityView === 'quarterly' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                }`}
                onClick={() => setSeasonalityView('quarterly')}
              >
                Trimestral
              </button>
            </div>
            
            {seasonalityAnalysis && (
              <SeasonalityChart
                monthlyData={seasonalityAnalysis.monthly}
                quarterlyData={seasonalityAnalysis.quarterly}
                viewMode={seasonalityView}
              />
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Distribuição de valores */}
        <TabsContent value="distribution">
          {financialMetrics && (
            <OrderDistributionChart
              data={financialMetrics.orderDistribution}
              totalOrders={financialMetrics.totalPedidos}
            />
          )}
        </TabsContent>

        {/* Tab 4: Performance por plataforma */}
        <TabsContent value="platforms">
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-md transition-colors ${
                  platformMetric === 'revenue' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                }`}
                onClick={() => setPlatformMetric('revenue')}
              >
                Faturamento
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-colors ${
                  platformMetric === 'orders' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                }`}
                onClick={() => setPlatformMetric('orders')}
              >
                Pedidos
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-colors ${
                  platformMetric === 'averageTicket' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                }`}
                onClick={() => setPlatformMetric('averageTicket')}
              >
                Ticket Médio
              </button>
            </div>
            
            {financialMetrics && (
              <PlatformComparisonChart
                data={financialMetrics.platformPerformance}
                metric={platformMetric}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
