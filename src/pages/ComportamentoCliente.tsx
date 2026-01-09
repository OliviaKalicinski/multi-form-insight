import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Users, RefreshCcw, AlertTriangle, UserCheck, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChurnFunnelChart } from "@/components/dashboard/ChurnFunnelChart";
import { OrderVolumeChart } from "@/components/dashboard/OrderVolumeChart";
import { SalesPeaksChart } from "@/components/dashboard/SalesPeaksChart";
import { CustomerSegmentationChart } from "@/components/dashboard/CustomerSegmentationChart";
import { ChurnRiskTable } from "@/components/dashboard/ChurnRiskTable";
import { SegmentRevenueChart } from "@/components/dashboard/SegmentRevenueChart";
import { SegmentDetailTable } from "@/components/dashboard/SegmentDetailTable";
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

  // Calcular métricas usando TODOS os dados (para análises históricas: churn, recompra, segmentação)
  const behaviorMetrics = useMemo(() => {
    if (salesData.length === 0) return null;
    return calculateCustomerBehaviorMetrics(salesData);
  }, [salesData]);

  // Calcular métricas filtradas (para análises de período: volume, picos)
  const filteredMetrics = useMemo(() => {
    if (salesData.length === 0 || !selectedMonth) return behaviorMetrics;
    
    const filteredOrders = selectedMonth === 'last-12-months' 
      ? salesData 
      : filterOrdersByMonth(salesData, selectedMonth, availableMonths);
    
    return calculateCustomerBehaviorMetrics(filteredOrders);
  }, [salesData, selectedMonth, availableMonths, behaviorMetrics]);

  // Calcular tendência de volume (últimos 7 dias vs 7 anteriores)
  const volumeTrend = useMemo(() => {
    if (!filteredMetrics?.pedidosPorDia || filteredMetrics.pedidosPorDia.length < 14) return undefined;
    
    const days = filteredMetrics.pedidosPorDia;
    const recent7 = days.slice(-7).reduce((sum, d) => sum + d.orders, 0);
    const previous7 = days.slice(-14, -7).reduce((sum, d) => sum + d.orders, 0);
    
    if (previous7 === 0) return undefined;
    return ((recent7 - previous7) / previous7) * 100;
  }, [filteredMetrics]);

  // Peak e Low day do volume
  const volumeAnalysis = useMemo(() => {
    if (!filteredMetrics?.pedidosPorDia || filteredMetrics.pedidosPorDia.length === 0) {
      return { peakDay: { date: '', orders: 0 }, lowDay: { date: '', orders: 0 }, averageDaily: 0 };
    }
    
    const days = filteredMetrics.pedidosPorDia;
    const peakDay = days.reduce((max, curr) => curr.orders > max.orders ? curr : max, days[0]);
    const lowDay = days.reduce((min, curr) => curr.orders < min.orders ? curr : min, days[0]);
    const averageDaily = days.reduce((sum, d) => sum + d.orders, 0) / days.length;
    
    return { peakDay, lowDay, averageDaily };
  }, [filteredMetrics]);

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
    const inicianteSegment = behaviorMetrics.customerSegmentation.find(s => s.segment === 'Iniciante');
    const novos = inicianteSegment?.count || 0;
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
              💡 <strong>Nota:</strong> As métricas de <strong>Churn</strong>, <strong>Taxa de Recompra</strong> e <strong>Segmentação</strong> 
              usam o histórico completo de dados. As análises de <strong>Volume de Pedidos</strong> e <strong>Picos de Vendas</strong> 
              consideram o período selecionado no filtro global.
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
            />

            <StatusMetricCard
              title="Taxa Churn"
              value={`${behaviorMetrics.taxaChurn.toFixed(1)}%`}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              status={getStatusFromBenchmark(behaviorMetrics.taxaChurn, benchmarksPetFood.taxaChurn, { invertComparison: true })}
              invertTrend
              interpretation={`${behaviorMetrics.clientesChurn} perdidos`}
              size="compact"
            />

            <StatusMetricCard
              title="CLV"
              value={formatCurrency(behaviorMetrics.customerLifetimeValue)}
              icon={<DollarSign className="h-3.5 w-3.5" />}
              status="success"
              interpretation="Valor por cliente"
              size="compact"
            />

            <StatusMetricCard
              title="Ativos"
              value={behaviorMetrics.clientesAtivos.toLocaleString('pt-BR')}
              icon={<UserCheck className="h-3.5 w-3.5" />}
              status="success"
              interpretation={`${((behaviorMetrics.clientesAtivos / behaviorMetrics.totalClientes) * 100).toFixed(0)}% da base`}
              size="compact"
            />

            <StatusMetricCard
              title="Em Risco"
              value={behaviorMetrics.clientesEmRisco.toLocaleString('pt-BR')}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              status={behaviorMetrics.clientesEmRisco > behaviorMetrics.clientesAtivos * 0.3 ? 'warning' : 'neutral'}
              interpretation="31-60 dias"
              size="compact"
            />

            <StatusMetricCard
              title="Inativos"
              value={behaviorMetrics.clientesInativos.toLocaleString('pt-BR')}
              icon={<Calendar className="h-3.5 w-3.5" />}
              status="neutral"
              interpretation="61-90 dias"
              size="compact"
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
      {/* SEÇÃO 1: SEGMENTAÇÃO DE CLIENTES */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <h2 className="text-xl font-semibold">Segmentação de Clientes</h2>
            <p className="text-sm text-muted-foreground">Distribuição por comportamento de compra</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Clientes</CardTitle>
              <CardDescription>
                Segmentação por comportamento de compra
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerSegmentationChart
                segments={behaviorMetrics?.customerSegmentation || []}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Receita por Segmento</CardTitle>
              <CardDescription>
                Contribuição de cada perfil para o faturamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SegmentRevenueChart
                segments={behaviorMetrics?.customerSegmentation || []}
              />
            </CardContent>
          </Card>
        </div>

        {/* Tabela detalhada de segmentos */}
        <Card>
          <CardHeader>
            <CardTitle>Análise Detalhada por Segmento</CardTitle>
            <CardDescription>
              Métricas completas de cada perfil de cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SegmentDetailTable
              segments={behaviorMetrics?.customerSegmentation || []}
            />
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SEÇÃO 2: VOLUME E PADRÕES */}
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
                volumeView === 'daily' ? filteredMetrics?.pedidosPorDia || [] :
                volumeView === 'weekly' ? filteredMetrics?.pedidosPorSemana.map(w => ({ date: w.week, orders: w.orders })) || [] :
                filteredMetrics?.pedidosPorMes.map(m => ({ date: m.month, orders: m.orders })) || []
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
              peaks={filteredMetrics?.picosVendas || []}
            />
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SEÇÃO 3: ANÁLISE DE CHURN */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <h2 className="text-xl font-semibold">Análise de Churn</h2>
            <p className="text-sm text-muted-foreground">Monitoramento de retenção e clientes em risco</p>
          </div>
        </div>

        {/* Funil de Retenção */}
        <Card>
          <CardHeader>
            <CardTitle>Funil de Retenção</CardTitle>
            <CardDescription>
              Distribuição de clientes por estágio de atividade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ChurnFunnelChart
                ativos={behaviorMetrics?.clientesAtivos || 0}
                emRisco={behaviorMetrics?.clientesEmRisco || 0}
                inativos={behaviorMetrics?.clientesInativos || 0}
                churn={behaviorMetrics?.clientesChurn || 0}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela de clientes em risco */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes em Risco de Churn</CardTitle>
            <CardDescription>
              Clientes que não compram há mais de 30 dias, ordenados por valor total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChurnRiskTable
              customers={behaviorMetrics?.churnRiskCustomers || []}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
