import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useCustomerData } from "@/hooks/useCustomerData";
import { Users, RefreshCcw, AlertTriangle, UserCheck, DollarSign, Calendar, TrendingUp, Info } from "lucide-react";
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

export default function ComportamentoCliente() {
  const {
    salesData,
    selectedMonth,
    availableMonths,
    comparisonMode,
    selectedMonths,
  } = useDashboard();

  const { segments, churnMetrics, summaryMetrics, isLoading: customerLoading } = useCustomerData();

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

  // Métricas de PEDIDO (volume/picos) — continuam locais, variam com filtro de mês
  const filteredOrders = useMemo(() => {
    if (salesData.length === 0) return [];
    if (!selectedMonth || selectedMonth === 'last-12-months') return salesData;
    return filterOrdersByMonth(salesData, selectedMonth, availableMonths);
  }, [salesData, selectedMonth, availableMonths]);

  const volumeAnalysisData = useMemo(() => {
    if (filteredOrders.length === 0) return null;
    return analyzeOrderVolume(filteredOrders);
  }, [filteredOrders]);

  const peaksData = useMemo(() => {
    if (filteredOrders.length === 0) return [];
    return analyzeSalesPeaks(filteredOrders).filter(p => p.isPeak);
  }, [filteredOrders]);

  // Calcular tendência de volume (período atual vs período anterior)
  const volumeTrend = useMemo(() => {
    if (salesData.length === 0 || !selectedMonth || selectedMonth === 'last-12-months') return undefined;
    const monthIndex = availableMonths.indexOf(selectedMonth);
    if (monthIndex <= 0) return undefined;
    const previousMonth = availableMonths[monthIndex - 1];
    const currentOrders = filterOrdersByMonth(salesData, selectedMonth, availableMonths);
    const previousOrders = filterOrdersByMonth(salesData, previousMonth, availableMonths);
    const currentTotal = currentOrders.length;
    const previousTotal = previousOrders.length;
    if (previousTotal === 0) return undefined;
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }, [salesData, selectedMonth, availableMonths]);

  // Peak e Low day do volume
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

  // Clientes novos vs recorrentes — do banco
  const clienteBreakdown = useMemo(() => {
    const primeiraCompraSegment = segments.find(s => s.segment === 'Primeira Compra');
    const novos = primeiraCompraSegment?.count || 0;
    const total = segments.reduce((sum, s) => sum + s.count, 0);
    return { novos, recorrentes: total - novos };
  }, [segments]);

  // Métricas de comparação multi-mês — apenas volume (métricas de pedido)
  const comparisonMetrics = useMemo(() => {
    if (!comparisonMode || selectedMonths.length === 0 || salesData.length === 0) return null;

    const volumePorMes: any[] = [];
    const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

    selectedMonths.forEach((month, index) => {
      const orders = filterOrdersByMonth(salesData, month, availableMonths);
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
  }, [comparisonMode, selectedMonths, salesData, availableMonths]);

  if (salesData.length === 0 && !customerLoading) {
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
          {/* HERO Card - Total Clientes (50% largura) */}
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

          {/* Satélites */}
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
          {/* Aviso: métricas de cliente são históricas */}
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SEÇÃO: VOLUME E PADRÕES */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <h2 className="text-xl font-semibold">Volume e Padrões</h2>
            <p className="text-sm text-muted-foreground">Evolução de pedidos e identificação de picos</p>
          </div>
        </div>

        {/* KPIs de Volume */}
        <VolumeKPICards
          averageDaily={volumeAnalysis.averageDaily}
          peakDay={volumeAnalysis.peakDay}
          lowDay={volumeAnalysis.lowDay}
          trend={volumeTrend}
        />

        {/* Gráfico de Volume */}
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

        {/* Picos de Vendas */}
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
    </div>
  );
}
