import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Users, RefreshCcw, AlertTriangle, UserCheck, DollarSign, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerSummaryCards } from "@/components/dashboard/CustomerSummaryCards";
import { ChurnFunnelChart } from "@/components/dashboard/ChurnFunnelChart";
import { OrderVolumeChart } from "@/components/dashboard/OrderVolumeChart";
import { SalesPeaksChart } from "@/components/dashboard/SalesPeaksChart";
import { CustomerSegmentationChart } from "@/components/dashboard/CustomerSegmentationChart";
import { ChurnRiskTable } from "@/components/dashboard/ChurnRiskTable";
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
            Análise de recompra, churn, volume de pedidos e picos de vendas
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

      {/* Cards resumo - MODO NORMAL COM HIERARQUIA VISUAL */}
      {!comparisonMode && behaviorMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Card Principal - Total Clientes (2x tamanho) */}
          <StatusMetricCard
            title="Total de Clientes"
            value={behaviorMetrics.totalClientes.toLocaleString('pt-BR')}
            icon={<Users className="h-4 w-4" />}
            size="large"
            status="neutral"
            benchmark={{
              value: behaviorMetrics.clientesAtivos,
              label: "Clientes Ativos",
            }}
            interpretation={`${behaviorMetrics.taxaRecompra.toFixed(1)}% taxa de recompra`}
          />

          {/* Cards Secundários */}
          <StatusMetricCard
            title="Taxa de Recompra"
            value={`${behaviorMetrics.taxaRecompra.toFixed(1)}%`}
            icon={<RefreshCcw className="h-3.5 w-3.5" />}
            status={getStatusFromBenchmark(behaviorMetrics.taxaRecompra, benchmarksPetFood.taxaRecompra)}
            benchmark={{
              value: benchmarksPetFood.taxaRecompra,
              label: "Benchmark",
            }}
            interpretation={behaviorMetrics.taxaRecompra >= benchmarksPetFood.taxaRecompra 
              ? "Acima da média do setor" 
              : "Abaixo da média do setor"}
          />

          <StatusMetricCard
            title="Taxa de Churn"
            value={`${behaviorMetrics.taxaChurn.toFixed(1)}%`}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            status={getStatusFromBenchmark(behaviorMetrics.taxaChurn, benchmarksPetFood.taxaChurn, { invertComparison: true })}
            benchmark={{
              value: benchmarksPetFood.taxaChurn,
              label: "Benchmark",
            }}
            invertTrend
            interpretation={`${behaviorMetrics.clientesChurn} clientes perdidos`}
          />

          <StatusMetricCard
            title="Clientes em Risco"
            value={behaviorMetrics.clientesEmRisco.toLocaleString('pt-BR')}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            status={behaviorMetrics.clientesEmRisco > behaviorMetrics.clientesAtivos * 0.3 ? 'warning' : 'neutral'}
            interpretation={`${((behaviorMetrics.clientesEmRisco / behaviorMetrics.totalClientes) * 100).toFixed(1)}% da base`}
          />

          <StatusMetricCard
            title="Clientes Ativos"
            value={behaviorMetrics.clientesAtivos.toLocaleString('pt-BR')}
            icon={<UserCheck className="h-3.5 w-3.5" />}
            status="success"
            interpretation={`${((behaviorMetrics.clientesAtivos / behaviorMetrics.totalClientes) * 100).toFixed(1)}% da base`}
          />

          <StatusMetricCard
            title="Clientes Inativos"
            value={behaviorMetrics.clientesInativos.toLocaleString('pt-BR')}
            icon={<Users className="h-3.5 w-3.5" />}
            interpretation="Sem compras há mais de 60 dias"
          />
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

      {/* Tabs com análises */}
      <Tabs defaultValue="churn" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="churn">🚨 Análise de Churn</TabsTrigger>
          <TabsTrigger value="volume">📊 Volume de Pedidos</TabsTrigger>
          <TabsTrigger value="peaks">⚡ Picos de Vendas</TabsTrigger>
          <TabsTrigger value="segmentation">🎯 Segmentação</TabsTrigger>
        </TabsList>

        {/* Tab 1: Análise de Churn */}
        <TabsContent value="churn" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Funil de Retenção</CardTitle>
                <CardDescription>
                  Visualize a distribuição de clientes por estágio de atividade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChurnFunnelChart
                  ativos={behaviorMetrics?.clientesAtivos || 0}
                  emRisco={behaviorMetrics?.clientesEmRisco || 0}
                  inativos={behaviorMetrics?.clientesInativos || 0}
                  churn={behaviorMetrics?.clientesChurn || 0}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Segmentação de Clientes</CardTitle>
                <CardDescription>
                  Perfil dos clientes por comportamento de compra
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CustomerSegmentationChart
                  segments={behaviorMetrics?.customerSegmentation || []}
                />
              </CardContent>
            </Card>
          </div>

          {/* Tabela de clientes em risco */}
          <Card>
            <CardHeader>
              <CardTitle>Clientes em Risco de Churn</CardTitle>
              <CardDescription>
                Top 50 clientes que não compram há mais de 30 dias, ordenados por valor total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChurnRiskTable
                customers={behaviorMetrics?.churnRiskCustomers || []}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Volume de Pedidos */}
        <TabsContent value="volume">
          <Card>
            <CardHeader>
              <CardTitle>Volume de Pedidos ao Longo do Tempo</CardTitle>
              <CardDescription>
                Acompanhe a evolução do número de pedidos
                {selectedMonth && selectedMonth !== 'last-12-months' && (
                  <span className="block text-xs text-primary mt-1">
                    📅 Período: {selectedMonth}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    className={`px-4 py-2 rounded ${volumeView === 'daily' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                    onClick={() => setVolumeView('daily')}
                  >
                    Diário
                  </button>
                  <button
                    className={`px-4 py-2 rounded ${volumeView === 'weekly' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                    onClick={() => setVolumeView('weekly')}
                  >
                    Semanal
                  </button>
                  <button
                    className={`px-4 py-2 rounded ${volumeView === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                    onClick={() => setVolumeView('monthly')}
                  >
                    Mensal
                  </button>
                </div>
                
              <OrderVolumeChart
                data={
                  volumeView === 'daily' ? filteredMetrics?.pedidosPorDia || [] :
                  volumeView === 'weekly' ? filteredMetrics?.pedidosPorSemana.map(w => ({ date: w.week, orders: w.orders })) || [] :
                  filteredMetrics?.pedidosPorMes.map(m => ({ date: m.month, orders: m.orders })) || []
                }
                viewMode={volumeView}
              />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Picos de Vendas */}
        <TabsContent value="peaks">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Picos de Vendas</CardTitle>
              <CardDescription>
                Dias com volume acima da média + 2 desvios padrão
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
        </TabsContent>

        {/* Tab 4: Segmentação */}
        <TabsContent value="segmentation">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Segmentos</CardTitle>
                <CardDescription>
                  Como seus clientes se distribuem por perfil
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
                <CardTitle>Valor por Segmento</CardTitle>
                <CardDescription>
                  Receita gerada por cada tipo de cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {behaviorMetrics?.customerSegmentation.map(segment => (
                    <div key={segment.segment} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{segment.segment}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(segment.totalRevenue)}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${segment.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {segment.count} clientes ({segment.percentage.toFixed(1)}%) • 
                        Ticket médio: {formatCurrency(segment.averageTicket)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
