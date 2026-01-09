import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  Coins,
  TrendingUp,
  TrendingDown,
  Percent,
  ShoppingBag,
  Eye,
  MousePointerClick,
  BarChart3,
  Users,
  Repeat,
  Target,
  Heart,
  MessageSquare,
  CheckCircle,
  ShoppingCart,
  PackageCheck,
  PackageX,
  Calendar,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { StatusMetricCard, getStatusFromBenchmark } from "@/components/dashboard/StatusMetricCard";
import { AdsBreakdown } from "@/components/dashboard/AdsBreakdown";
import { useDashboard } from "@/contexts/DashboardContext";
import { filterAdsByMonth } from "@/utils/adsParserV2";
import { calculateAdsMetrics } from "@/utils/adsCalculator";
import { getLast12Months, formatMonthRange } from "@/utils/dateRangeCalculator";
import { aggregateAdsByMonth } from "@/utils/monthlyAggregator";
import { calculateAdsMultiMonthMetrics } from "@/utils/comparisonCalculator";
import { cn } from "@/lib/utils";

const Ads = () => {
  const navigate = useNavigate();
  const { 
    adsData, 
    monthlySummaries, 
    hasHierarchicalFormat, 
    selectedMonth, 
    availableMonths, 
    comparisonMode,
    selectedMonths,
  } = useDashboard();

  // Detect 12-month view
  const isLast12MonthsView = selectedMonth === "last-12-months";
  
  // Get last 12 months
  const last12Months = useMemo(() => {
    if (!isLast12MonthsView) return [];
    return getLast12Months(availableMonths);
  }, [isLast12MonthsView, availableMonths]);

  // Comparison mode calculations
  const multiMonthMetrics = useMemo(() => {
    if (!comparisonMode || selectedMonths.length < 2) return null;
    return calculateAdsMultiMonthMetrics(
      adsData, 
      selectedMonths,
      (data, month) => isLast12MonthsView ? aggregateAdsByMonth(data, [month]) : filterAdsByMonth(data, month)
    );
  }, [comparisonMode, selectedMonths, adsData, isLast12MonthsView]);

  const currentMonthAdsData = useMemo(() => {
    if (!selectedMonth) return [];
    if (isLast12MonthsView) {
      return aggregateAdsByMonth(adsData, last12Months);
    }
    return filterAdsByMonth(adsData, selectedMonth);
  }, [adsData, selectedMonth, isLast12MonthsView, last12Months]);

  // Calculate current metrics
  const metrics = useMemo(() => {
    if (isLast12MonthsView) {
      return calculateAdsMetrics(currentMonthAdsData);
    }
    
    if (hasHierarchicalFormat && monthlySummaries.length > 0) {
      const summary = monthlySummaries.find(s => s.month === selectedMonth);
      if (summary) {
        return summary.data;
      }
    }
    return calculateAdsMetrics(currentMonthAdsData);
  }, [hasHierarchicalFormat, monthlySummaries, selectedMonth, currentMonthAdsData, isLast12MonthsView]);

  // Calculate trends vs previous month
  const trends = useMemo(() => {
    if (!selectedMonth || isLast12MonthsView) return null;
    
    const sortedMonths = [...availableMonths].sort();
    const currentIndex = sortedMonths.indexOf(selectedMonth);
    if (currentIndex <= 0) return null;

    const previousMonth = sortedMonths[currentIndex - 1];
    const previousData = filterAdsByMonth(adsData, previousMonth);
    const previousMetrics = calculateAdsMetrics(previousData);

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      investmentTrend: calculateTrend(metrics.investimentoTotal, previousMetrics.investimentoTotal),
      revenueTrend: calculateTrend(metrics.valorConversaoTotal, previousMetrics.valorConversaoTotal),
      roasTrend: calculateTrend(metrics.roas, previousMetrics.roas),
      conversionsTrend: calculateTrend(metrics.comprasTotal, previousMetrics.comprasTotal),
      cpaTrend: calculateTrend(metrics.custoPorCompra, previousMetrics.custoPorCompra),
      cpcTrend: calculateTrend(metrics.cpcMedio, previousMetrics.cpcMedio),
    };
  }, [selectedMonth, availableMonths, adsData, metrics, isLast12MonthsView]);

  // Derived metrics
  const netProfit = metrics.valorConversaoTotal - metrics.investimentoTotal;
  const roasGoal = 3.0;
  const roasProgress = Math.min((metrics.roas / roasGoal) * 100, 150);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatRoas = (value: number) => {
    return `${value.toFixed(2)}x`;
  };

  // ROAS status and interpretation
  const getRoasStatus = (roas: number) => {
    if (roas >= 4) return { status: 'success' as const, badge: '🏆 Premium', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' };
    if (roas >= 3) return { status: 'success' as const, badge: '✓ Meta', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' };
    if (roas >= 2) return { status: 'warning' as const, badge: '⚠️ Baixo', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' };
    return { status: 'danger' as const, badge: '🚨 Crítico', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' };
  };

  const getRoasInterpretation = (roas: number) => {
    if (roas >= 4) return "🎯 Excelente! Campanhas muito rentáveis.";
    if (roas >= 3) return "✅ Bom desempenho, dentro da meta.";
    if (roas >= 2) return "⚠️ Abaixo da meta, revisar campanhas.";
    return "🚨 ROAS crítico, ação urgente necessária.";
  };

  const roasStatusInfo = getRoasStatus(metrics.roas);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">Análise de Anúncios</h1>
        <p className="text-muted-foreground">Performance de campanhas de Meta Ads</p>
      </div>

      {/* Period indicator for 12-month view */}
      {isLast12MonthsView && last12Months.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  📅 Visão Anual - Análise dos Últimos {last12Months.length} Meses
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Período: {formatMonthRange(last12Months)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {adsData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">
              Nenhum dado de anúncios disponível.
              <br />
              Faça upload de um arquivo CSV/TSV do Meta Ads Manager na página "Uploader".
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Ir para Uploader
            </Button>
          </CardContent>
        </Card>
      ) : !selectedMonth || currentMonthAdsData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum dado de anúncios disponível para o mês selecionado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Comparison Mode */}
          {comparisonMode && multiMonthMetrics ? (
            <>
              <h2 className="text-2xl font-semibold text-foreground">📊 Comparação de Métricas</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <ComparisonMetricCard
                  title="Investimento Total"
                  icon={DollarSign}
                  metrics={multiMonthMetrics.investimento}
                  formatValue={formatCurrency}
                />
                <ComparisonMetricCard
                  title="ROAS"
                  icon={TrendingUp}
                  metrics={multiMonthMetrics.roas}
                  formatValue={formatRoas}
                />
                <ComparisonMetricCard
                  title="Conversões (Compras)"
                  icon={ShoppingCart}
                  metrics={multiMonthMetrics.compras}
                  formatValue={formatNumber}
                />
                <ComparisonMetricCard
                  title="CPC Médio"
                  icon={Coins}
                  metrics={multiMonthMetrics.cpc}
                  formatValue={formatCurrency}
                />
                <ComparisonMetricCard
                  title="Taxa de Conversão"
                  icon={Percent}
                  metrics={multiMonthMetrics.taxaConversao}
                  formatValue={formatPercent}
                />
              </div>
            </>
          ) : (
            <>
              {/* ===== ROW 1: ROAS Highlight (50%) + Satellite Cards (50%) ===== */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Main ROAS Card */}
                <Card className={cn(
                  "col-span-1 row-span-2 border-2 shadow-lg",
                  roasStatusInfo.bgColor
                )}>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Title */}
                      <div className="flex items-center gap-2">
                        <Target className="h-6 w-6 text-primary" />
                        <span className="text-lg font-semibold text-foreground">
                          ROAS - Return on Ad Spend
                        </span>
                      </div>

                      {/* Main Value */}
                      <div className="space-y-1">
                        <p className={cn("text-5xl font-bold", roasStatusInfo.color)}>
                          {formatRoas(metrics.roas)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Retorno sobre investimento em anúncios
                        </p>
                      </div>

                      {/* Calculation Breakdown */}
                      <div className="space-y-2 p-4 rounded-lg bg-background/50 border">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Receita de Anúncios:</span>
                          <span className="font-medium text-foreground">{formatCurrency(metrics.valorConversaoTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Investimento:</span>
                          <span className="font-medium text-foreground">{formatCurrency(metrics.investimentoTotal)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-sm font-semibold">
                          <span>ROAS:</span>
                          <span className={roasStatusInfo.color}>{formatRoas(metrics.roas)}</span>
                        </div>
                      </div>

                      {/* Benchmark Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Meta mínima: {roasGoal}x</span>
                          <span className={cn(
                            "font-medium",
                            metrics.roas >= roasGoal ? "text-green-600" : "text-yellow-600"
                          )}>
                            {metrics.roas >= roasGoal 
                              ? `+${(((metrics.roas - roasGoal) / roasGoal) * 100).toFixed(0)}%`
                              : `${(((metrics.roas - roasGoal) / roasGoal) * 100).toFixed(0)}%`
                            }
                          </span>
                        </div>
                        <Progress value={roasProgress} className="h-2" />
                      </div>

                      {/* Trend vs Previous Month */}
                      {trends && (
                        <div className="flex items-center gap-2 text-sm">
                          {trends.roasTrend >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className={cn(
                            "font-medium",
                            trends.roasTrend >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {trends.roasTrend >= 0 ? '+' : ''}{trends.roasTrend.toFixed(1)}%
                          </span>
                          <span className="text-muted-foreground">vs mês anterior</span>
                        </div>
                      )}

                      {/* Contextual Interpretation */}
                      <div className={cn(
                        "p-3 rounded-lg text-sm font-medium border",
                        roasStatusInfo.bgColor
                      )}>
                        {getRoasInterpretation(metrics.roas)}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge 
                      variant={metrics.roas >= 3 ? "default" : "destructive"}
                      className="absolute top-4 right-4 text-xs"
                    >
                      {roasStatusInfo.badge}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Satellite Cards Grid (2x3) */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Investment */}
                  <StatusMetricCard
                    title="Investimento"
                    value={formatCurrency(metrics.investimentoTotal)}
                    icon={<DollarSign className="h-4 w-4" />}
                    trend={trends?.investmentTrend}
                    status="neutral"
                    interpretation="Total investido no período"
                  />

                  {/* Revenue */}
                  <StatusMetricCard
                    title="Receita"
                    value={formatCurrency(metrics.valorConversaoTotal)}
                    icon={<Coins className="h-4 w-4" />}
                    trend={trends?.revenueTrend}
                    status={getStatusFromBenchmark(
                      metrics.valorConversaoTotal,
                      metrics.investimentoTotal * 3,
                      { warningThreshold: 0.67, dangerThreshold: 0.5 }
                    )}
                    interpretation="De anúncios"
                  />

                  {/* Net Profit */}
                  <StatusMetricCard
                    title="Lucro Líquido"
                    value={formatCurrency(netProfit)}
                    icon={<TrendingUp className="h-4 w-4" />}
                    status={netProfit > 0 ? 'success' : 'danger'}
                    interpretation="Receita - Investimento"
                  />

                  {/* Conversions */}
                  <StatusMetricCard
                    title="Conversões"
                    value={formatNumber(metrics.comprasTotal)}
                    icon={<ShoppingCart className="h-4 w-4" />}
                    trend={trends?.conversionsTrend}
                    status={getStatusFromBenchmark(
                      metrics.comprasTotal,
                      10,
                      { warningThreshold: 0.8, dangerThreshold: 0.5 }
                    )}
                    interpretation="Total de compras"
                  />

                  {/* CPA */}
                  <StatusMetricCard
                    title="CPA"
                    value={formatCurrency(metrics.custoPorCompra)}
                    icon={<Target className="h-4 w-4" />}
                    trend={trends?.cpaTrend}
                    invertTrend
                    status={getStatusFromBenchmark(
                      250,
                      metrics.custoPorCompra,
                      { invertComparison: true, warningThreshold: 0.8, dangerThreshold: 0.6 }
                    )}
                    benchmark={{ value: 250, label: 'Meta: R$ 250' }}
                    interpretation="Custo por aquisição"
                  />

                  {/* CPC */}
                  <StatusMetricCard
                    title="CPC"
                    value={formatCurrency(metrics.cpcMedio)}
                    icon={<MousePointerClick className="h-4 w-4" />}
                    trend={trends?.cpcTrend}
                    invertTrend
                    status={getStatusFromBenchmark(
                      2.5,
                      metrics.cpcMedio,
                      { invertComparison: true, warningThreshold: 0.8, dangerThreshold: 0.6 }
                    )}
                    benchmark={{ value: 2.5, label: 'Meta: R$ 2,50' }}
                    interpretation="Custo por clique"
                  />
                </div>
              </div>

              <Separator />

              {/* ===== ROW 2: Performance & Reach ===== */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Performance & Engagement */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Performance & Engajamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Conversões</p>
                        <p className="text-2xl font-bold text-foreground">{formatNumber(metrics.comprasTotal)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                        <p className="text-2xl font-bold text-foreground">{formatPercent(metrics.taxaConversao)}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">CPC Médio</p>
                        <p className="text-xl font-semibold text-foreground">{formatCurrency(metrics.cpcMedio)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">CTR Médio</p>
                        <p className="text-xl font-semibold text-foreground">{formatPercent(metrics.ctrMedio)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Reach & Visibility */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Eye className="h-5 w-5 text-primary" />
                      Alcance & Visibilidade
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Impressões</p>
                        <p className="text-2xl font-bold text-foreground">{formatNumber(metrics.impressoesTotal)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Cliques</p>
                        <p className="text-2xl font-bold text-foreground">{formatNumber(metrics.cliquesTotal)}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Eficiência de Cliques (CTR)</span>
                        <span className="font-medium">{formatPercent(metrics.ctrMedio)}</span>
                      </div>
                      <Progress value={Math.min(metrics.ctrMedio * 50, 100)} className="h-2" />
                      <p className={cn(
                        "text-xs",
                        metrics.ctrMedio >= 2 ? "text-green-600" : 
                        metrics.ctrMedio >= 1 ? "text-blue-600" : 
                        "text-yellow-600"
                      )}>
                        {metrics.ctrMedio >= 2 
                          ? '✅ CTR excelente' 
                          : metrics.ctrMedio >= 1 
                          ? '✓ CTR bom' 
                          : '⚠️ CTR pode melhorar'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* ===== ROW 3: Financial Summary ===== */}
              <Card className={cn(
                "border-2",
                netProfit > 0 
                  ? "border-green-200 bg-green-50/50" 
                  : "border-red-200 bg-red-50/50"
              )}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-primary" />
                    Resumo Financeiro do Período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Investido</p>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.investimentoTotal)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Receita Gerada</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.valorConversaoTotal)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                      <p className={cn(
                        "text-2xl font-bold",
                        netProfit > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {formatCurrency(netProfit)}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Eficiência Geral das Campanhas</p>
                      <p className="text-xs text-muted-foreground">
                        Para cada R$ 1,00 investido, você obteve R$ {metrics.roas.toFixed(2)}
                      </p>
                    </div>
                    <Badge 
                      variant={metrics.roas >= 3 ? "default" : "secondary"}
                      className="text-sm px-3 py-1"
                    >
                      {metrics.roas >= 3 ? '✓ Lucrativo' : '⚠️ Revisar'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* ===== ROW 4: Conversion Funnel ===== */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">🛒 Funil de Conversão</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <MetricCard
                    title="Taxa Add Carrinho (%)"
                    value={formatPercent(metrics.taxaAddCarrinho)}
                    icon={ShoppingCart}
                    subtitle="Adições ao carrinho / Views da LP"
                  />
                  <MetricCard
                    title="Taxa Conv. Carrinho (%)"
                    value={formatPercent(metrics.taxaConversaoCarrinho)}
                    icon={PackageCheck}
                    variant="success"
                    subtitle="Compras / Adições ao carrinho"
                  />
                  <MetricCard
                    title="Taxa Abandono Carrinho (%)"
                    value={formatPercent(metrics.taxaAbandonoCarrinho)}
                    icon={PackageX}
                    variant="warning"
                  />
                  <MetricCard
                    title="Total de Compras"
                    value={formatNumber(metrics.comprasTotal)}
                    icon={ShoppingBag}
                    variant="success"
                  />
                </div>
              </div>

              {/* Ads Breakdown */}
              {currentMonthAdsData.length > 0 && (
                <AdsBreakdown ads={currentMonthAdsData} selectedMonth={selectedMonth} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Ads;
