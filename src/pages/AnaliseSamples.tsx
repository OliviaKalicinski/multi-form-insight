import { useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { filterOrdersByMonth, formatCurrency } from "@/utils/salesCalculator";
import { calculateAllSampleMetrics, calculateDataPeriod } from "@/utils/samplesAnalyzer";
import { format } from "date-fns";
import { MonthFilter } from "@/components/dashboard/MonthFilter";
import { MonthComparisonSelector } from "@/components/dashboard/MonthComparisonSelector";
import { ComparisonToggle } from "@/components/dashboard/ComparisonToggle";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { SalesMetricCard } from "@/components/dashboard/SalesMetricCard";
import { ConversionFunnelChart } from "@/components/dashboard/ConversionFunnelChart";
import { SampleProductsTable } from "@/components/dashboard/SampleProductsTable";
import { CustomerSegmentationChart } from "@/components/dashboard/CustomerSegmentationChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Package, TrendingUp, DollarSign, Clock, Users, ShoppingCart, Target, Calendar } from "lucide-react";

const AnaliseSamples = () => {
  const { 
    salesData, 
    selectedMonth, 
    availableMonths, 
    setSelectedMonth,
    comparisonMode,
    selectedMonths,
    setComparisonMode,
    toggleMonth,
  } = useDashboard();

  const filteredOrders = useMemo(() => {
    if (salesData.length === 0) return [];
    if (!selectedMonth) return salesData;
    return filterOrdersByMonth(salesData, selectedMonth, availableMonths);
  }, [salesData, selectedMonth, availableMonths]);

  const metrics = useMemo(() => {
    if (filteredOrders.length === 0) {
      return null;
    }
    // Passar pedidos filtrados E histórico completo
    return calculateAllSampleMetrics(filteredOrders, salesData);
  }, [filteredOrders, salesData]);

  const dataPeriod = useMemo(() => {
    if (filteredOrders.length === 0) return null;
    return calculateDataPeriod(filteredOrders);
  }, [filteredOrders]);

  const comparisonMetrics = useMemo(() => {
    if (!comparisonMode || selectedMonths.length === 0 || salesData.length === 0) {
      return null;
    }
    
    return selectedMonths.map(month => {
      const orders = filterOrdersByMonth(salesData, month, availableMonths);
      // Passar pedidos filtrados E histórico completo
      const monthMetrics = calculateAllSampleMetrics(orders, salesData);
      
      const formatMonthLabel = (m: string) => {
        if (m === 'last-12-months') return 'Últimos 12 meses';
        const [year, monthNum] = m.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
      };
      
      return {
        month,
        label: formatMonthLabel(month),
        metrics: monthMetrics
      };
    });
  }, [comparisonMode, selectedMonths, salesData, availableMonths]);

  if (!metrics) {
    return (
      <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">🎁 Análise de Clientes que Iniciaram com Amostras</h1>
        <p className="text-muted-foreground">
          Análise de clientes cujo primeiro pedido foi apenas Kit de Amostras
          {dataPeriod && (
            <span className="block text-xs mt-1">
              Período: {format(dataPeriod.startDate, 'dd/MM/yyyy')} até {format(dataPeriod.endDate, 'dd/MM/yyyy')}
            </span>
          )}
        </p>
      </div>
      
      {availableMonths.length > 1 && (
        <ComparisonToggle enabled={comparisonMode} onToggle={setComparisonMode} />
      )}

      {availableMonths.length > 0 && (
        comparisonMode ? (
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
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Nenhum dado disponível. Por favor, faça upload dos dados de vendas.
          </p>
        </div>
      </div>
    );
  }

  // Preparar dados de segmentação para o gráfico
  const segmentationData = [
    {
      segment: 'Novo' as const,
      count: metrics.segmentation.oneTime,
      percentage: metrics.volume.uniqueCustomers > 0
        ? (metrics.segmentation.oneTime / metrics.volume.uniqueCustomers) * 100
        : 0,
      totalRevenue: 0,
      averageTicket: 0,
      criteria: '1 compra apenas',
    },
    {
      segment: 'Ativo' as const,
      count: metrics.segmentation.explorers,
      percentage: metrics.volume.uniqueCustomers > 0
        ? (metrics.segmentation.explorers / metrics.volume.uniqueCustomers) * 100
        : 0,
      totalRevenue: 0,
      averageTicket: 0,
      criteria: '2-3 compras',
    },
    {
      segment: 'VIP' as const,
      count: metrics.segmentation.loyal,
      percentage: metrics.volume.uniqueCustomers > 0
        ? (metrics.segmentation.loyal / metrics.volume.uniqueCustomers) * 100
        : 0,
      totalRevenue: 0,
      averageTicket: 0,
      criteria: '4+ compras',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">🎁 Análise de Clientes que Iniciaram com Amostras</h1>
        <p className="text-muted-foreground">
          Análise de clientes cujo primeiro pedido foi apenas Kit de Amostras
          {dataPeriod && (
            <span className="block text-xs mt-1">
              Período: {format(dataPeriod.startDate, 'dd/MM/yyyy')} até {format(dataPeriod.endDate, 'dd/MM/yyyy')}
            </span>
          )}
        </p>
      </div>
      
      {availableMonths.length > 1 && (
        <ComparisonToggle enabled={comparisonMode} onToggle={setComparisonMode} />
      )}

      {availableMonths.length > 0 && (
        comparisonMode ? (
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

      {dataPeriod && dataPeriod.isShortPeriod && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-warning">⚠️ Período de análise curto</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Dados disponíveis: {format(dataPeriod.startDate, 'dd/MM/yyyy')} até {format(dataPeriod.endDate, 'dd/MM/yyyy')} 
                  ({dataPeriod.totalMonths} {dataPeriod.totalMonths === 1 ? 'mês' : 'meses'}).
                  Algumas métricas de recompra podem estar subestimadas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicador de Maturidade da Análise */}
      {metrics.maturity && (
        <Card className={metrics.maturity.isReliableAnalysis ? "border-primary bg-primary/5" : "border-warning bg-warning/10"}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className={`h-5 w-5 mt-0.5 ${metrics.maturity.isReliableAnalysis ? 'text-primary' : 'text-warning'}`} />
              <div className="flex-1">
                <p className={`font-medium ${metrics.maturity.isReliableAnalysis ? 'text-primary' : 'text-warning'}`}>
                  {metrics.maturity.isReliableAnalysis ? '✅ Análise confiável' : '⚠️ Janela de análise limitada'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {metrics.maturity.percentageWith60Days.toFixed(0)}% dos clientes ({metrics.maturity.customersWithAtLeast60Days} de {metrics.maturity.totalQualifiedCustomers}) 
                  tiveram pelo menos 60 dias desde a compra da amostra.
                </p>
                {!metrics.maturity.isReliableAnalysis && (
                  <p className="text-sm text-muted-foreground mt-1">
                    📊 Muitos clientes compraram amostra recentemente. A taxa de recompra pode aumentar com o tempo.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Tempo médio desde amostra</p>
                    <p className="text-sm font-semibold">{Math.round(metrics.maturity.avgDaysSinceSample)} dias</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clientes com 90+ dias</p>
                    <p className="text-sm font-semibold">
                      {metrics.maturity.customersWithAtLeast90Days} ({metrics.maturity.percentageWith90Days.toFixed(0)}%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards principais */}
      {comparisonMode && comparisonMetrics ? (
        <div className="grid gap-4 md:grid-cols-2">
          <ComparisonMetricCard
            title="Clientes que Iniciaram com Amostras"
            icon={Users}
            metrics={comparisonMetrics.map(m => ({
              value: m.metrics.volume.uniqueCustomers,
              month: m.month,
              monthLabel: m.label,
              color: 'hsl(var(--primary))'
            }))}
          />
          <ComparisonMetricCard
            title="Taxa de Recompra"
            icon={TrendingUp}
            metrics={comparisonMetrics.map(m => ({
              value: m.metrics.repurchase.repurchaseRate,
              month: m.month,
              monthLabel: m.label,
              color: 'hsl(var(--primary))'
            }))}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <ComparisonMetricCard
            title="Ticket Médio Geral"
            icon={DollarSign}
            metrics={comparisonMetrics.map(m => ({
              value: m.metrics.repurchase.avgTicketRepurchase,
              month: m.month,
              monthLabel: m.label,
              color: 'hsl(var(--primary))'
            }))}
            formatValue={(v) => formatCurrency(v)}
          />
          <ComparisonMetricCard
            title="Tempo Médio até Primeira Recompra"
            icon={Clock}
            metrics={comparisonMetrics.map(m => ({
              value: m.metrics.repurchase.avgDaysToFirstRepurchase,
              month: m.month,
              monthLabel: m.label,
              color: 'hsl(var(--primary))'
            }))}
            formatValue={(v) => `${Math.round(v)} dias`}
          />
        </div>
      ) : metrics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SalesMetricCard
            title="Clientes que Iniciaram com Amostras"
            value={metrics.volume.uniqueCustomers.toLocaleString('pt-BR')}
            icon={Users}
            subtitle={
              <>
                Primeiro pedido foi apenas Kit de Amostras
                {metrics.volume.totalCustomersWithSamples > metrics.volume.uniqueCustomers && (
                  <span className="block text-xs text-muted-foreground mt-1.5 font-normal">
                    {metrics.volume.totalCustomersWithSamples.toLocaleString('pt-BR')} clientes compraram amostras no total
                  </span>
                )}
              </>
            }
            variant="success"
          />
          <SalesMetricCard
            title="Taxa de Recompra"
            value={`${metrics.repurchase.repurchaseRate.toFixed(1)}%`}
            icon={TrendingUp}
            subtitle={`${metrics.repurchase.customersWhoRepurchased} clientes recompraram`}
          />
          <SalesMetricCard
            title="Ticket Médio das Recompras"
            value={`R$ ${metrics.repurchase.avgTicketRepurchase.toFixed(2)}`}
            icon={DollarSign}
            subtitle="Excluindo pedido da amostra"
          />
          <SalesMetricCard
            title="Tempo Médio até Recompra"
            value={`${Math.round(metrics.repurchase.avgDaysToFirstRepurchase)} dias`}
            icon={Clock}
            subtitle="Primeira recompra após amostra"
          />
        </div>
      ) : null}

      {/* Tabs com análises detalhadas */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">📊 Visão Geral</TabsTrigger>
          <TabsTrigger value="repurchase">🔄 Recompra</TabsTrigger>
          <TabsTrigger value="cohort">⏱️ Coorte</TabsTrigger>
          <TabsTrigger value="crosssell">🛒 Cross-sell</TabsTrigger>
          <TabsTrigger value="profile">👤 Perfil</TabsTrigger>
          <TabsTrigger value="trends">📈 Tendências</TabsTrigger>
        </TabsList>

        {/* Aba: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Qualificados</CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.volume.uniqueCustomers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.volume.percentageOfTotal.toFixed(2)}% do total de clientes
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Iniciaram jornada com apenas amostra
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Recompra</CardTitle>
                <TrendingUp className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.repurchase.repurchaseRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.repurchase.customersWhoRepurchased} clientes recompraram
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversão para Regular</CardTitle>
                <Target className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.repurchase.conversionToRegularProduct.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Compraram produto regular após amostra
                </p>
              </CardContent>
            </Card>
          </div>

          <ConversionFunnelChart
            totalSampleCustomers={metrics.volume.uniqueCustomers}
            customersWhoRepurchased={metrics.repurchase.customersWhoRepurchased}
            loyalCustomers={metrics.segmentation.loyal}
          />
        </TabsContent>

        {/* Aba: Recompra */}
        <TabsContent value="repurchase" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa 30 dias</CardTitle>
                <Calendar className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.conversionByTime.days30.toFixed(1)}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa 60 dias</CardTitle>
                <Calendar className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.conversionByTime.days60.toFixed(1)}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa 90 dias</CardTitle>
                <Calendar className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.conversionByTime.days90.toFixed(1)}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa 180 dias</CardTitle>
                <Calendar className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.conversionByTime.days180.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Qualidade da Recompra</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Recompras por Cliente</p>
                  <p className="text-2xl font-bold">
                    {metrics.quality.avgRepurchasesPerCustomer.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">LTV Médio</p>
                  <p className="text-2xl font-bold">
                    R$ {metrics.quality.avgLTV.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <SampleProductsTable
              title="Produtos Preferidos na Recompra"
              products={metrics.quality.topRepurchaseProducts.slice(0, 5)}
            />
          </div>
        </TabsContent>

        {/* Aba: Análise de Coorte Temporal */}
        <TabsContent value="cohort" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>⏱️ Taxa de Recompra por Tempo desde Amostra</CardTitle>
              <p className="text-sm text-muted-foreground">
                Análise segmentada por quanto tempo os clientes tiveram desde a compra da amostra para recomprar
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Período</th>
                      <th className="text-right py-3 px-4 font-semibold">Clientes</th>
                      <th className="text-right py-3 px-4 font-semibold">Recompras</th>
                      <th className="text-right py-3 px-4 font-semibold">Taxa</th>
                      <th className="text-right py-3 px-4 font-semibold">Ticket Médio</th>
                      <th className="text-right py-3 px-4 font-semibold">Dias até Recompra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.cohortAnalysis.cohorts.map((cohort, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{cohort.rangeLabel}</td>
                        <td className="text-right py-3 px-4">{cohort.customerCount}</td>
                        <td className="text-right py-3 px-4">{cohort.repurchaseCount}</td>
                        <td className="text-right py-3 px-4">
                          <span className={`font-semibold ${cohort.repurchaseRate > 30 ? 'text-primary' : cohort.repurchaseRate > 15 ? 'text-warning' : 'text-muted-foreground'}`}>
                            {cohort.repurchaseRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          {cohort.avgTicket > 0 ? formatCurrency(cohort.avgTicket) : '-'}
                        </td>
                        <td className="text-right py-3 px-4">
                          {cohort.avgDaysToRepurchase > 0 ? `${Math.round(cohort.avgDaysToRepurchase)} dias` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>📊 Taxa de Recompra por Coorte</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.cohortAnalysis.cohorts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="rangeLabel" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      label={{ value: 'Taxa de Recompra (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      labelFormatter={(label) => `Período: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="repurchaseRate" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                      name="Taxa de Recompra"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>👥 Distribuição de Clientes por Coorte</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.cohortAnalysis.cohorts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="rangeLabel" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      label={{ value: 'Número de Clientes', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      labelFormatter={(label) => `Período: ${label}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="customerCount" 
                      stroke="hsl(var(--chart-1))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
                      name="Total de Clientes"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="repurchaseCount" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
                      name="Clientes que Recompraram"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">💡 Insights da Análise de Coorte</p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                    <li>Clientes mais recentes (0-30 dias) ainda não tiveram tempo suficiente para recomprar</li>
                    <li>A taxa de recompra tende a estabilizar após 90+ dias desde a amostra</li>
                    <li>Coortes com mais tempo mostram o potencial real de conversão da estratégia de amostras</li>
                    <li>Use esta análise para projetar taxas de recompra futuras de clientes novos</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Cross-sell */}
        <TabsContent value="crosssell" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Apenas Amostra</CardTitle>
                <ShoppingCart className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.crossSell.onlySample}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ticket: R$ {metrics.crossSell.avgTicketSampleOnly.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Amostra + Outros</CardTitle>
                <ShoppingCart className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.crossSell.samplePlusOthers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ticket: R$ {metrics.crossSell.avgTicketSamplePlusOthers.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tamanho Médio Cesta</CardTitle>
                <Package className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.basket.avgBasketSize.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Produtos por pedido com amostra
                </p>
              </CardContent>
            </Card>
          </div>

          <SampleProductsTable
            title="Produtos Mais Comprados com Amostra"
            products={metrics.crossSell.topProductsWithSample}
            showAvgOrderValue
          />
        </TabsContent>

        {/* Aba: Perfil */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Segmentação de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerSegmentationChart segments={segmentationData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Plataforma</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.profile.platformDistribution.map((platform, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{platform.platform}</span>
                        <span className="text-muted-foreground">{platform.count} clientes</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${(platform.count / metrics.volume.uniqueCustomers) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Métodos de Envio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {metrics.profile.shippingMethods.slice(0, 3).map((method, index) => (
                  <div key={index} className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{method.method}</p>
                    <p className="text-2xl font-bold">{method.count}</p>
                    <p className="text-xs text-muted-foreground">pedidos</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Tendências */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Vendas de Amostras</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={metrics.temporal.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return `${month}/${year.slice(2)}`;
                    }}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    labelFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return `${month}/${year}`;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Amostras Vendidas"
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Taxa de Crescimento Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.temporal.monthlyData.slice(1)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return `${month}/${year.slice(2)}`;
                    }}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                  />
                  <Line
                    type="monotone"
                    dataKey="growthRate"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    name="Crescimento %"
                    dot={{ fill: "hsl(var(--chart-2))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnaliseSamples;
