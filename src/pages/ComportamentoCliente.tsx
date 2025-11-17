import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerSummaryCards } from "@/components/dashboard/CustomerSummaryCards";
import { ChurnFunnelChart } from "@/components/dashboard/ChurnFunnelChart";
import { OrderVolumeChart } from "@/components/dashboard/OrderVolumeChart";
import { SalesPeaksChart } from "@/components/dashboard/SalesPeaksChart";
import { CustomerSegmentationChart } from "@/components/dashboard/CustomerSegmentationChart";
import { ChurnRiskTable } from "@/components/dashboard/ChurnRiskTable";
import { ComparisonToggle } from "@/components/dashboard/ComparisonToggle";
import { MonthFilter } from "@/components/dashboard/MonthFilter";
import { MonthComparisonSelector } from "@/components/dashboard/MonthComparisonSelector";
import { calculateCustomerBehaviorMetrics } from "@/utils/customerBehaviorMetrics";
import { formatCurrency, filterOrdersByMonth } from "@/utils/salesCalculator";

export default function ComportamentoCliente() {
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
      : filterOrdersByMonth(salesData, selectedMonth);
    
    return calculateCustomerBehaviorMetrics(filteredOrders);
  }, [salesData, selectedMonth, behaviorMetrics]);

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
              Carregue os dados de vendas na página "Visão Geral" para visualizar as análises de comportamento.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">👥 Comportamento do Cliente</h1>
            <p className="text-muted-foreground">
              Análise de recompra, churn, volume de pedidos e picos de vendas
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        {comparisonMode ? (
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
        )}
        <ComparisonToggle 
          enabled={comparisonMode} 
          onToggle={setComparisonMode} 
        />
      </div>

      {/* Indicador de período */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="py-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 <strong>Nota:</strong> As métricas de <strong>Churn</strong>, <strong>Taxa de Recompra</strong> e <strong>Segmentação</strong> 
            usam o histórico completo de dados. As análises de <strong>Volume de Pedidos</strong> e <strong>Picos de Vendas</strong> 
            consideram o período selecionado no filtro acima.
          </p>
        </CardContent>
      </Card>

      {/* Cards resumo */}
      {behaviorMetrics && (
        <CustomerSummaryCards metrics={behaviorMetrics} />
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
