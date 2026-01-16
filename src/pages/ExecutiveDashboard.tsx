import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "@/contexts/DashboardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Target,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  Percent,
  BarChart3,
  Zap,
  Package
} from "lucide-react";
import { StatusMetricCard, getStatusFromBenchmark } from "@/components/dashboard/StatusMetricCard";
import { calculateExecutiveMetrics, filterOrdersByMonth, filterAdsByMonth } from "@/utils/executiveMetricsCalculator";
import { gerarAlertas } from "@/utils/alertSystem";
import { gerarRecomendacoes } from "@/utils/recommendationEngine";
import { getPlatformPerformance } from "@/utils/financialMetrics";
import { format, subMonths, parse } from "date-fns";
import { ProcessedOrder } from "@/types/marketing";

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { salesData, adsData, selectedMonth } = useDashboard();

  // salesData in context is already ProcessedOrder[]
  const processedOrders = useMemo(() => {
    if (!salesData || salesData.length === 0) return [];
    return salesData as ProcessedOrder[];
  }, [salesData]);

  // Extrair meses disponíveis dos dados de vendas
  const availableSalesMonths = useMemo(() => {
    const months = new Set<string>();
    processedOrders.forEach(o => months.add(format(o.dataVenda, "yyyy-MM")));
    return Array.from(months).sort();
  }, [processedOrders]);

  // Get current and previous month data - suporta "Todos" (selectedMonth = null)
  const { currentMetrics, previousMetrics, platformData, topProducts } = useMemo(() => {
    if (processedOrders.length === 0) {
      return { currentMetrics: null, previousMetrics: null, platformData: [], topProducts: [] };
    }

    // Se não há mês selecionado, usar todos os pedidos
    const isAllMonths = !selectedMonth;
    const monthOrders = isAllMonths 
      ? processedOrders 
      : filterOrdersByMonth(processedOrders, selectedMonth);
    
    const monthAds = isAllMonths 
      ? adsData 
      : filterAdsByMonth(adsData, selectedMonth);
    
    // Para "Todos", calcular métricas agregadas
    const currentMetrics = calculateExecutiveMetrics(
      monthOrders, 
      monthAds, 
      isAllMonths ? "all" : selectedMonth
    );

    // Previous period (apenas quando há mês específico selecionado)
    let previousMetrics = null;
    if (!isAllMonths && selectedMonth) {
      const currentDate = parse(selectedMonth, "yyyy-MM", new Date());
      const prevDate = subMonths(currentDate, 1);
      const prevMonth = format(prevDate, "yyyy-MM");
      
      const prevMonthOrders = filterOrdersByMonth(processedOrders, prevMonth);
      const prevMonthAds = filterAdsByMonth(adsData, prevMonth);
      
      previousMetrics = calculateExecutiveMetrics(prevMonthOrders, prevMonthAds, prevMonth);
    }

    // Platform performance e Top products (usar pedidos filtrados)
    const platformData = getPlatformPerformance(monthOrders).slice(0, 5);

    // Top products
    const productMap = new Map<string, { quantidade: number; receita: number }>();
    monthOrders.forEach(order => {
      order.produtos.forEach(produto => {
        if (produto.descricaoAjustada === 'Kit de Amostras') return;
        const existing = productMap.get(produto.descricaoAjustada);
        if (existing) {
          existing.quantidade += produto.quantidade;
          existing.receita += produto.preco;
        } else {
          productMap.set(produto.descricaoAjustada, {
            quantidade: produto.quantidade,
            receita: produto.preco
          });
        }
      });
    });
    
    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);

    return { currentMetrics, previousMetrics, platformData, topProducts };
  }, [processedOrders, adsData, selectedMonth]);

  // Calculate variations - null quando não há mês anterior (período "Todos")
  const variations = useMemo(() => {
    if (!currentMetrics || !previousMetrics) return null;
    
    const calc = (current: number, previous: number) => 
      previous > 0 ? ((current - previous) / previous) * 100 : null;
    
    return {
      receita: calc(currentMetrics.vendas.receita, previousMetrics.vendas.receita),
      pedidos: calc(currentMetrics.vendas.pedidos, previousMetrics.vendas.pedidos),
      ticket: calc(currentMetrics.vendas.ticketMedioReal, previousMetrics.vendas.ticketMedioReal),
      margem: null, // Margem fixa
      roas: currentMetrics.marketing.roasAds - previousMetrics.marketing.roasAds,
      ltv: calc(currentMetrics.clientes.ltv, previousMetrics.clientes.ltv),
      cac: calc(currentMetrics.clientes.cac, previousMetrics.clientes.cac),
      ltvCac: calc(
        currentMetrics.clientes.cac > 0 ? currentMetrics.clientes.ltv / currentMetrics.clientes.cac : 0,
        previousMetrics.clientes.cac > 0 ? previousMetrics.clientes.ltv / previousMetrics.clientes.cac : 0
      ),
    };
  }, [currentMetrics, previousMetrics]);

  // Generate alerts and recommendations
  const { alerts, opportunities } = useMemo(() => {
    if (!currentMetrics || !previousMetrics) return { alerts: [], opportunities: [] };
    
    const alerts = gerarAlertas(currentMetrics, previousMetrics);
    const recommendations = gerarRecomendacoes(currentMetrics, previousMetrics);
    
    // Convert top recommendations to opportunities
    const opportunities = recommendations.slice(0, 3).map(rec => ({
      id: rec.id,
      title: rec.title,
      description: rec.actions[0],
      impact: rec.impact,
      action: rec.actions[1] || null,
    }));
    
    return { alerts, opportunities };
  }, [currentMetrics, previousMetrics]);

  // Calculate goal progress (mock goal = +20% vs previous)
  const goalProgress = useMemo(() => {
    if (!currentMetrics || !previousMetrics) return 0;
    const goal = previousMetrics.vendas.receita * 1.2;
    return (currentMetrics.vendas.receita / goal) * 100;
  }, [currentMetrics, previousMetrics]);

  const revenueGoal = useMemo(() => {
    if (!previousMetrics) return 0;
    return previousMetrics.vendas.receita * 1.2;
  }, [previousMetrics]);

  // LTV/CAC ratio
  const ltvCacRatio = useMemo(() => {
    if (!currentMetrics || currentMetrics.clientes.cac === 0) return 0;
    return currentMetrics.clientes.ltv / currentMetrics.clientes.cac;
  }, [currentMetrics]);

  // No data state
  if (processedOrders.length === 0 && adsData.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-16">
          <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Bem-vindo ao Dashboard Executivo</h2>
          <p className="text-muted-foreground mb-6">
            Faça upload dos dados de vendas e anúncios para visualizar as métricas executivas.
          </p>
          <Button onClick={() => navigate('/upload')}>
            Ir para Upload de Dados
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* ========== HEADER SIMPLIFICADO - SEM FILTRO LOCAL ========== */}
      <div>
        <h1 className="text-3xl font-bold">🐉 Dashboard Executivo</h1>
        <p className="text-muted-foreground">
          Visão consolidada do desempenho do negócio
        </p>
      </div>

      {/* ========== LINHA 1 - KPI PRINCIPAL + SATÉLITES ========== */}
      {currentMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ===== CARD PRINCIPAL - RECEITA (50% da largura) ===== */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
            <CardContent className="pt-6 space-y-4">
              {/* Title */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {selectedMonth ? "Receita do Mês" : "Receita Total"}
                </span>
              </div>

              {/* Main Value */}
              <div>
                <div className="text-4xl font-bold text-primary">
                  {formatCurrency(currentMetrics.vendas.receita)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedMonth 
                    ? "Receita bruta do período selecionado"
                    : `Receita acumulada de ${availableSalesMonths.length} meses`}
                </p>
              </div>

              {/* Progress Goal - ocultar quando em "Todos" */}
              {selectedMonth && revenueGoal > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Meta: {formatCurrency(revenueGoal)}
                    </span>
                    <span className={cn(
                      "font-semibold",
                      goalProgress >= 100 ? "text-emerald-600" : 
                      goalProgress >= 80 ? "text-amber-600" : "text-red-600"
                    )}>
                      {goalProgress.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={Math.min(goalProgress, 100)} className="h-2" />
                </div>
              )}

              {/* Trend */}
              {variations && (
                <div className="flex items-center gap-2 pt-2">
                  {variations.receita >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={cn(
                    "font-semibold",
                    variations.receita >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {formatPercent(variations.receita)}
                  </span>
                  {selectedMonth && <span className="text-sm text-muted-foreground">vs mês anterior</span>}
                </div>
              )}

              {/* Status Badge */}
              <Badge 
                variant={selectedMonth && goalProgress >= 100 ? "default" : "secondary"}
                className="text-xs"
              >
                {!selectedMonth 
                  ? '📊 Visão Consolidada'
                  : goalProgress >= 100 
                  ? '🎯 Meta Atingida' 
                  : goalProgress >= 80 
                  ? '📊 Próximo da Meta' 
                  : '⚡ Em Progresso'}
              </Badge>
            </CardContent>
          </Card>

          {/* ===== CARDS SATÉLITES (50% dividido em 2x3 grid) ===== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Pedidos */}
            <StatusMetricCard
              title="Pedidos"
              value={currentMetrics.vendas.pedidos.toString()}
              icon={<ShoppingCart className="h-4 w-4" />}
              trend={variations?.pedidos}
              status={getStatusFromBenchmark(currentMetrics.vendas.pedidos, previousMetrics?.vendas.pedidos || 1)}
              tooltipKey="total_pedidos"
            />

            {/* Margem Bruta */}
            <StatusMetricCard
              title="Margem Est."
              value={`${currentMetrics.produtos.margemMedia}%`}
              icon={<Percent className="h-4 w-4" />}
              status={
                currentMetrics.produtos.margemMedia >= 35 ? 'success' :
                currentMetrics.produtos.margemMedia >= 30 ? 'warning' : 'danger'
              }
              benchmark={{ value: 30, label: 'Meta: 30%' }}
              interpretation="Margem estimada"
              tooltipKey="margem_estimada"
            />

            {/* ROAS Real (Faturamento) */}
            <StatusMetricCard
              title="ROAS Real"
              value={`${currentMetrics.marketing.roasReal.toFixed(2)}x`}
              icon={<DollarSign className="h-4 w-4" />}
              status={
                currentMetrics.marketing.roasReal >= 4 ? 'success' :
                currentMetrics.marketing.roasReal >= 3 ? 'warning' : 'danger'
              }
              benchmark={{ value: 3.0, label: 'Meta: 3.0x' }}
              interpretation="Faturamento ÷ Ads"
              tooltipKey="roas_real"
            />

            {/* ROAS Meta (Plataforma) */}
            <StatusMetricCard
              title="ROAS Meta"
              value={`${currentMetrics.marketing.roasMeta.toFixed(2)}x`}
              icon={<Target className="h-4 w-4" />}
              status={
                currentMetrics.marketing.roasMeta >= 4 ? 'success' :
                currentMetrics.marketing.roasMeta >= 3 ? 'warning' : 'danger'
              }
              benchmark={{ value: 3.0, label: 'Meta: 3.0x' }}
              interpretation="Reportado Meta Ads"
              tooltipKey="roas_meta"
            />

            {/* CAC */}
            <StatusMetricCard
              title="CAC"
              value={formatCurrency(currentMetrics.clientes.cac)}
              icon={<Users className="h-4 w-4" />}
              trend={variations?.cac}
              invertTrend={true}
              status={getStatusFromBenchmark(currentMetrics.clientes.cac, 50, { invertComparison: true })}
              interpretation="Custo por Aquisição"
              tooltipKey="cac"
            />

            {/* LTV */}
            <StatusMetricCard
              title="LTV"
              value={formatCurrency(currentMetrics.clientes.ltv)}
              icon={<TrendingUp className="h-4 w-4" />}
              trend={variations?.ltv}
              status={getStatusFromBenchmark(currentMetrics.clientes.ltv, 200)}
              interpretation="Valor do Cliente"
              tooltipKey="ltv"
            />

            {/* LTV/CAC Ratio */}
            <StatusMetricCard
              title="LTV/CAC"
              value={`${ltvCacRatio.toFixed(2)}x`}
              icon={<Zap className="h-4 w-4" />}
              trend={variations?.ltvCac}
              status={
                ltvCacRatio >= 4 ? 'success' :
                ltvCacRatio >= 3 ? 'warning' : 'danger'
              }
              benchmark={{ value: 3.0, label: 'Mínimo: 3.0x' }}
              interpretation="Relação LTV/CAC"
              tooltipKey="ltv_cac"
            />
          </div>
        </div>
      )}

      <Separator />

      {/* ========== LINHA 2 - CONTEXTO (Performance por Canal + Top Produtos) ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance por Canal */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance por Canal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {platformData.length > 0 ? (
              <div className="space-y-4">
                {platformData.map((platform) => (
                  <div key={platform.platform} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate">{platform.platform}</span>
                      <span className="font-semibold">
                        {formatCurrency(platform.revenue)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={platform.marketShare} 
                        className="h-2 flex-1" 
                      />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {platform.marketShare.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => navigate('/performance-financeira')}
                >
                  Ver análise completa
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhum dado de canal disponível para o período selecionado.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Produtos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Top 5 Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        index === 0 ? "bg-amber-100 text-amber-700" :
                        index === 1 ? "bg-slate-100 text-slate-600" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[150px]">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.quantidade} unidades
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(product.receita)}
                      </p>
                    </div>
                  </div>
                ))}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => navigate('/volume')}
                >
                  Ver todos os produtos
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhum produto encontrado para o período selecionado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ========== LINHA 3 - ALERTAS E OPORTUNIDADES ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alertas Críticos */}
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Alertas Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts && alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.slice(0, 3).map((alert) => (
                  <div 
                    key={alert.id} 
                    className="p-3 bg-white rounded-lg border border-red-100"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">
                        {alert.severity === 'critical' ? '🔴' :
                         alert.severity === 'warning' ? '🟡' : 'ℹ️'}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {alert.title}
                        </p>
                        {alert.action && (
                          <p className="text-xs text-muted-foreground mt-1">
                            💡 {alert.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate('/analise-critica')}
                >
                  Ver análise completa
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600 py-4">
                <span className="text-lg">✅</span>
                <span className="text-sm">Nenhum alerta crítico no momento.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Oportunidades */}
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-emerald-600" />
              Oportunidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {opportunities && opportunities.length > 0 ? (
              <div className="space-y-3">
                {opportunities.slice(0, 3).map((opportunity) => (
                  <div 
                    key={opportunity.id} 
                    className="p-3 bg-white rounded-lg border border-emerald-100"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">✅</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {opportunity.title}
                        </p>
                        {opportunity.action && (
                          <p className="text-xs text-muted-foreground mt-1">
                            🎯 {opportunity.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate('/analise-critica')}
                >
                  Ver todas as oportunidades
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm py-4">
                Nenhuma oportunidade identificada no momento.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ========== LINHA 4 - QUICK LINKS ========== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Navegação Rápida</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => navigate('/performance-financeira')}
            >
              <DollarSign className="h-5 w-5" />
              <span className="text-xs font-medium">Performance</span>
              <span className="text-[10px] text-muted-foreground">Financeira</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => navigate('/comportamento-cliente')}
            >
              <Users className="h-5 w-5" />
              <span className="text-xs font-medium">Clientes</span>
              <span className="text-[10px] text-muted-foreground">Comportamento</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => navigate('/volume')}
            >
              <Package className="h-5 w-5" />
              <span className="text-xs font-medium">Produtos</span>
              <span className="text-[10px] text-muted-foreground">& Operações</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => navigate('/ads')}
            >
              <Target className="h-5 w-5" />
              <span className="text-xs font-medium">Marketing</span>
              <span className="text-[10px] text-muted-foreground">Ads & Social</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
