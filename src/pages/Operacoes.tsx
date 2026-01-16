import { useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Package, Truck, Clock, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { ShippingMethodsChart } from "@/components/dashboard/ShippingMethodsChart";
import { NFIssuanceChart } from "@/components/dashboard/NFIssuanceChart";
import { LogisticsKPICards } from "@/components/dashboard/LogisticsKPICards";
import { KPITooltip } from "@/components/dashboard/KPITooltip";
import { calculateProductOperationsMetrics } from "@/utils/productOperationsMetrics";
import { filterOrdersByMonth, formatCurrency } from "@/utils/salesCalculator";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Operacoes() {
  const {
    salesData,
    selectedMonth,
    availableMonths,
    comparisonMode,
    selectedMonths,
  } = useDashboard();

  const productMetrics = useMemo(() => {
    if (salesData.length === 0) return null;
    
    const filteredOrders = selectedMonth 
      ? filterOrdersByMonth(salesData, selectedMonth, availableMonths) 
      : salesData;
    
    return calculateProductOperationsMetrics(filteredOrders, false);
  }, [salesData, selectedMonth, availableMonths]);

  // Métricas de comparação multi-mês
  const comparisonMetrics = useMemo(() => {
    if (!comparisonMode || selectedMonths.length === 0 || salesData.length === 0) {
      return null;
    }

    const totalPedidos: any[] = [];
    const tempoMedioNF: any[] = [];
    const formaEnvioPrincipal: any[] = [];
    const faturamento: any[] = [];

    const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

    selectedMonths.forEach((month, index) => {
      const filteredOrders = filterOrdersByMonth(salesData, month, availableMonths);
      const metrics = calculateProductOperationsMetrics(filteredOrders, false);
      
      if (metrics) {
        const monthLabel = format(
          parse(month, "yyyy-MM", new Date()), 
          "MMM yyyy", 
          { locale: ptBR }
        );
        
        const color = COLORS[index % COLORS.length];

        // Total de pedidos
        totalPedidos.push({
          month,
          monthLabel,
          value: filteredOrders.length,
          color,
        });

        // Tempo médio NF
        tempoMedioNF.push({
          month,
          monthLabel,
          value: metrics.nfStats?.averageDays || 0,
          color,
        });

        // Forma de envio principal
        const mainShipping = metrics.shippingMethodStats[0];
        formaEnvioPrincipal.push({
          month,
          monthLabel,
          value: mainShipping?.numeroPedidos || 0,
          color,
          shippingName: mainShipping?.formaEnvio || 'N/A',
        });

        // Faturamento total do período
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.valorTotal, 0);
        faturamento.push({
          month,
          monthLabel,
          value: totalRevenue,
          color,
        });
      }
    });

    // Calcular variações percentuais
    const calcVariation = (arr: any[]) => {
      if (arr.length > 1) {
        const base = arr[0].value;
        arr.forEach((item, idx) => {
          if (idx > 0 && base > 0) {
            item.percentageChange = ((item.value - base) / base) * 100;
          }
        });
      }
    };

    calcVariation(totalPedidos);
    calcVariation(tempoMedioNF);
    calcVariation(formaEnvioPrincipal);
    calcVariation(faturamento);

    return { totalPedidos, tempoMedioNF, formaEnvioPrincipal, faturamento };
  }, [comparisonMode, selectedMonths, salesData, availableMonths]);

  // Calcular totais para modo normal
  const summaryMetrics = useMemo(() => {
    if (!productMetrics) return null;

    const filteredOrders = selectedMonth 
      ? filterOrdersByMonth(salesData, selectedMonth, availableMonths) 
      : salesData;

    const totalOrders = filteredOrders.length;
    const totalShippingMethods = productMetrics.shippingMethodStats.length;
    const avgNFTime = productMetrics.nfStats?.averageDays || 0;
    const mainShipping = productMetrics.shippingMethodStats[0];

    // Faturamento total
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.valorTotal, 0);
    return {
      totalOrders,
      totalShippingMethods,
      avgNFTime,
      totalRevenue,
      mainShipping,
    };
  }, [productMetrics, salesData, selectedMonth, availableMonths]);

  if (salesData.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-6 h-6" />
              🚚 Operações
            </CardTitle>
            <CardDescription>
              Carregue os dados de vendas na página "Upload" para visualizar as análises de operações.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Truck className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">🚚 Operações</h1>
          <p className="text-muted-foreground">
            Formas de envio, logística e emissão de notas fiscais
          </p>
        </div>
      </div>

      {/* Cards resumo - HERO + SATÉLITES */}
      {!comparisonMode && productMetrics && summaryMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* HERO Card - Forma de Envio Principal */}
          <KPITooltip metricKey="forma_envio_principal">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Forma de Envio Principal</p>
                    <p className="text-xs text-muted-foreground">
                      🚚 Método mais utilizado no período
                    </p>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold mb-4 line-clamp-2">
                  {summaryMetrics.mainShipping?.formaEnvio || 'N/A'}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">📦 Pedidos</p>
                    <p className="text-lg font-bold">
                      {summaryMetrics.mainShipping?.numeroPedidos.toLocaleString('pt-BR') || 0}
                    </p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">💰 Faturamento</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(summaryMetrics.mainShipping?.faturamentoTotal || 0)}
                    </p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">📈 % do Total</p>
                    <p className="text-lg font-bold text-primary">
                      {summaryMetrics.mainShipping?.percentual.toFixed(1) || 0}%
                    </p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">🎫 Ticket Médio</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(summaryMetrics.mainShipping?.ticketMedio || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </KPITooltip>

          {/* SATÉLITES - 4 cards compactos */}
          <div className="grid grid-cols-2 gap-4">
            <KPITooltip metricKey="total_pedidos">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground">Total Pedidos</span>
                  </div>
                  <p className="text-xl font-bold text-blue-600">
                    {summaryMetrics.totalOrders.toLocaleString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            </KPITooltip>

            <KPITooltip metricKey="formas_envio_total">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-teal-600" />
                    <span className="text-xs text-muted-foreground">Formas de Envio</span>
                  </div>
                  <p className="text-xl font-bold text-teal-600">
                    {summaryMetrics.totalShippingMethods}
                  </p>
                </CardContent>
              </Card>
            </KPITooltip>

            <KPITooltip metricKey="tempo_medio_nf">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className={`h-4 w-4 ${summaryMetrics.avgNFTime <= 1 ? 'text-green-600' : summaryMetrics.avgNFTime <= 3 ? 'text-yellow-600' : 'text-red-600'}`} />
                    <span className="text-xs text-muted-foreground">Tempo Médio NF</span>
                  </div>
                  <p className={`text-xl font-bold ${summaryMetrics.avgNFTime <= 1 ? 'text-green-600' : summaryMetrics.avgNFTime <= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {summaryMetrics.avgNFTime.toFixed(1)} dias
                  </p>
                </CardContent>
              </Card>
            </KPITooltip>

            <KPITooltip metricKey="faturamento_periodo">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">Faturamento</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(summaryMetrics.totalRevenue)}
                  </p>
                </CardContent>
              </Card>
            </KPITooltip>
          </div>
        </div>
      )}

      {/* Cards de comparação multi-mês */}
      {comparisonMode && comparisonMetrics && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ComparisonMetricCard
            title="Total de Pedidos"
            icon={Package}
            metrics={comparisonMetrics.totalPedidos}
            tooltipKey="total_pedidos"
          />
          <ComparisonMetricCard
            title="Tempo Médio NF"
            icon={Clock}
            metrics={comparisonMetrics.tempoMedioNF}
            formatValue={(v) => `${v.toFixed(1)} dias`}
            tooltipKey="tempo_medio_nf"
          />
          <ComparisonMetricCard
            title="Forma Envio Principal"
            icon={Truck}
            metrics={comparisonMetrics.formaEnvioPrincipal}
            tooltipKey="forma_envio_principal"
          />
          <ComparisonMetricCard
            title="Faturamento"
            icon={DollarSign}
            metrics={comparisonMetrics.faturamento}
            formatValue={(v) => formatCurrency(v)}
            tooltipKey="faturamento_periodo"
          />
        </div>
      )}

      {/* KPIs de Nota Fiscal */}
      {productMetrics && productMetrics.nfStats && (
        <LogisticsKPICards
          averageDays={productMetrics.nfStats.averageDays}
          medianDays={productMetrics.nfStats.medianDays}
          minDays={productMetrics.nfStats.minDays}
          maxDays={productMetrics.nfStats.maxDays}
        />
      )}

      {/* Gráficos lado a lado */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>🚚 Métodos de Envio</CardTitle>
            <CardDescription>
              Distribuição de como os pedidos são entregues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShippingMethodsChart
              data={productMetrics?.shippingMethodStats || []}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>⏱️ Tempo de Emissão NF</CardTitle>
            <CardDescription>
              Distribuição do tempo entre venda e emissão de nota fiscal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NFIssuanceChart
              distribution={productMetrics?.nfIssuanceDistribution || []}
              averageDays={productMetrics?.averageNFIssuanceTime || 0}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tabela de detalhes por método de envio */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Detalhes por Forma de Envio</CardTitle>
          <CardDescription>
            Performance detalhada de cada método de entrega
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Método</th>
                  <th className="text-right p-3 font-medium">Pedidos</th>
                  <th className="text-right p-3 font-medium">% Total</th>
                  <th className="text-right p-3 font-medium">Faturamento</th>
                  <th className="text-right p-3 font-medium">Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {productMetrics?.shippingMethodStats.map((stat, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{stat.formaEnvio}</td>
                    <td className="p-3 text-right">{stat.numeroPedidos.toLocaleString('pt-BR')}</td>
                    <td className="p-3 text-right">{stat.percentual.toFixed(1)}%</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(stat.faturamentoTotal)}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(stat.ticketMedio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
