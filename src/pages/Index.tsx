import { useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Users, MousePointerClick, Eye, Target, TrendingDown, UserPlus, DollarSign, ShoppingCart, ShoppingBag, Coins, Heart, ExternalLink as ExternalLinkIcon, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { MonthlyAggregateChart } from "@/components/dashboard/MonthlyAggregateChart";
import { AccumulatedFollowersChart } from "@/components/dashboard/AccumulatedFollowersChart";
import { NewFollowersChart } from "@/components/dashboard/NewFollowersChart";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { FollowersUploader } from "@/components/dashboard/FollowersUploader";
import { AdsUploader } from "@/components/dashboard/AdsUploader";
import { MonthFilter } from "@/components/dashboard/MonthFilter";
import { calculateMonthlyMetrics, calculateGrowthMetrics, formatNumber, formatPercentage } from "@/utils/metricsCalculator";
import { calculateFollowersMetrics, calculateFollowersGrowth, formatFollowersNumber, formatFollowersGrowth } from "@/utils/followersCalculator";
import { calculateAdsMetrics, filterAdsByMonth } from "@/utils/adsCalculator";
import { MarketingData, FollowersData, AdsData } from "@/types/marketing";
import { useDashboard } from "@/contexts/DashboardContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLast12Months, getPrevious12Months, formatMonthRange } from "@/utils/dateRangeCalculator";
import { aggregateMarketingByMonth, aggregateFollowersByMonth, aggregateAdsByMonth } from "@/utils/monthlyAggregator";

const Index = () => {
  const {
    marketingData,
    followersData,
    adsData,
    selectedMonth,
    availableMonths,
    setMarketingData,
    setFollowersData,
    setAdsData,
    setSelectedMonth,
  } = useDashboard();

  // Detect 12-month view
  const isLast12MonthsView = selectedMonth === "last-12-months";
  
  // Get last 12 months
  const last12Months = useMemo(() => {
    if (!isLast12MonthsView) return [];
    return getLast12Months(availableMonths);
  }, [isLast12MonthsView, availableMonths]);

  // Filter marketing data by selected month or last 12 months
  const currentMonthData = useMemo(() => {
    if (!selectedMonth) return [];
    if (isLast12MonthsView) {
      return marketingData.filter((item) => 
        last12Months.some(month => item.Data.startsWith(month))
      );
    }
    return marketingData.filter((item) => item.Data.startsWith(selectedMonth));
  }, [marketingData, selectedMonth, isLast12MonthsView, last12Months]);

  // Get previous month/period marketing data for comparison
  const previousMonthData = useMemo(() => {
    if (!selectedMonth || availableMonths.length < 2) return [];
    
    if (isLast12MonthsView) {
      const previous12 = getPrevious12Months(availableMonths, last12Months);
      if (previous12.length === 0) return [];
      return marketingData.filter((item) => 
        previous12.some(month => item.Data.startsWith(month))
      );
    }
    
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex <= 0) return [];
    const previousMonth = availableMonths[currentIndex - 1];
    return marketingData.filter((item) => item.Data.startsWith(previousMonth));
  }, [marketingData, selectedMonth, availableMonths, isLast12MonthsView, last12Months]);

  // Filter followers data by selected month or last 12 months
  const currentMonthFollowersData = useMemo(() => {
    if (!selectedMonth) return [];
    if (isLast12MonthsView) {
      return followersData.filter((item) => 
        last12Months.some(month => item.Data.startsWith(month))
      );
    }
    return followersData.filter((item) => item.Data.startsWith(selectedMonth));
  }, [followersData, selectedMonth, isLast12MonthsView, last12Months]);

  // Get previous month/period followers data for comparison
  const previousMonthFollowersData = useMemo(() => {
    if (!selectedMonth || availableMonths.length < 2) return [];
    
    if (isLast12MonthsView) {
      const previous12 = getPrevious12Months(availableMonths, last12Months);
      if (previous12.length === 0) return [];
      return followersData.filter((item) => 
        previous12.some(month => item.Data.startsWith(month))
      );
    }
    
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex <= 0) return [];
    const previousMonth = availableMonths[currentIndex - 1];
    return followersData.filter((item) => item.Data.startsWith(previousMonth));
  }, [followersData, selectedMonth, availableMonths, isLast12MonthsView, last12Months]);

  const currentMetrics = useMemo(
    () => calculateMonthlyMetrics(currentMonthData),
    [currentMonthData]
  );

  const growthMetrics = useMemo(() => {
    if (previousMonthData.length === 0) {
      return { crescimentoVisualizacoes: 0, crescimentoAlcance: 0, crescimentoVisitas: 0 };
    }
    return calculateGrowthMetrics(currentMonthData, previousMonthData);
  }, [currentMonthData, previousMonthData]);

  // Calculate followers metrics
  const currentFollowersMetrics = useMemo(() => {
    const metrics = calculateFollowersMetrics(currentMonthFollowersData);
    
    if (previousMonthFollowersData.length > 0) {
      const growth = calculateFollowersGrowth(currentMonthFollowersData, previousMonthFollowersData);
      return {
        ...metrics,
        crescimentoAbsoluto: growth.crescimentoAbsoluto,
        crescimentoPercentual: growth.crescimentoPercentual,
      };
    }
    
    return metrics;
  }, [currentMonthFollowersData, previousMonthFollowersData]);

  // Filter ads data by selected month or last 12 months
  const currentMonthAdsData = useMemo(() => {
    if (!selectedMonth) return [];
    if (isLast12MonthsView) {
      return aggregateAdsByMonth(adsData, last12Months);
    }
    return filterAdsByMonth(adsData, selectedMonth);
  }, [adsData, selectedMonth, isLast12MonthsView, last12Months]);

  // Calculate ads metrics
  const currentAdsMetrics = useMemo(() => {
    if (currentMonthAdsData.length === 0) return null;
    return calculateAdsMetrics(currentMonthAdsData);
  }, [currentMonthAdsData]);

  const handleDataLoaded = (data: MarketingData[]) => {
    setMarketingData(data);
  };

  const handleFollowersDataLoaded = (data: FollowersData[]) => {
    setFollowersData(data);
  };

  const handleAdsDataLoaded = (data: AdsData[], fileName: string, summaries?: any[], isHierarchical?: boolean) => {
    setAdsData(data, summaries, isHierarchical);
  };

  // Aggregate data by month for 12-month view
  const monthlyMarketingData = useMemo(() => {
    if (!isLast12MonthsView) return [];
    return aggregateMarketingByMonth(marketingData, last12Months);
  }, [isLast12MonthsView, marketingData, last12Months]);

  const monthlyFollowersData = useMemo(() => {
    if (followersData.length === 0) return [];
    
    if (isLast12MonthsView) {
      return aggregateFollowersByMonth(followersData, last12Months);
    } else if (selectedMonth) {
      // Para mês único, pegar contexto de até 6 meses atrás para melhor visualização
      const monthIndex = availableMonths.indexOf(selectedMonth);
      const startIndex = Math.max(0, monthIndex - 5);
      const relevantMonths = availableMonths.slice(startIndex, monthIndex + 1);
      return aggregateFollowersByMonth(followersData, relevantMonths);
    }
    
    return [];
  }, [followersData, isLast12MonthsView, selectedMonth, last12Months, availableMonths]);

  // Check if we have any data
  const hasMarketingData = marketingData.length > 0;
  const hasFollowersData = followersData.length > 0;
  const hasAdsData = adsData.length > 0;
  const hasAnyData = hasMarketingData || hasFollowersData || hasAdsData;

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* CSV Uploaders */}
      <div className="grid gap-6 md:grid-cols-3">
        <CSVUploader onDataLoaded={handleDataLoaded} />
        <FollowersUploader onDataLoaded={handleFollowersDataLoaded} />
        <AdsUploader onDataLoaded={handleAdsDataLoaded} />
      </div>

      {/* Welcome message when no data */}
      {!hasAnyData && (
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>👋 Bem-vindo ao Dashboard de Marketing</CardTitle>
            <CardDescription>
              Para começar, faça upload das suas planilhas acima
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              📊 CSV de Marketing • 👥 CSV de Seguidores • 📢 CSV de Anúncios Meta
            </p>
          </CardContent>
        </Card>
      )}

      {/* Month Filter - only show when we have data */}
      {availableMonths.length > 0 && (
        <>
          <MonthFilter
            availableMonths={availableMonths}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
          
          {/* Period indicator badge for 12-month view */}
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
        </>
      )}

      {/* Show metrics only if month is selected and data exists */}
      {selectedMonth && hasMarketingData && currentMonthData.length > 0 ? (
          <>
            {/* Volume Metrics */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">📊 Volume (Totais do Mês)</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="👁️ Visualizações Totais"
                  value={formatNumber(currentMetrics.visualizacoesTotal)}
                  icon={Eye}
                  trend={previousMonthData.length > 0 ? growthMetrics.crescimentoVisualizacoes : undefined}
                />
                <MetricCard
                  title="📊 Alcance Total"
                  value={formatNumber(currentMetrics.alcanceTotal)}
                  icon={Users}
                  trend={previousMonthData.length > 0 ? growthMetrics.crescimentoAlcance : undefined}
                />
                <MetricCard
                  title="👤 Visitas ao Perfil"
                  value={formatNumber(currentMetrics.visitasTotal)}
                  icon={Users}
                  trend={previousMonthData.length > 0 ? growthMetrics.crescimentoVisitas : undefined}
                />
                <MetricCard
                  title="💬 Interações Totais"
                  value={formatNumber(currentMetrics.interacoesTotal)}
                  icon={Target}
                />
                <MetricCard
                  title="🔗 Cliques no Link"
                  value={formatNumber(currentMetrics.clicksTotal)}
                  icon={MousePointerClick}
                />
              </div>
            </div>

            {/* Followers Metrics */}
            {hasFollowersData && currentMonthFollowersData.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-foreground">👥 Seguidores</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <MetricCard
                    title="Total de Seguidores (Mês)"
                    value={formatFollowersNumber(currentFollowersMetrics.totalSeguidores)}
                    icon={Users}
                    trend={previousMonthFollowersData.length > 0 ? currentFollowersMetrics.crescimentoPercentual : undefined}
                    variant="success"
                  />
                  <MetricCard
                    title="Novos Seguidores"
                    value={formatFollowersNumber(currentFollowersMetrics.novosSeguidoresMes)}
                    icon={UserPlus}
                    subtitle="Total no mês"
                  />
                  <MetricCard
                    title="Crescimento"
                    value={formatFollowersGrowth(currentFollowersMetrics.crescimentoAbsoluto)}
                    icon={currentFollowersMetrics.crescimentoAbsoluto >= 0 ? TrendingUp : TrendingDown}
                    subtitle={previousMonthFollowersData.length > 0 ? `${currentFollowersMetrics.crescimentoPercentual >= 0 ? '+' : ''}${currentFollowersMetrics.crescimentoPercentual.toFixed(1)}%` : undefined}
                    variant={currentFollowersMetrics.crescimentoAbsoluto >= 0 ? "success" : undefined}
                  />
                </div>
              </div>
            )}

            {/* Efficiency Metrics */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">🎯 Eficiência (Taxas)</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <MetricCard
                  title="Taxa Alcance → Visita"
                  value={`${currentMetrics.taxaAlcanceVisita.toFixed(2)}%`}
                  icon={Target}
                  subtitle="Visitas / Alcance × 100"
                  variant="success"
                />
                <MetricCard
                  title="Taxa de Engajamento"
                  value={`${currentMetrics.taxaEngajamento.toFixed(2)}%`}
                  icon={TrendingUp}
                  subtitle="Interações / Alcance × 100"
                  variant={currentMetrics.taxaEngajamento > 1 ? "success" : "warning"}
                />
              </div>
            </div>

            {/* Growth Metrics */}
            {hasMarketingData && previousMonthData.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-foreground">📈 Crescimento (vs Mês Anterior)</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <MetricCard
                    title="👁️ Crescimento de Visualizações"
                    value={formatPercentage(growthMetrics.crescimentoVisualizacoes)}
                    icon={growthMetrics.crescimentoVisualizacoes >= 0 ? TrendingUp : TrendingDown}
                    variant={growthMetrics.crescimentoVisualizacoes >= 0 ? "success" : undefined}
                  />
                  <MetricCard
                    title="📊 Crescimento de Alcance"
                    value={formatPercentage(growthMetrics.crescimentoAlcance)}
                    icon={growthMetrics.crescimentoAlcance >= 0 ? TrendingUp : TrendingDown}
                    variant={growthMetrics.crescimentoAlcance >= 0 ? "success" : undefined}
                  />
                  <MetricCard
                    title="👤 Crescimento de Visitas"
                    value={formatPercentage(growthMetrics.crescimentoVisitas)}
                    icon={growthMetrics.crescimentoVisitas >= 0 ? TrendingUp : TrendingDown}
                    variant={growthMetrics.crescimentoVisitas >= 0 ? "success" : undefined}
                  />
                </div>
              </div>
            )}

            {/* Charts */}
            {isLast12MonthsView ? (
              <>
                <MonthlyAggregateChart
                  data={monthlyMarketingData}
                  title="📊 Visualizações × Alcance (Evolução Mensal)"
                  description="Compare o volume mensal de visualizações com o alcance total"
                  metrics={[
                    {
                      dataKey: "Visualizações",
                      name: "Visualizações",
                      color: "hsl(var(--chart-4))",
                    },
                    {
                      dataKey: "Alcance",
                      name: "Alcance",
                      color: "hsl(var(--chart-1))",
                    },
                  ]}
                />

                <MonthlyAggregateChart
                  data={monthlyMarketingData}
                  title="👥 Visitas × Interações (Evolução Mensal)"
                  description="Acompanhe a evolução mensal das visitas ao perfil e o nível de engajamento"
                  metrics={[
                    {
                      dataKey: "Visitas",
                      name: "Visitas",
                      color: "hsl(var(--chart-2))",
                    },
                    {
                      dataKey: "Interações",
                      name: "Interações",
                      color: "hsl(var(--chart-3))",
                    },
                  ]}
                />
              </>
            ) : (
              <>
                <TrendChart
                  data={currentMonthData}
                  title="📊 Visualizações × Alcance"
                  description="Compare o volume de visualizações com o alcance total"
                  metrics={[
                    {
                      dataKey: "visualizacoes",
                      name: "Visualizações",
                      color: "hsl(var(--chart-4))",
                    },
                    {
                      dataKey: "alcance",
                      name: "Alcance",
                      color: "hsl(var(--chart-1))",
                    },
                  ]}
                />

                <TrendChart
                  data={currentMonthData}
                  title="👥 Visitas × Interações"
                  description="Acompanhe as visitas ao perfil e o nível de engajamento"
                  metrics={[
                    {
                      dataKey: "visitas",
                      name: "Visitas",
                      color: "hsl(var(--chart-2))",
                    },
                    {
                      dataKey: "interacoes",
                      name: "Interações",
                      color: "hsl(var(--chart-3))",
                    },
                  ]}
                />
              </>
            )}

            {hasFollowersData && monthlyFollowersData.length > 0 && (
              <div className="col-span-full grid gap-4 md:grid-cols-2">
                <AccumulatedFollowersChart
                  data={monthlyFollowersData}
                  title="Seguidores Acumulados"
                  description="Total de seguidores ao longo do tempo"
                />
                <NewFollowersChart
                  data={monthlyFollowersData}
                  title="Novos Seguidores"
                  description="Crescimento mensal da base de seguidores"
                />
              </div>
            )}

            {/* Ads Section */}
            {hasAdsData && currentAdsMetrics && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">💰 Anúncios (Meta Ads)</h2>
                  <Link to="/ads">
                    <Button variant="outline" className="gap-2">
                      Ver Análise Completa
                      <ExternalLinkIcon className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {/* Investimento e Performance */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-foreground">💵 Investimento e Performance</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <MetricCard
                      title="Investimento Total"
                      value={`R$ ${currentAdsMetrics.investimentoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                      icon={DollarSign}
                      variant="default"
                    />
                    <MetricCard
                      title="Impressões"
                      value={formatNumber(currentAdsMetrics.impressoesTotal)}
                      icon={Eye}
                      subtitle={`CPM médio: R$ ${currentAdsMetrics.cpmMedio.toFixed(2)}`}
                    />
                    <MetricCard
                      title="Alcance Total"
                      value={formatNumber(currentAdsMetrics.alcanceTotal)}
                      icon={Users}
                      subtitle={`Frequência: ${currentAdsMetrics.frequenciaMedia.toFixed(2)}`}
                    />
                  </div>
                </div>

                {/* Cliques e Engajamento */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-foreground">🖱️ Cliques e Engajamento</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <MetricCard
                      title="Cliques Totais"
                      value={formatNumber(currentAdsMetrics.cliquesTotal)}
                      icon={MousePointerClick}
                      subtitle={`CTR: ${currentAdsMetrics.ctrMedio.toFixed(2)}%`}
                    />
                    <MetricCard
                      title="CPC Médio"
                      value={`R$ ${currentAdsMetrics.cpcMedio.toFixed(2)}`}
                      icon={TrendingDown}
                      subtitle={`${formatNumber(currentAdsMetrics.cliquesLinkTotal)} cliques no link`}
                    />
                    <MetricCard
                      title="Engajamentos"
                      value={formatNumber(currentAdsMetrics.engajamentosTotal)}
                      icon={Heart}
                    />
                  </div>
                </div>

                {/* Funil de Conversão */}
                {(currentAdsMetrics.visualizacoesPaginaTotal > 0 || currentAdsMetrics.adicoesCarrinhoTotal > 0 || currentAdsMetrics.comprasTotal > 0) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">🛒 Funil de Conversão</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {currentAdsMetrics.visualizacoesPaginaTotal > 0 && (
                        <MetricCard
                          title="Visualizações de Página"
                          value={formatNumber(currentAdsMetrics.visualizacoesPaginaTotal)}
                          icon={ExternalLinkIcon}
                        />
                      )}
                      {currentAdsMetrics.adicoesCarrinhoTotal > 0 && (
                        <MetricCard
                          title="Adições ao Carrinho"
                          value={formatNumber(currentAdsMetrics.adicoesCarrinhoTotal)}
                          icon={ShoppingCart}
                        />
                      )}
                      {currentAdsMetrics.comprasTotal > 0 && (
                        <MetricCard
                          title="Compras"
                          value={formatNumber(currentAdsMetrics.comprasTotal)}
                          icon={ShoppingBag}
                          subtitle={currentAdsMetrics.adicoesCarrinhoTotal > 0 ? `Taxa de conversão: ${currentAdsMetrics.taxaConversaoCarrinho.toFixed(1)}%` : undefined}
                          variant="success"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* ROI e Conversão */}
                {(currentAdsMetrics.valorConversaoTotal > 0 || currentAdsMetrics.roas > 0 || currentAdsMetrics.custoPorCompra > 0) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">💎 ROI e Conversão</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {currentAdsMetrics.valorConversaoTotal > 0 && (
                        <MetricCard
                          title="Valor de Conversão"
                          value={`R$ ${currentAdsMetrics.valorConversaoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                          icon={Coins}
                          variant="success"
                        />
                      )}
                      {currentAdsMetrics.roas > 0 && (
                        <MetricCard
                          title="ROAS"
                          value={`${currentAdsMetrics.roas.toFixed(2)}x`}
                          icon={TrendingUp}
                          subtitle={`Para cada R$ 1 investido: R$ ${currentAdsMetrics.roas.toFixed(2)}`}
                          variant={currentAdsMetrics.roas >= 2 ? "success" : currentAdsMetrics.roas >= 1 ? "default" : "warning"}
                        />
                      )}
                      {currentAdsMetrics.custoPorCompra > 0 && (
                        <MetricCard
                          title="Custo por Compra"
                          value={`R$ ${currentAdsMetrics.custoPorCompra.toFixed(2)}`}
                          icon={Target}
                        />
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}
    </div>
  );
};

export default Index;
