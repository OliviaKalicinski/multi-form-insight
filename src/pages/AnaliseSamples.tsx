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
    return calculateAllSampleMetrics(filteredOrders);
  }, [filteredOrders]);

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
      const monthMetrics = calculateAllSampleMetrics(orders);
      
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
        <h1 className="text-3xl font-bold text-foreground">🎁 Análise de Vendas de Amostras</h1>
        <p className="text-muted-foreground">
          Análise detalhada do Kit de Amostras - Comida de Dragão
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
        <h1 className="text-3xl font-bold text-foreground">🎁 Análise de Vendas de Amostras</h1>
        <p className="text-muted-foreground">
          Análise detalhada do Kit de Amostras - Comida de Dragão
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

      {/* Cards principais */}
      {comparisonMode && comparisonMetrics ? (
        <div className="grid gap-4 md:grid-cols-2">
          <ComparisonMetricCard
            title="Total de Pedidos com Amostras"
            icon={Package}
            metrics={comparisonMetrics.map(m => ({
              value: m.metrics.volume.totalSamples,
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
            title="Pedidos com Amostras"
            value={metrics.volume.totalSamples.toLocaleString('pt-BR')}
            icon={Package}
            subtitle={`${metrics.volume.uniqueCustomers} clientes únicos`}
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">📊 Visão Geral</TabsTrigger>
          <TabsTrigger value="repurchase">🔄 Recompra</TabsTrigger>
          <TabsTrigger value="crosssell">🛒 Cross-sell</TabsTrigger>
          <TabsTrigger value="profile">👤 Perfil</TabsTrigger>
          <TabsTrigger value="trends">📈 Tendências</TabsTrigger>
        </TabsList>

        {/* Aba: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Amostras</CardTitle>
                <Package className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.volume.totalSamples}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.volume.percentageOfTotal.toFixed(2)}% do total de produtos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Únicos</CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.volume.uniqueCustomers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Compraram pelo menos 1 amostra
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
