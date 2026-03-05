import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useCustomerData } from "@/hooks/useCustomerData";
import { Users, RefreshCcw, AlertTriangle, UserCheck, DollarSign, Calendar, TrendingUp, Info, UserMinus, TrendingDown, FileWarning, PieChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderVolumeChart } from "@/components/dashboard/OrderVolumeChart";
import { SalesPeaksChart } from "@/components/dashboard/SalesPeaksChart";
import { VolumeKPICards } from "@/components/dashboard/VolumeKPICards";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { StatusMetricCard, getStatusFromBenchmark } from "@/components/dashboard/StatusMetricCard";
import { analyzeOrderVolume, analyzeSalesPeaks } from "@/utils/customerBehaviorMetrics";
import { formatCurrency, filterOrdersByMonth } from "@/utils/salesCalculator";
import { benchmarksPetFood } from "@/data/executiveData";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerSegmentationChart } from "@/components/dashboard/CustomerSegmentationChart";
import { SegmentRevenueChart } from "@/components/dashboard/SegmentRevenueChart";
import { SegmentDetailTable } from "@/components/dashboard/SegmentDetailTable";
import { ChurnFunnelChart } from "@/components/dashboard/ChurnFunnelChart";
import { ChurnRiskTable } from "@/components/dashboard/ChurnRiskTable";
import { KPITooltip } from "@/components/dashboard/KPITooltip";
import { EmptyState } from "@/components/EmptyState";
import { getB2COrders } from "@/utils/revenue";

