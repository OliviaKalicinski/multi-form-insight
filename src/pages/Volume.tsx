import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Package, ListTree, DollarSign, ShoppingCart, BarChart3, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { StatusMetricCard } from "@/components/dashboard/StatusMetricCard";
import { TopProductsTable } from "@/components/dashboard/TopProductsTable";
import { SKUAnalysisTable } from "@/components/dashboard/SKUAnalysisTable";
import { ProductCombinationsTable } from "@/components/dashboard/ProductCombinationsTable";
import { ShippingMethodsChart } from "@/components/dashboard/ShippingMethodsChart";
import { NFIssuanceChart } from "@/components/dashboard/NFIssuanceChart";
import { FreebieProductsList } from "@/components/dashboard/FreebieProductsList";
import { TopProductsChart } from "@/components/dashboard/TopProductsChart";
import { calculateProductOperationsMetrics } from "@/utils/productOperationsMetrics";
import { filterOrdersByMonth, formatCurrency } from "@/utils/salesCalculator";
import { Button } from "@/components/ui/button";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Volume() {
  const {
    salesData,
    selectedMonth,
    availableMonths,
    comparisonMode,
    selectedMonths,
  } = useDashboard();

  const [productSortBy, setProductSortBy] = useState<'quantity' | 'revenue'>('quantity');
  const [viewMode, setViewMode] = useState<'as-sold' | 'individual'>('as-sold');

  const productMetrics = useMemo(() => {
    if (salesData.length === 0) return null;
    
    const filteredOrders = selectedMonth 
      ? filterOrdersByMonth(salesData, selectedMonth, availableMonths) 
      : salesData;
    
    return calculateProductOperationsMetrics(
      filteredOrders, 
      viewMode === 'individual'
    );
  }, [salesData, selectedMonth, availableMonths, viewMode]);

  // Métricas de comparação multi-mês
  const comparisonMetrics = useMemo(() => {
    if (!comparisonMode || selectedMonths.length === 0 || salesData.length === 0) {
      return null;
    }

    const receitaProdutos: any[] = [];
    const produtosVendidos: any[] = [];
    const skusUnicos: any[] = [];
    const topProduto: any[] = [];

    const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

    selectedMonths.forEach((month, index) => {
      const filteredOrders = filterOrdersByMonth(salesData, month, availableMonths);
      const metrics = calculateProductOperationsMetrics(filteredOrders, viewMode === 'individual');
      
      if (metrics) {
        const monthLabel = format(
          parse(month, "yyyy-MM", new Date()), 
          "MMM yyyy", 
          { locale: ptBR }
        );
        
        const color = COLORS[index % COLORS.length];

        // Receita total de produtos
        const totalRevenue = metrics.topProductsByRevenue.reduce((sum, p) => sum + p.faturamentoTotal, 0);
        receitaProdutos.push({
          month,
          monthLabel,
          value: totalRevenue,
          color,
        });

        // Total de produtos vendidos
        const totalProducts = metrics.topProductsByQuantity.reduce((sum, p) => sum + p.quantidadeTotal, 0);
        produtosVendidos.push({
          month,
          monthLabel,
          value: totalProducts,
          color,
        });

        // SKUs únicos
        skusUnicos.push({
          month,
          monthLabel,
          value: metrics.skuAnalysis.length,
          color,
        });

        // Top produto
        const topProduct = metrics.topProductsByRevenue[0];
        topProduto.push({
          month,
          monthLabel,
          value: topProduct?.faturamentoTotal || 0,
          color,
          productName: topProduct?.descricaoAjustada || 'N/A',
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

    calcVariation(receitaProdutos);
    calcVariation(produtosVendidos);
    calcVariation(skusUnicos);
    calcVariation(topProduto);

    return { receitaProdutos, produtosVendidos, skusUnicos, topProduto };
  }, [comparisonMode, selectedMonths, salesData, availableMonths, viewMode]);

  if (salesData.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-6 h-6" />
              📦 Produto & Operações
            </CardTitle>
            <CardDescription>
              Carregue os dados de vendas na página "Upload" para visualizar as análises de produtos.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Package className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">📦 Produto & Operações</h1>
          <p className="text-muted-foreground">
            Análise de produtos, SKUs, combinações, brindes e operações logísticas
          </p>
        </div>
      </div>


      {/* Cards resumo - MODO NORMAL COM HIERARQUIA VISUAL */}
      {!comparisonMode && productMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Card Principal - Top Produto (2x tamanho) */}
          <StatusMetricCard
            title="Produto Top"
            value={productMetrics.topProductsByRevenue[0]?.descricaoAjustada || 'N/A'}
            icon={<TrendingUp className="h-4 w-4" />}
            size="large"
            status="success"
            benchmark={{
              value: productMetrics.topProductsByRevenue[0]?.quantidadeTotal || 0,
              label: "Unidades vendidas",
            }}
            interpretation={`Receita: ${formatCurrency(productMetrics.topProductsByRevenue[0]?.faturamentoTotal || 0)}`}
          />

          {/* Cards Secundários */}
          <StatusMetricCard
            title="Receita Produtos"
            value={formatCurrency(productMetrics.topProductsByRevenue.reduce((sum, p) => sum + p.faturamentoTotal, 0))}
            icon={<DollarSign className="h-3.5 w-3.5" />}
            interpretation="Faturamento total de produtos"
          />

          <StatusMetricCard
            title="Produtos Vendidos"
            value={productMetrics.topProductsByQuantity.reduce((sum, p) => sum + p.quantidadeTotal, 0).toLocaleString('pt-BR')}
            icon={<ShoppingCart className="h-3.5 w-3.5" />}
            interpretation="Total de unidades vendidas"
          />

          <StatusMetricCard
            title="SKUs Únicos"
            value={productMetrics.skuAnalysis.length.toLocaleString('pt-BR')}
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            interpretation="Códigos de produto distintos"
          />

          <StatusMetricCard
            title="Combinações"
            value={productMetrics.productCombinations.length.toLocaleString('pt-BR')}
            icon={<Package className="h-3.5 w-3.5" />}
            interpretation="Produtos comprados juntos"
          />

          <StatusMetricCard
            title="Brindes"
            value={productMetrics.freebieProducts.length.toLocaleString('pt-BR')}
            icon={<Package className="h-3.5 w-3.5" />}
            interpretation="Produtos R$ 0,01"
          />
        </div>
      )}

      {/* Cards de comparação multi-mês */}
      {comparisonMode && comparisonMetrics && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ComparisonMetricCard
            title="Receita de Produtos"
            icon={DollarSign}
            metrics={comparisonMetrics.receitaProdutos}
            formatValue={(v) => formatCurrency(v)}
          />
          <ComparisonMetricCard
            title="Produtos Vendidos"
            icon={ShoppingCart}
            metrics={comparisonMetrics.produtosVendidos}
          />
          <ComparisonMetricCard
            title="SKUs Únicos"
            icon={BarChart3}
            metrics={comparisonMetrics.skusUnicos}
          />
          <ComparisonMetricCard
            title="Top Produto (Receita)"
            icon={TrendingUp}
            metrics={comparisonMetrics.topProduto}
            formatValue={(v) => formatCurrency(v)}
          />
        </div>
      )}

      <Tabs defaultValue="ranking" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="ranking">📊 Ranking</TabsTrigger>
          <TabsTrigger value="sku">🏷️ SKU</TabsTrigger>
          <TabsTrigger value="combinations">🔗 Combinações</TabsTrigger>
          <TabsTrigger value="shipping">🚚 Envio</TabsTrigger>
          <TabsTrigger value="operations">⚙️ Operações</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="space-y-4">
                {/* Linha 1: Toggle de visualização */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {viewMode === 'as-sold' ? (
                        <><Package className="h-5 w-5" /> Produtos Como Vendidos</>
                      ) : (
                        <><ListTree className="h-5 w-5" /> Produtos Individuais</>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {viewMode === 'as-sold' 
                        ? 'Kits contam como 1 produto (agrupados por tipo)' 
                        : 'Kits desmembrados em produtos individuais'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'as-sold' ? 'default' : 'outline'}
                      onClick={() => setViewMode('as-sold')}
                      size="sm"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Como Vendidos
                    </Button>
                    <Button
                      variant={viewMode === 'individual' ? 'default' : 'outline'}
                      onClick={() => setViewMode('individual')}
                      size="sm"
                    >
                      <ListTree className="h-4 w-4 mr-2" />
                      Individuais
                    </Button>
                  </div>
                </div>

                {/* Linha 2: Ordenação */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4 border-t">
                  <CardDescription>
                    Top 20 produtos por quantidade ou faturamento
                  </CardDescription>
                  <div className="flex gap-2">
                    <Button
                      variant={productSortBy === 'quantity' ? 'default' : 'outline'}
                      onClick={() => setProductSortBy('quantity')}
                      size="sm"
                    >
                      Por Quantidade
                    </Button>
                    <Button
                      variant={productSortBy === 'revenue' ? 'default' : 'outline'}
                      onClick={() => setProductSortBy('revenue')}
                      size="sm"
                    >
                      Por Faturamento
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            {/* ✅ NOVO: Gráfico Unificado */}
            <CardContent className="pb-6">
              <TopProductsChart
                products={
                  productSortBy === 'quantity'
                    ? productMetrics?.topProductsByQuantity || []
                    : productMetrics?.topProductsByRevenue || []
                }
                sortBy={productSortBy}
                viewMode={viewMode}
                limit={15}
              />
            </CardContent>

            {/* Separador */}
            <div className="px-6 pb-2">
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold mb-2">📋 Tabela Detalhada - Top 20 Produtos</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Detalhamento completo dos produtos mais vendidos
                </p>
              </div>
            </div>

            <CardContent>
              <TopProductsTable
                products={
                  productSortBy === 'quantity'
                    ? productMetrics?.topProductsByQuantity || []
                    : productMetrics?.topProductsByRevenue || []
                }
                sortBy={productSortBy}
              />
            </CardContent>
          </Card>

          {productMetrics && productMetrics.freebieProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>🎁 Produtos Brinde / Promoções (R$ 0,01)</CardTitle>
                <CardDescription>
                  Produtos distribuídos como cortesia ou amostras
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FreebieProductsList products={productMetrics.freebieProducts} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sku">
          <Card>
            <CardHeader>
              <CardTitle>Análise Detalhada de SKU</CardTitle>
              <CardDescription>
                Desempenho individual de cada código de produto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SKUAnalysisTable skus={productMetrics?.skuAnalysis || []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="combinations">
          <Card>
            <CardHeader>
              <CardTitle>Produtos Frequentemente Comprados Juntos</CardTitle>
              <CardDescription>
                Identificar oportunidades de cross-sell e bundles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productMetrics && productMetrics.productCombinations.length > 0 ? (
                <ProductCombinationsTable
                  combinations={productMetrics.productCombinations}
                />
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Não há combinações frequentes de produtos no período selecionado
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Formas de Envio</CardTitle>
                <CardDescription>
                  Como os pedidos são entregues
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
                <CardTitle>Detalhes por Forma de Envio</CardTitle>
                <CardDescription>
                  Performance de cada método de entrega
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productMetrics?.shippingMethodStats.map((stat, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{stat.formaEnvio}</span>
                        <span className="text-sm text-muted-foreground">
                          {stat.percentual.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${stat.percentual}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{stat.numeroPedidos} pedidos</span>
                        <span>
                          Ticket médio: {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(stat.ticketMedio)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations">
          <Card>
            <CardHeader>
              <CardTitle>Tempo de Emissão de Nota Fiscal</CardTitle>
              <CardDescription>
                Análise do tempo entre venda e emissão de NF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NFIssuanceChart
                distribution={productMetrics?.nfIssuanceDistribution || []}
                averageDays={productMetrics?.averageNFIssuanceTime || 0}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
