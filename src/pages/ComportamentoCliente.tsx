import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Users, RefreshCcw, AlertTriangle, UserCheck, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderVolumeChart } from "@/components/dashboard/OrderVolumeChart";
import { SalesPeaksChart } from "@/components/dashboard/SalesPeaksChart";
import { VolumeKPICards } from "@/components/dashboard/VolumeKPICards";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { StatusMetricCard, getStatusFromBenchmark } from "@/components/dashboard/StatusMetricCard";
import { calculateCustomerBehaviorMetrics } from "@/utils/customerBehaviorMetrics";
import { formatCurrency, filterOrdersByMonth } from "@/utils/salesCalculator";
import { benchmarksPetFood } from "@/data/executiveData";
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

  const [volumeView, setVolumeView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

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

  // Calcular métricas com base no filtro selecionado
  const behaviorMetrics = useMemo(() => {
    if (salesData.length === 0) return null;
    
    // Se nenhum mês selecionado, usar todos os dados
    if (!selectedMonth) {
      return calculateCustomerBehaviorMetrics(salesData);
    }
    
    // Filtrar por mês selecionado
    const filteredOrders = selectedMonth === 'last-12-months' 
      ? salesData 
      : filterOrdersByMonth(salesData, selectedMonth, availableMonths);
    
    if (filteredOrders.length === 0) return null;
    
    return calculateCustomerBehaviorMetrics(filteredOrders);
  }, [salesData, selectedMonth, availableMonths]);

  // Calcular tendência de volume (período atual vs período anterior)
  const volumeTrend = useMemo(() => {
    if (salesData.length === 0) return undefined;
    
    // Se não tem mês selecionado ou é "todos", não calcular tendência
    if (!selectedMonth || selectedMonth === 'last-12-months') return undefined;
    
    // Encontrar índice do mês selecionado
    const monthIndex = availableMonths.indexOf(selectedMonth);
    if (monthIndex <= 0) return undefined; // Não tem mês anterior
    
    const previousMonth = availableMonths[monthIndex - 1];
    
    // Filtrar pedidos do mês atual e anterior
    const currentOrders = filterOrdersByMonth(salesData, selectedMonth, availableMonths);
    const previousOrders = filterOrdersByMonth(salesData, previousMonth, availableMonths);
    
    // Calcular totais
    const currentTotal = currentOrders.length;
    const previousTotal = previousOrders.length;
    
    if (previousTotal === 0) return undefined;
    
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }, [salesData, selectedMonth, availableMonths]);

  // Peak e Low day do volume
  const volumeAnalysis = useMemo(() => {
    if (!behaviorMetrics?.pedidosPorDia || behaviorMetrics.pedidosPorDia.length === 0) {
      return { peakDay: { date: '', orders: 0 }, lowDay: { date: '', orders: 0 }, averageDaily: 0 };
    }
    
    const days = behaviorMetrics.pedidosPorDia;
    const peakDay = days.reduce((max, curr) => curr.orders > max.orders ? curr : max, days[0]);
    const lowDay = days.reduce((min, curr) => curr.orders < min.orders ? curr : min, days[0]);
    const averageDaily = days.reduce((sum, d) => sum + d.orders, 0) / days.length;
    
    return { peakDay, lowDay, averageDaily };
  }, [behaviorMetrics]);

  // Métricas de comparação multi-mês
  const comparisonMetrics = useMemo(() => {
    if (!comparisonMode || selectedMonths.length === 0 || salesData.length === 0) {
      return null;
    }

    const totalClientes: any[] = [];
    const taxaRecompra: any[] = [];
    const clientesAtivos: any[] = [];
    const receitaPorCliente: any[] = [];

    const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

    selectedMonths.forEach((month, index) => {
      const filteredOrders = filterOrdersByMonth(salesData, month, availableMonths);
      const metrics = calculateCustomerBehaviorMetrics(filteredOrders);
      
      if (metrics) {
        const monthLabel = format(
          parse(month, "yyyy-MM", new Date()), 
          "MMM yyyy", 
          { locale: ptBR }
        );
        
        const color = COLORS[index % COLORS.length];

        totalClientes.push({
          month,
          monthLabel,
          value: metrics.totalClientes,
          color,
        });

        taxaRecompra.push({
          month,
          monthLabel,
          value: metrics.taxaRecompra,
          color,
        });

        clientesAtivos.push({
          month,
          monthLabel,
          value: metrics.clientesAtivos,
          color,
        });

        const avgRevenuePerCustomer = metrics.totalClientes > 0 
          ? (filteredOrders.reduce((sum: number, o: any) => sum + o.valorTotal, 0) / metrics.totalClientes)
          : 0;

        receitaPorCliente.push({
          month,
          monthLabel,
          value: avgRevenuePerCustomer,
          color,
        });
      }
    });

    // Calcular variações percentuais
    if (totalClientes.length > 1) {
      const base = totalClientes[0].value;
      totalClientes.forEach((item, idx) => {
        if (idx > 0 && base > 0) {
          item.percentageChange = ((item.value - base) / base) * 100;
        }
      });
    }

    if (taxaRecompra.length > 1) {
      const base = taxaRecompra[0].value;
      taxaRecompra.forEach((item, idx) => {
        if (idx > 0 && base > 0) {
          item.percentageChange = ((item.value - base) / base) * 100;
        }
      });
    }

    if (clientesAtivos.length > 1) {
      const base = clientesAtivos[0].value;
      clientesAtivos.forEach((item, idx) => {
        if (idx > 0 && base > 0) {
          item.percentageChange = ((item.value - base) / base) * 100;
        }
      });
    }

    if (receitaPorCliente.length > 1) {
      const base = receitaPorCliente[0].value;
      receitaPorCliente.forEach((item, idx) => {
        if (idx > 0 && base > 0) {
          item.percentageChange = ((item.value - base) / base) * 100;
        }
      });
    }

    return { totalClientes, taxaRecompra, clientesAtivos, receitaPorCliente };
  }, [comparisonMode, selectedMonths, salesData, availableMonths]);

  // Calcular clientes novos vs recorrentes
  const clienteBreakdown = useMemo(() => {
    if (!behaviorMetrics) return { novos: 0, recorrentes: 0 };
    const primeiraCompraSegment = behaviorMetrics.customerSegmentation.find(s => s.segment === 'Primeira Compra');
    const novos = primeiraCompraSegment?.count || 0;
    return { novos, recorrentes: behaviorMetrics.totalClientes - novos };
  }, [behaviorMetrics]);

  if (salesData.length === 0) {
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
              💡 <strong>Período:</strong> Exibindo dados de <strong>{formatSelectedPeriod()}</strong>.
              {selectedMonth && ' Use o filtro acima para alterar o período ou ativar comparação entre meses.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cards resumo - HERO + SATÉLITES */}
      {!comparisonMode && behaviorMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* HERO Card - Total Clientes (50% largura) */}
          <Card className="md:col-span-3 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total de Clientes
                  </p>
                  <p className="text-5xl font-bold mt-2">{behaviorMetrics.totalClientes.toLocaleString('pt-BR')}</p>
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
                  <p className="text-2xl font-bold text-primary">{formatCurrency(behaviorMetrics.customerLifetimeValue)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    ~{behaviorMetrics.averageDaysBetweenPurchases.toFixed(0)} dias entre compras
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Satélites (50% largura - 6 cards em 2 linhas de 3) */}
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatusMetricCard
              title="Taxa Recompra"
              value={`${behaviorMetrics.taxaRecompra.toFixed(1)}%`}
              icon={<RefreshCcw className="h-3.5 w-3.5" />}
              status={getStatusFromBenchmark(behaviorMetrics.taxaRecompra, benchmarksPetFood.taxaRecompra)}
              interpretation={behaviorMetrics.taxaRecompra >= benchmarksPetFood.taxaRecompra ? "Acima benchmark" : "Abaixo benchmark"}
              size="compact"
              tooltipKey="taxa_recompra"
            />

            <StatusMetricCard
              title="Taxa Churn"
              value={`${behaviorMetrics.taxaChurn.toFixed(1)}%`}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              status={getStatusFromBenchmark(behaviorMetrics.taxaChurn, benchmarksPetFood.taxaChurn, { invertComparison: true })}
              invertTrend
              interpretation={`${behaviorMetrics.clientesChurn} perdidos`}
              size="compact"
              tooltipKey="taxa_churn"
            />

            <StatusMetricCard
              title="CLV"
              value={formatCurrency(behaviorMetrics.customerLifetimeValue)}
              icon={<DollarSign className="h-3.5 w-3.5" />}
              status="success"
              interpretation="Valor por cliente"
              size="compact"
              tooltipKey="clv"
            />

            <StatusMetricCard
              title="Ativos"
              value={behaviorMetrics.clientesAtivos.toLocaleString('pt-BR')}
              icon={<UserCheck className="h-3.5 w-3.5" />}
              status="success"
              interpretation={`${((behaviorMetrics.clientesAtivos / behaviorMetrics.totalClientes) * 100).toFixed(0)}% da base`}
              size="compact"
              tooltipKey="clientes_ativos"
            />

            <StatusMetricCard
              title="Em Risco"
              value={behaviorMetrics.clientesEmRisco.toLocaleString('pt-BR')}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              status={behaviorMetrics.clientesEmRisco > behaviorMetrics.clientesAtivos * 0.3 ? 'warning' : 'neutral'}
              interpretation="31-60 dias"
              size="compact"
              tooltipKey="clientes_em_risco"
            />

            <StatusMetricCard
              title="Inativos"
              value={behaviorMetrics.clientesInativos.toLocaleString('pt-BR')}
              icon={<Calendar className="h-3.5 w-3.5" />}
              status="neutral"
              interpretation="61-90 dias"
              size="compact"
              tooltipKey="clientes_inativos"
            />
          </div>
        </div>
      )}

      {/* Cards de comparação multi-mês */}
      {comparisonMode && comparisonMetrics && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ComparisonMetricCard
            title="Total de Clientes"
            icon={Users}
            metrics={comparisonMetrics.totalClientes}
          />
          <ComparisonMetricCard
            title="Taxa de Recompra (%)"
            icon={RefreshCcw}
            metrics={comparisonMetrics.taxaRecompra}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <ComparisonMetricCard
            title="Clientes Ativos"
            icon={UserCheck}
            metrics={comparisonMetrics.clientesAtivos}
          />
          <ComparisonMetricCard
            title="Receita por Cliente"
            icon={DollarSign}
            metrics={comparisonMetrics.receitaPorCliente}
            formatValue={(v) => formatCurrency(v)}
          />
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
                <button
                  className={`px-4 py-2 rounded text-sm ${volumeView === 'daily' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                  onClick={() => setVolumeView('daily')}
                >
                  Diário
                </button>
                <button
                  className={`px-4 py-2 rounded text-sm ${volumeView === 'weekly' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                  onClick={() => setVolumeView('weekly')}
                >
                  Semanal
                </button>
                <button
                  className={`px-4 py-2 rounded text-sm ${volumeView === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                  onClick={() => setVolumeView('monthly')}
                >
                  Mensal
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <OrderVolumeChart
              data={
                volumeView === 'daily' ? behaviorMetrics?.pedidosPorDia || [] :
                volumeView === 'weekly' ? behaviorMetrics?.pedidosPorSemana.map(w => ({ date: w.week, orders: w.orders })) || [] :
                behaviorMetrics?.pedidosPorMes.map(m => ({ date: m.month, orders: m.orders })) || []
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
            <SalesPeaksChart
              peaks={behaviorMetrics?.picosVendas || []}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