export default function ComportamentoCliente() {
  const {
    salesData,
    selectedMonth,
    availableMonths,
    comparisonMode,
    selectedMonths,
  } = useDashboard();

  const { segments, churnMetrics, churnRiskCustomers, summaryMetrics, isLoading: customerLoading } = useCustomerData();

  const b2cSalesData = useMemo(() => getB2COrders(salesData), [salesData]);

  const [volumeView, setVolumeView] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('daily');

  // Helper para formatar o label do mês selecionado
  const formatSelectedPeriod = () => {
    if (!selectedMonth) return 'todos os períodos';
    if (selectedMonth === 'last-12-months') return 'últimos 12 meses';
    try {
      return format(parse(selectedMonth, "yyyy-MM", new Date()), "MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return selectedMonth;
    }
  };

  const filteredOrders = useMemo(() => {
    if (b2cSalesData.length === 0) return [];
    if (!selectedMonth || selectedMonth === 'last-12-months') return b2cSalesData;
    return filterOrdersByMonth(b2cSalesData, selectedMonth, availableMonths);
  }, [b2cSalesData, selectedMonth, availableMonths]);

  const volumeAnalysisData = useMemo(() => {
    if (filteredOrders.length === 0) return null;
    return analyzeOrderVolume(filteredOrders);
  }, [filteredOrders]);

  const peaksData = useMemo(() => {
    if (filteredOrders.length === 0) return [];
    return analyzeSalesPeaks(filteredOrders).filter(p => p.isPeak);
  }, [filteredOrders]);

  const volumeTrend = useMemo(() => {
    if (b2cSalesData.length === 0 || !selectedMonth || selectedMonth === 'last-12-months') return undefined;
    const monthIndex = availableMonths.indexOf(selectedMonth);
    if (monthIndex <= 0) return undefined;
    const previousMonth = availableMonths[monthIndex - 1];
    const currentOrders = filterOrdersByMonth(b2cSalesData, selectedMonth, availableMonths);
    const previousOrders = filterOrdersByMonth(b2cSalesData, previousMonth, availableMonths);
    const currentTotal = currentOrders.length;
    const previousTotal = previousOrders.length;
    if (previousTotal === 0) return undefined;
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }, [b2cSalesData, selectedMonth, availableMonths]);

  const volumeAnalysis = useMemo(() => {
    if (!volumeAnalysisData?.daily || volumeAnalysisData.daily.length === 0) {
      return { peakDay: { date: '', orders: 0 }, lowDay: { date: '', orders: 0 }, averageDaily: 0 };
    }
    const days = volumeAnalysisData.daily;
    const peakDay = days.reduce((max, curr) => curr.orders > max.orders ? curr : max, days[0]);
    const lowDay = days.reduce((min, curr) => curr.orders < min.orders ? curr : min, days[0]);
    const averageDaily = days.reduce((sum, d) => sum + d.orders, 0) / days.length;
    return { peakDay, lowDay, averageDaily };
  }, [volumeAnalysisData]);

  const clienteBreakdown = useMemo(() => {
    const primeiraCompraSegment = segments.find(s => s.segment === 'Primeira Compra');
    const novos = primeiraCompraSegment?.count || 0;
    const total = segments.reduce((sum, s) => sum + s.count, 0);
    return { novos, recorrentes: total - novos };
  }, [segments]);

  const comparisonMetrics = useMemo(() => {
    if (!comparisonMode || selectedMonths.length === 0 || b2cSalesData.length === 0) return null;

    const volumePorMes: any[] = [];
    const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

    selectedMonths.forEach((month, index) => {
      const orders = filterOrdersByMonth(b2cSalesData, month, availableMonths);
      const monthLabel = format(parse(month, "yyyy-MM", new Date()), "MMM yyyy", { locale: ptBR });
      const color = COLORS[index % COLORS.length];
      volumePorMes.push({ month, monthLabel, value: orders.length, color });
    });

    if (volumePorMes.length > 1) {
      const base = volumePorMes[0].value;
      volumePorMes.forEach((item, idx) => {
        if (idx > 0 && base > 0) item.percentageChange = ((item.value - base) / base) * 100;
      });
    }

    return { volumePorMes };
  }, [comparisonMode, selectedMonths, b2cSalesData, availableMonths]);

  if (b2cSalesData.length === 0 && !customerLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6" />
              👥 Comportamento do Cliente
            </CardTitle>
            <CardDescription>
              Carregue os dados de vendas na página "Upload" para visualizar as análises de comportamento.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const totalClientes = churnMetrics.totalClientes;
  const { totalClientes: _, clientesAtivos, clientesEmRisco, clientesInativos, clientesChurn, taxaChurn } = churnMetrics;
  const valorEmRisco = churnRiskCustomers.reduce((sum, c) => sum + c.valorTotal, 0);

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">👥 Comportamento do Cliente</h1>
          <p className="text-muted-foreground">
            Análise de recompra, churn, volume de pedidos e segmentação
          </p>
        </div>
      </div>

      <Tabs defaultValue="comportamento">
        <TabsList>
          <TabsTrigger value="comportamento">Comportamento</TabsTrigger>
          <TabsTrigger value="segmentos">Segmentos</TabsTrigger>
          <TabsTrigger value="churn">Risco de Churn</TabsTrigger>
        </TabsList>

        {/* ── ABA 1: Comportamento (conteúdo original) ── */}
        <TabsContent value="comportamento" className="space-y-8">
          {/* Indicador de período */}
          {!comparisonMode && (
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="py-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>Métricas de cliente:</strong> todo o histórico (banco de dados).
                  <strong> Volume de pedidos:</strong> {formatSelectedPeriod()}.
                  {selectedMonth && ' Use o filtro acima para alterar o período de volume.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Cards resumo - HERO + SATÉLITES */}
          {!comparisonMode && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <Card className="md:col-span-3 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  {customerLoading ? (
                    <Skeleton className="h-32" />
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Total de Clientes
                        </p>
                        <p className="text-5xl font-bold mt-2">{totalClientes.toLocaleString('pt-BR')}</p>
                        <div className="flex gap-4 mt-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            <span className="text-muted-foreground">Novos: <strong>{clienteBreakdown.novos}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-muted-foreground">Recorrentes: <strong>{clienteBreakdown.recorrentes}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">CLV Médio</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(summaryMetrics.customerLifetimeValue)}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          ~{summaryMetrics.averageDaysBetweenPurchases.toFixed(0)} dias entre compras
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {customerLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)
                ) : (
                  <>
                    <StatusMetricCard
                      title="Taxa Recompra"
                      value={`${summaryMetrics.taxaRecompra.toFixed(1)}%`}
                      icon={<RefreshCcw className="h-3.5 w-3.5" />}
                      status={getStatusFromBenchmark(summaryMetrics.taxaRecompra, benchmarksPetFood.taxaRecompra)}
                      interpretation={summaryMetrics.taxaRecompra >= benchmarksPetFood.taxaRecompra ? "Acima benchmark" : "Abaixo benchmark"}
                      size="compact"
                      tooltipKey="taxa_recompra"
                    />
                    <StatusMetricCard
                      title="Taxa Churn"
                      value={`${churnMetrics.taxaChurn.toFixed(1)}%`}
                      icon={<AlertTriangle className="h-3.5 w-3.5" />}
                      status={getStatusFromBenchmark(churnMetrics.taxaChurn, benchmarksPetFood.taxaChurn, { invertComparison: true })}
                      invertTrend
                      interpretation={`${churnMetrics.clientesChurn} perdidos`}
                      size="compact"
                      tooltipKey="taxa_churn"
                    />
                    <StatusMetricCard
                      title="CLV"
                      value={formatCurrency(summaryMetrics.customerLifetimeValue)}
                      icon={<DollarSign className="h-3.5 w-3.5" />}
                      status="success"
                      interpretation="Valor por cliente"
                      size="compact"
                      tooltipKey="clv"
                    />
                    <StatusMetricCard
                      title="Ativos"
                      value={churnMetrics.clientesAtivos.toLocaleString('pt-BR')}
                      icon={<UserCheck className="h-3.5 w-3.5" />}
                      status="success"
                      interpretation={`${totalClientes > 0 ? ((churnMetrics.clientesAtivos / totalClientes) * 100).toFixed(0) : 0}% da base`}
                      size="compact"
                      tooltipKey="clientes_ativos"
                    />
                    <StatusMetricCard
                      title="Em Risco"
                      value={churnMetrics.clientesEmRisco.toLocaleString('pt-BR')}
                      icon={<AlertTriangle className="h-3.5 w-3.5" />}
                      status={churnMetrics.clientesEmRisco > churnMetrics.clientesAtivos * 0.3 ? 'warning' : 'neutral'}
                      interpretation="31-60 dias"
                      size="compact"
                      tooltipKey="clientes_em_risco"
                    />
                    <StatusMetricCard
                      title="Inativos"
                      value={churnMetrics.clientesInativos.toLocaleString('pt-BR')}
                      icon={<Calendar className="h-3.5 w-3.5" />}
                      status="neutral"
                      interpretation="61-90 dias"
                      size="compact"
                      tooltipKey="clientes_inativos"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Cards de comparação multi-mês */}
          {comparisonMode && comparisonMetrics && (
            <div className="space-y-4">
              <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <CardContent className="py-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Métricas de cliente (recompra, churn, segmentação) são históricas e não variam por mês. Apenas volume de pedidos é comparado.
                  </p>
                </CardContent>
              </Card>
              <div className="grid gap-6 md:grid-cols-2">
                <ComparisonMetricCard
                  title="Volume de Pedidos"
                  icon={TrendingUp}
                  metrics={comparisonMetrics.volumePorMes}
                />
              </div>
            </div>
          )}

          {/* SEÇÃO: VOLUME E PADRÕES */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <h2 className="text-xl font-semibold">Volume e Padrões</h2>
                <p className="text-sm text-muted-foreground">Evolução de pedidos e identificação de picos</p>
              </div>
            </div>

            <VolumeKPICards
              averageDaily={volumeAnalysis.averageDaily}
              peakDay={volumeAnalysis.peakDay}
              lowDay={volumeAnalysis.lowDay}
              trend={volumeTrend}
            />

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Evolução de Pedidos</CardTitle>
                    <CardDescription>
                      Volume de pedidos ao longo do tempo
                      {selectedMonth && selectedMonth !== 'last-12-months' && (
                        <span className="block text-xs text-primary mt-1">
                          📅 Período: {selectedMonth}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {(['daily', 'weekly', 'monthly', 'quarterly'] as const).map(view => (
                      <button
                        key={view}
                        className={`px-4 py-2 rounded text-sm ${volumeView === view ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                        onClick={() => setVolumeView(view)}
                      >
                        {view === 'daily' ? 'Diário' : view === 'weekly' ? 'Semanal' : view === 'monthly' ? 'Mensal' : 'Trimestre'}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <OrderVolumeChart
                  data={
                    volumeView === 'daily' ? volumeAnalysisData?.daily || [] :
                    volumeView === 'weekly' ? volumeAnalysisData?.weekly.map(w => ({ date: w.week, orders: w.orders })) || [] :
                    volumeView === 'quarterly' ? volumeAnalysisData?.quarterly.map(q => ({ date: q.quarter, orders: q.orders })) || [] :
                    volumeAnalysisData?.monthly.map(m => ({ date: m.month, orders: m.orders })) || []
                  }
                  viewMode={volumeView}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>⚡ Dias de Pico</CardTitle>
                <CardDescription>
                  Top 20 dias com maior volume - destaque para picos acima da média + 2σ
                  {selectedMonth && selectedMonth !== 'last-12-months' && (
                    <span className="block text-xs text-primary mt-1">
                      📅 Período: {selectedMonth}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SalesPeaksChart peaks={peaksData} />
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        {/* ── ABA 2: Segmentos ── */}
        <TabsContent value="segmentos" className="space-y-8">
          {customerLoading ? (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
              </div>
              <Skeleton className="h-64" />
            </div>
          ) : segments.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-6 h-6" />
                  🎯 Segmentação de Clientes
                </CardTitle>
                <CardDescription>
                  Carregue os dados de vendas na página "Upload" para visualizar a segmentação de clientes.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="py-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Período:</strong> Exibindo dados de <strong>todo o histórico</strong> (fonte: banco de dados).
                  </p>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição de Clientes</CardTitle>
                    <CardDescription>Segmentação por comportamento de compra</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CustomerSegmentationChart segments={segments} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Receita por Segmento</CardTitle>
                    <CardDescription>Contribuição de cada perfil para o faturamento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SegmentRevenueChart segments={segments} />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Análise Detalhada por Segmento</CardTitle>
                  <CardDescription>Métricas completas de cada perfil de cliente</CardDescription>
                </CardHeader>
                <CardContent>
                  <SegmentDetailTable segments={segments} />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── ABA 3: Risco de Churn ── */}
        <TabsContent value="churn" className="space-y-6">
          {customerLoading ? (
            <div className="space-y-6">
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
              </div>
              <Skeleton className="h-80" />
            </div>
          ) : churnMetrics.totalClientes === 0 ? (
            <EmptyState
              icon={<FileWarning className="h-8 w-8 text-muted-foreground" />}
              title="Sem dados de clientes"
              description="Faça upload de dados de vendas para visualizar a análise de churn."
            />
          ) : (
            <>
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  📅 <strong>Período:</strong> Todo o histórico (fonte: banco de dados)
                </p>
              </div>

              <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                <KPITooltip metricKey="taxa_churn">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        Taxa de Churn
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        {taxaChurn.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Clientes que pararam de comprar</p>
                    </CardContent>
                  </Card>
                </KPITooltip>

                <KPITooltip metricKey="clientes_ativos">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Clientes Ativos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {clientesAtivos.toLocaleString('pt-BR')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {totalClientes > 0 ? ((clientesAtivos / totalClientes) * 100).toFixed(1) : 0}% da base
                      </p>
                    </CardContent>
                  </Card>
                </KPITooltip>

                <KPITooltip metricKey="clientes_em_risco">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Em Risco
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-600">
                        {clientesEmRisco.toLocaleString('pt-BR')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {totalClientes > 0 ? ((clientesEmRisco / totalClientes) * 100).toFixed(1) : 0}% da base
                      </p>
                    </CardContent>
                  </Card>
                </KPITooltip>

                <KPITooltip metricKey="clientes_inativos">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <UserMinus className="h-4 w-4" />
                        Inativos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {clientesInativos.toLocaleString('pt-BR')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {totalClientes > 0 ? ((clientesInativos / totalClientes) * 100).toFixed(1) : 0}% da base
                      </p>
                    </CardContent>
                  </Card>
                </KPITooltip>

                <KPITooltip metricKey="valor_em_risco">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Valor em Risco
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        R$ {valorEmRisco.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Receita potencial perdida</p>
                    </CardContent>
                  </Card>
                </KPITooltip>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Funil de Retenção
                  </CardTitle>
                  <CardDescription>Distribuição de clientes por status de atividade</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ChurnFunnelChart
                    ativos={clientesAtivos}
                    emRisco={clientesEmRisco}
                    inativos={clientesInativos}
                    churn={clientesChurn}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Clientes em Risco de Churn
                  </CardTitle>
                  <CardDescription>Lista de clientes que podem abandonar a marca</CardDescription>
                </CardHeader>
                <CardContent>
                  {churnRiskCustomers.length > 0 ? (
                    <ChurnRiskTable customers={churnRiskCustomers} />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum cliente em risco identificado.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
