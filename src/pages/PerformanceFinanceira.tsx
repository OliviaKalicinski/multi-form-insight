import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { DollarSign, TrendingUp, Users, ShoppingCart, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComparisonToggle } from "@/components/dashboard/ComparisonToggle";
import { MonthFilter } from "@/components/dashboard/MonthFilter";
import { MonthComparisonSelector } from "@/components/dashboard/MonthComparisonSelector";
import { FinancialSummaryCards } from "@/components/dashboard/FinancialSummaryCards";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { DailyRevenueChart } from "@/components/dashboard/DailyRevenueChart";
import { DailyVolumeChart } from "@/components/dashboard/DailyVolumeChart";
import { ProductAccumulatedRevenueChart } from "@/components/dashboard/ProductAccumulatedRevenueChart";
import { SeasonalityChart } from "@/components/dashboard/SeasonalityChart";
import { OrderDistributionChart } from "@/components/dashboard/OrderDistributionChart";
import { PlatformComparisonChart } from "@/components/dashboard/PlatformComparisonChart";
import { calculateFinancialMetrics, analyzeSeasonality } from "@/utils/financialMetrics";
import { filterOrdersByMonth } from "@/utils/salesCalculator";
import { calculateComparisonMetrics } from "@/utils/comparisonCalculator";

export default function PerformanceFinanceira() {
  const {
    salesData,
    selectedMonth,
    availableMonths,
    comparisonMode,
    selectedMonths,
    setSelectedMonth,
    setComparisonMode,
    toggleMonth,
  } = useDashboard();

  const [seasonalityView, setSeasonalityView] = useState<'monthly' | 'quarterly'>('monthly');
  const [platformMetric, setPlatformMetric] = useState<'revenue' | 'orders' | 'averageTicket'>('revenue');

  // Calcular métricas do mês selecionado
  const financialMetrics = useMemo(() => {
    if (salesData.length === 0 || !selectedMonth) return null;
    const filteredOrders = filterOrdersByMonth(salesData, selectedMonth, availableMonths);
    return calculateFinancialMetrics(filteredOrders, selectedMonth);
  }, [salesData, selectedMonth, availableMonths]);

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
              Carregue os dados de vendas na página "Uploader" para visualizar as análises financeiras.
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

      {/* ComparisonToggle */}
      {availableMonths.length > 1 && (
        <ComparisonToggle enabled={comparisonMode} onToggle={setComparisonMode} />
      )}

      {/* Filtro de mês */}
      {availableMonths.length > 0 && (comparisonMode ? (
          <MonthComparisonSelector
            availableMonths={availableMonths}
            selectedMonths={selectedMonths}
            onToggleMonth={toggleMonth}
          />
        ) : (
          <MonthFilter
            availableMonths={availableMonths}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        )
      )}

      {/* Cards resumo */}
      {!comparisonMode && financialMetrics && (
        <FinancialSummaryCards metrics={financialMetrics} />
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
                {/* 1. Faturamento Diário */}
                <DailyRevenueChart
                  data={financialMetrics.revenueByDay.map(d => ({
                    date: d.date,
                    revenue: d.revenue
                  }))}
                  title="Faturamento Diário"
                  description="Receita gerada por dia no período"
                />
                
                {/* 2. Volume Diário */}
                <DailyVolumeChart
                  data={financialMetrics.ordersByDay}
                  title="Volume Diário"
                  description="Número de pedidos realizados por dia"
                />
              </div>
              
              {/* 3. Faturamento Acumulado por Produto */}
              <ProductAccumulatedRevenueChart
                data={financialMetrics.revenueByProduct}
                title="Faturamento Acumulado por Produto"
                description="Top 15 produtos individuais (incluindo amostras)"
                topN={15}
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
