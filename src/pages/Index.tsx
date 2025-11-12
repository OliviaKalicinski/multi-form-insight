import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Users, MousePointerClick, Eye, Target, TrendingDown, UserPlus, DollarSign, ShoppingCart, ShoppingBag, Coins, Heart, ExternalLink as ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { FollowersChart } from "@/components/dashboard/FollowersChart";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { FollowersUploader } from "@/components/dashboard/FollowersUploader";
import { AdsUploader } from "@/components/dashboard/AdsUploader";
import { MonthFilter } from "@/components/dashboard/MonthFilter";
import { marketingData as defaultData } from "@/data/marketingData";
import { followersData as defaultFollowersData } from "@/data/followersData";
import { defaultAdsData } from "@/data/adsData";
import { calculateMonthlyMetrics, calculateGrowthMetrics, formatNumber, formatPercentage } from "@/utils/metricsCalculator";
import { calculateFollowersMetrics, calculateFollowersGrowth, formatFollowersNumber, formatFollowersGrowth } from "@/utils/followersCalculator";
import { calculateAdsMetrics, filterAdsByMonth } from "@/utils/adsCalculator";
import { MarketingData, FollowersData, AdsData } from "@/types/marketing";

const Index = () => {
  const [marketingData, setMarketingData] = useState<MarketingData[]>(defaultData);
  const [followersData, setFollowersData] = useState<FollowersData[]>(defaultFollowersData);
  const [adsData, setAdsData] = useState<AdsData[]>(defaultAdsData);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // Extract available months from marketing, followers, and ads data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    marketingData.forEach((item) => {
      const month = item.Data.substring(0, 7); // YYYY-MM
      months.add(month);
    });
    followersData.forEach((item) => {
      const month = item.Data.substring(0, 7); // YYYY-MM
      months.add(month);
    });
    adsData.forEach((item) => {
      const month = item["Início dos relatórios"].substring(0, 7); // YYYY-MM
      months.add(month);
    });
    return Array.from(months).sort();
  }, [marketingData, followersData, adsData]);

  // Set initial selected month
  useMemo(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  // Filter marketing data by selected month
  const currentMonthData = useMemo(() => {
    if (!selectedMonth) return [];
    return marketingData.filter((item) => item.Data.startsWith(selectedMonth));
  }, [marketingData, selectedMonth]);

  // Get previous month marketing data for comparison
  const previousMonthData = useMemo(() => {
    if (!selectedMonth || availableMonths.length < 2) return [];
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex <= 0) return [];
    const previousMonth = availableMonths[currentIndex - 1];
    return marketingData.filter((item) => item.Data.startsWith(previousMonth));
  }, [marketingData, selectedMonth, availableMonths]);

  // Filter followers data by selected month
  const currentMonthFollowersData = useMemo(() => {
    if (!selectedMonth) return [];
    return followersData.filter((item) => item.Data.startsWith(selectedMonth));
  }, [followersData, selectedMonth]);

  // Get previous month followers data for comparison
  const previousMonthFollowersData = useMemo(() => {
    if (!selectedMonth || availableMonths.length < 2) return [];
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex <= 0) return [];
    const previousMonth = availableMonths[currentIndex - 1];
    return followersData.filter((item) => item.Data.startsWith(previousMonth));
  }, [followersData, selectedMonth, availableMonths]);

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

  // Filter ads data by selected month
  const currentMonthAdsData = useMemo(() => {
    if (!selectedMonth) return [];
    return filterAdsByMonth(adsData, selectedMonth);
  }, [adsData, selectedMonth]);

  // Calculate ads metrics
  const currentAdsMetrics = useMemo(() => {
    if (currentMonthAdsData.length === 0) return null;
    return calculateAdsMetrics(currentMonthAdsData);
  }, [currentMonthAdsData]);

  const handleDataLoaded = (data: MarketingData[], fileName: string) => {
    setMarketingData(data);
    setSelectedMonth(""); // Reset selection to trigger auto-select of latest month
  };

  const handleFollowersDataLoaded = (data: FollowersData[], fileName: string) => {
    setFollowersData(data);
    setSelectedMonth(""); // Reset selection to trigger auto-select of latest month
  };

  const handleAdsDataLoaded = (data: AdsData[], fileName: string) => {
    setAdsData(data);
    setSelectedMonth(""); // Reset selection to trigger auto-select of latest month
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Dashboard de Marketing</h1>
          <p className="text-muted-foreground">Visualize e analise suas principais métricas de desempenho</p>
        </div>

        {/* CSV Uploaders */}
          <div className="grid gap-6 md:grid-cols-3">
            <CSVUploader onDataLoaded={handleDataLoaded} />
            <FollowersUploader onDataLoaded={handleFollowersDataLoaded} />
            <AdsUploader onDataLoaded={handleAdsDataLoaded} />
          </div>

        {/* Month Filter */}
        {availableMonths.length > 0 && (
          <MonthFilter
            availableMonths={availableMonths}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        )}

        {/* Show metrics only if month is selected and data exists */}
        {selectedMonth && currentMonthData.length > 0 ? (
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
            {currentMonthFollowersData.length > 0 && (
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
            {previousMonthData.length > 0 && (
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

            {currentMonthFollowersData.length > 0 && (
              <FollowersChart
                data={currentMonthFollowersData}
                title="Evolução de Seguidores"
                description="Acompanhe o crescimento da sua base de seguidores"
              />
            )}

            {/* Ads Section */}
            {currentAdsMetrics && (
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
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {availableMonths.length === 0
                ? "Faça upload de um arquivo CSV para começar"
                : "Selecione um mês para visualizar os dados"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
