import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "@/contexts/DashboardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  BarChart3
} from "lucide-react";
import { MonthFilter } from "@/components/dashboard/MonthFilter";
import { CriticalAlertCard } from "@/components/executive/CriticalAlertCard";
import { calculateExecutiveMetrics, filterOrdersByMonth, filterAdsByMonth } from "@/utils/executiveMetricsCalculator";
import { gerarAlertas } from "@/utils/alertSystem";
import { gerarRecomendacoes } from "@/utils/recommendationEngine";
import { getPlatformPerformance } from "@/utils/financialMetrics";
import { format, subMonths, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProcessedOrder } from "@/types/marketing";

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { salesData, adsData, selectedMonth, setSelectedMonth } = useDashboard();

  // salesData in context is already ProcessedOrder[]
  const processedOrders = useMemo(() => {
    if (!salesData || salesData.length === 0) return [];
    return salesData as ProcessedOrder[];
  }, [salesData]);

  // Calculate available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    processedOrders.forEach(order => {
      const month = format(order.dataVenda, "yyyy-MM");
      months.add(month);
    });
    adsData.forEach(ad => {
      const month = ad["Início dos relatórios"]?.substring(0, 7);
      if (month) months.add(month);
    });
    return Array.from(months).sort().reverse();
  }, [processedOrders, adsData]);

  // Get current and previous month data
  const { currentMetrics, previousMetrics, monthOrders, platformData, topProducts } = useMemo(() => {
    if (!selectedMonth || processedOrders.length === 0) {
      return { currentMetrics: null, previousMetrics: null, monthOrders: [], platformData: [], topProducts: [] };
    }

    const monthOrders = filterOrdersByMonth(processedOrders, selectedMonth);
    const monthAds = filterAdsByMonth(adsData, selectedMonth);
    
    // Previous month
    const currentDate = parse(selectedMonth, "yyyy-MM", new Date());
    const prevDate = subMonths(currentDate, 1);
    const prevMonth = format(prevDate, "yyyy-MM");
    
    const prevMonthOrders = filterOrdersByMonth(processedOrders, prevMonth);
    const prevMonthAds = filterAdsByMonth(adsData, prevMonth);

    const currentMetrics = calculateExecutiveMetrics(monthOrders, monthAds, selectedMonth);
    const previousMetrics = calculateExecutiveMetrics(prevMonthOrders, prevMonthAds, prevMonth);

    // Platform performance
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

    return { currentMetrics, previousMetrics, monthOrders, platformData, topProducts };
  }, [processedOrders, adsData, selectedMonth]);

  // Calculate variations
  const variations = useMemo(() => {
    if (!currentMetrics || !previousMetrics) return null;
    
    const calc = (current: number, previous: number) => 
      previous > 0 ? ((current - previous) / previous) * 100 : 0;
    
    return {
      receita: calc(currentMetrics.vendas.receita, previousMetrics.vendas.receita),
      pedidos: calc(currentMetrics.vendas.pedidos, previousMetrics.vendas.pedidos),
      ticket: calc(currentMetrics.vendas.ticketMedioReal, previousMetrics.vendas.ticketMedioReal),
      roas: currentMetrics.marketing.roasAds - previousMetrics.marketing.roasAds,
      ltv: calc(currentMetrics.clientes.ltv, previousMetrics.clientes.ltv),
      cac: calc(currentMetrics.clientes.cac, previousMetrics.clientes.cac),
    };
  }, [currentMetrics, previousMetrics]);

  // Generate alerts and recommendations
  const { alerts, opportunities } = useMemo(() => {
    if (!currentMetrics || !previousMetrics) return { alerts: [], opportunities: [] };
    
    const alerts = gerarAlertas(currentMetrics, previousMetrics);
    const recommendations = gerarRecomendacoes(currentMetrics, previousMetrics);
    
    // Convert top recommendations to opportunities
    const opportunities = recommendations.slice(0, 2).map(rec => ({
      id: rec.id,
      title: rec.title,
      description: rec.actions[0],
      impact: rec.impact,
    }));
    
    return { alerts, opportunities };
  }, [currentMetrics, previousMetrics]);

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

  const TrendIcon = ({ value, inverted = false }: { value: number; inverted?: boolean }) => {
    const isPositive = inverted ? value < 0 : value > 0;
    return isPositive ? (
      <TrendingUp className="h-4 w-4 text-emerald-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">🐉 Visão Executiva</h1>
          <p className="text-muted-foreground">
            Resumo de performance do negócio
          </p>
        </div>
        
        {availableMonths.length > 0 && (
          <MonthFilter
            availableMonths={availableMonths}
            selectedMonth={selectedMonth || availableMonths[0]}
            onMonthChange={setSelectedMonth}
          />
        )}
      </div>

      {/* Top KPIs Row */}
      {currentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Main KPI - Revenue (2x size) */}
          <Card className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Receita
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-4xl font-bold text-primary">
                  {formatCurrency(currentMetrics.vendas.receita)}
                </div>
                {variations && (
                  <div className="flex items-center gap-2 mt-2">
                    <TrendIcon value={variations.receita} />
                    <span className={`text-sm font-medium ${variations.receita >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatPercent(variations.receita)}
                    </span>
                    <span className="text-xs text-muted-foreground">vs mês anterior</span>
                  </div>
                )}
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pedidos</span>
                  <span className="font-medium">{currentMetrics.vendas.pedidos}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Ticket Médio Real</span>
                  <span className="font-medium">{formatCurrency(currentMetrics.vendas.ticketMedioReal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Secondary KPIs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" />
                Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.vendas.pedidos}</div>
              {variations && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon value={variations.pedidos} />
                  <span className={`text-xs ${variations.pedidos >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatPercent(variations.pedidos)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5" />
                Margem Est.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.produtos.margemMedia}%</div>
              <span className="text-xs text-muted-foreground">Média estimada</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                ROAS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.marketing.roasAds.toFixed(2)}x</div>
              {variations && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon value={variations.roas} />
                  <span className={`text-xs ${variations.roas >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {variations.roas >= 0 ? '+' : ''}{variations.roas.toFixed(2)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                CAC
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(currentMetrics.clientes.cac)}</div>
              {variations && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon value={variations.cac} inverted />
                  <span className={`text-xs ${variations.cac <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatPercent(variations.cac)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                LTV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(currentMetrics.clientes.ltv)}</div>
              {variations && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon value={variations.ltv} />
                  <span className={`text-xs ${variations.ltv >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatPercent(variations.ltv)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Context Row - Platform & Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Platform Performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Performance por Canal</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/performance-financeira')}>
              Ver Detalhes <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {platformData.length > 0 ? (
              <div className="space-y-3">
                {platformData.map((platform, index) => (
                  <div key={platform.platform} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-medium truncate">{platform.platform}</div>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${platform.marketShare}%` }}
                      />
                    </div>
                    <div className="w-24 text-sm text-right font-medium">
                      {formatCurrency(platform.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum dado de plataforma disponível</p>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Top 5 Produtos</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/volume')}>
              Ver Todos <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-2">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground w-4">{index + 1}.</span>
                      <span className="text-sm truncate max-w-[180px]">{product.name}</span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(product.receita)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum produto encontrado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Opportunities */}
      {(alerts.length > 0 || opportunities.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Critical Alerts */}
          {alerts.length > 0 && (
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Alertas Críticos ({alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.slice(0, 3).map(alert => (
                  <CriticalAlertCard key={alert.id} alert={alert} />
                ))}
                {alerts.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/analise-critica')}>
                    Ver todos os alertas
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Opportunities */}
          {opportunities.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-emerald-600" />
                  Oportunidades
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {opportunities.map(opp => (
                  <div key={opp.id} className="p-3 bg-white rounded-lg border">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{opp.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{opp.description}</p>
                      </div>
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                        {opp.impact}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/analise-critica')}>
                  Ver recomendações completas
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análises Detalhadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/performance-financeira')}>
              <DollarSign className="h-5 w-5" />
              <span className="text-xs">Performance Financeira</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/comportamento-cliente')}>
              <Users className="h-5 w-5" />
              <span className="text-xs">Comportamento Cliente</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/volume')}>
              <ShoppingCart className="h-5 w-5" />
              <span className="text-xs">Produtos & Operações</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/ads')}>
              <Target className="h-5 w-5" />
              <span className="text-xs">Anúncios</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
