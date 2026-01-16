import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Package, ListTree, DollarSign, ShoppingCart, BarChart3, TrendingUp, Trophy, Gift, Link2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { TopProductsTable } from "@/components/dashboard/TopProductsTable";
import { SKUAnalysisTable } from "@/components/dashboard/SKUAnalysisTable";
import { ProductCombinationsTable } from "@/components/dashboard/ProductCombinationsTable";
import { FreebieProductsList } from "@/components/dashboard/FreebieProductsList";
import { TopProductsChart } from "@/components/dashboard/TopProductsChart";
import { CrossSellKPICards } from "@/components/dashboard/CrossSellKPICards";
import { CrossSellBarsChart } from "@/components/dashboard/CrossSellBarsChart";
import { KPITooltip } from "@/components/dashboard/KPITooltip";
import { calculateProductOperationsMetrics } from "@/utils/productOperationsMetrics";
import { filterOrdersByMonth, formatCurrency } from "@/utils/salesCalculator";
import { Button } from "@/components/ui/button";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
export default function Produtos() {
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
              📦 Produtos
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
          <h1 className="text-3xl font-bold">📦 Produtos</h1>
          <p className="text-muted-foreground">
            Análise de produtos, SKUs, combinações e brindes
          </p>
        </div>
      </div>

      {/* FILTROS GLOBAIS */}
      <Card className="bg-muted/20 border-dashed">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Grupo 1: Ordenação */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Ordenar por:
              </span>
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

            {/* Separador visual */}
            <div className="hidden md:block h-8 w-px bg-border" />

            {/* Grupo 2: Modo de Visualização */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Visualização:
              </span>
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
          </div>
        </CardContent>
      </Card>

      {/* Cards resumo - HERO + SATÉLITES */}
      {!comparisonMode && productMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* HERO Card - Produto Campeão */}
          {(() => {
            const topProduct = productSortBy === 'quantity' 
              ? productMetrics.topProductsByQuantity[0]
              : productMetrics.topProductsByRevenue[0];
            
            return (
              <KPITooltip metricKey="produto_campeao">
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Trophy className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Produto Campeão</p>
                        <p className="text-xs text-muted-foreground">
                          {productSortBy === 'quantity' 
                            ? '🏆 Mais vendido em unidades no período' 
                            : '💰 Maior faturamento no período'}
                        </p>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-4 line-clamp-2">
                      {topProduct?.descricaoAjustada || 'N/A'}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-background/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">📦 Unidades</p>
                        <p className="text-lg font-bold">
                          {topProduct?.quantidadeTotal.toLocaleString('pt-BR') || 0}
                        </p>
                      </div>
                      <div className="bg-background/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">💰 Receita</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(topProduct?.faturamentoTotal || 0)}
                        </p>
                      </div>
                      <div className="bg-background/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">📈 % do Total</p>
                        <p className="text-lg font-bold text-primary">
                          {productSortBy === 'quantity'
                            ? (topProduct?.percentualQuantidade?.toFixed(1) || 0)
                            : (topProduct?.percentualFaturamento?.toFixed(1) || 0)}%
                        </p>
                      </div>
                      <div className="bg-background/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">🛒 Pedidos</p>
                        <p className="text-lg font-bold">
                          {topProduct?.numeroPedidos.toLocaleString('pt-BR') || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </KPITooltip>
            );
          })()}

          {/* SATÉLITES - 5 cards compactos */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KPITooltip metricKey="receita_total_produtos">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">Receita Total</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(productMetrics.topProductsByRevenue.reduce((sum, p) => sum + p.faturamentoTotal, 0))}
                  </p>
                </CardContent>
              </Card>
            </KPITooltip>

            <KPITooltip metricKey="unidades_vendidas">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground">Unidades Vendidas</span>
                  </div>
                  <p className="text-xl font-bold text-blue-600">
                    {productMetrics.topProductsByQuantity.reduce((sum, p) => sum + p.quantidadeTotal, 0).toLocaleString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            </KPITooltip>

            <KPITooltip metricKey="skus_unicos">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <span className="text-xs text-muted-foreground">SKUs Únicos</span>
                  </div>
                  <p className="text-xl font-bold text-purple-600">
                    {productMetrics.skuAnalysis.length.toLocaleString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            </KPITooltip>

            <KPITooltip metricKey="combinacoes_produtos">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="h-4 w-4 text-orange-600" />
                    <span className="text-xs text-muted-foreground">Combinações</span>
                  </div>
                  <p className="text-xl font-bold text-orange-600">
                    {productMetrics.productCombinations.length.toLocaleString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            </KPITooltip>

            <KPITooltip metricKey="brindes">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="h-4 w-4 text-pink-600" />
                    <span className="text-xs text-muted-foreground">Brindes</span>
                  </div>
                  <p className="text-xl font-bold text-pink-600">
                    {productMetrics.freebieProducts.length.toLocaleString('pt-BR')}
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
            title="Receita de Produtos"
            icon={DollarSign}
            metrics={comparisonMetrics.receitaProdutos}
            formatValue={(v) => formatCurrency(v)}
            tooltipKey="receita_total_produtos"
          />
          <ComparisonMetricCard
            title="Produtos Vendidos"
            icon={ShoppingCart}
            metrics={comparisonMetrics.produtosVendidos}
            tooltipKey="unidades_vendidas"
          />
          <ComparisonMetricCard
            title="SKUs Únicos"
            icon={BarChart3}
            metrics={comparisonMetrics.skusUnicos}
            tooltipKey="skus_unicos"
          />
          <ComparisonMetricCard
            title="Top Produto (Receita)"
            icon={TrendingUp}
            metrics={comparisonMetrics.topProduto}
            formatValue={(v) => formatCurrency(v)}
            tooltipKey="produto_campeao"
          />
        </div>
      )}

      <Tabs defaultValue="ranking" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ranking">📊 Ranking</TabsTrigger>
          <TabsTrigger value="sku">🏷️ SKU</TabsTrigger>
          <TabsTrigger value="crosssell">🔗 Cross-Sell</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {viewMode === 'as-sold' ? (
                      <><Package className="h-5 w-5" /> Top 15 Produtos</>
                    ) : (
                      <><ListTree className="h-5 w-5" /> Top 15 Produtos (Individuais)</>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {productSortBy === 'quantity' 
                      ? 'Ordenados por quantidade vendida' 
                      : 'Ordenados por faturamento'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
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

        <TabsContent value="crosssell" className="space-y-6">
          {/* KPIs de Cross-Sell */}
          {productMetrics && productMetrics.productCombinations.length > 0 && (
            <CrossSellKPICards combinations={productMetrics.productCombinations} />
          )}

          {/* Gráfico de Barras - Top Combinações */}
          {productMetrics && productMetrics.productCombinations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>🏆 Top 5 Combinações Mais Frequentes</CardTitle>
                <CardDescription>
                  Produtos mais comprados juntos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CrossSellBarsChart combinations={productMetrics.productCombinations} limit={5} />
              </CardContent>
            </Card>
          )}

          {/* Tabela de Combinações */}
          <Card>
            <CardHeader>
              <CardTitle>🔗 Oportunidades de Cross-Sell</CardTitle>
              <CardDescription>
                Identificar oportunidades de bundles e promoções combinadas
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
      </Tabs>
    </div>
  );
}
