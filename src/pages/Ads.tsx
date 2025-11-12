import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  Coins,
  TrendingUp,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MonthFilter } from "@/components/dashboard/MonthFilter";
import { useDashboard } from "@/contexts/DashboardContext";
import { calculateAdsMetrics, filterAdsByMonth } from "@/utils/adsCalculator";

const Ads = () => {
  const navigate = useNavigate();
  const { adsData, selectedMonth, availableMonths, setSelectedMonth } = useDashboard();

  const currentMonthAdsData = useMemo(() => {
    if (!selectedMonth) return [];
    return filterAdsByMonth(adsData, selectedMonth);
  }, [adsData, selectedMonth]);

  const metrics = useMemo(() => {
    return calculateAdsMetrics(currentMonthAdsData);
  }, [currentMonthAdsData]);

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

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Month Filter */}
      {availableMonths.length > 0 && (
        <MonthFilter
          availableMonths={availableMonths}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
      )}

      {/* KPIs */}
      {adsData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">
              Nenhum dado de anúncios disponível.
              <br />
              Faça upload de um arquivo CSV/TSV do Meta Ads Manager na página "Visão Geral".
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Ir para Visão Geral
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
            {/* Seção 1: Investimento e Retorno */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">💰 Investimento e Retorno</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  title="Investimento Total"
                  value={formatCurrency(metrics.investimentoTotal)}
                  icon={DollarSign}
                />
                <MetricCard
                  title="Receita Total"
                  value={formatCurrency(metrics.valorConversaoTotal)}
                  icon={Coins}
                  variant="success"
                />
                <MetricCard
                  title="ROAS"
                  value={formatRoas(metrics.roas)}
                  icon={TrendingUp}
                  subtitle={metrics.roas >= 3 ? "Excelente retorno" : metrics.roas >= 2 ? "Bom retorno" : "Abaixo do ideal"}
                  variant={metrics.roas >= 3 ? "success" : metrics.roas >= 2 ? "default" : "warning"}
                />
                <MetricCard
                  title="ROI (%)"
                  value={formatPercent(metrics.roi)}
                  icon={Percent}
                  variant={metrics.roi > 0 ? "success" : "warning"}
                />
                <MetricCard
                  title="Ticket Médio"
                  value={formatCurrency(metrics.ticketMedio)}
                  icon={ShoppingBag}
                />
              </div>
            </div>

            {/* Seção 2: Performance e Alcance */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">📊 Performance e Alcance</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  title="CPM Médio"
                  value={formatCurrency(metrics.cpmMedio)}
                  icon={Eye}
                  subtitle="Custo por 1.000 impressões"
                />
                <MetricCard
                  title="CPC Médio"
                  value={formatCurrency(metrics.cpcMedio)}
                  icon={MousePointerClick}
                  subtitle="Custo por clique"
                />
                <MetricCard
                  title="Impressões Totais"
                  value={formatNumber(metrics.impressoesTotal)}
                  icon={BarChart3}
                  subtitle={`CPM: ${formatCurrency(metrics.cpmMedio)}`}
                />
                <MetricCard
                  title="Alcance Total"
                  value={formatNumber(metrics.alcanceTotal)}
                  icon={Users}
                />
                <MetricCard
                  title="Frequência Média"
                  value={metrics.frequenciaMedia.toFixed(2)}
                  icon={Repeat}
                  subtitle="Vezes que cada pessoa viu o anúncio"
                />
                <MetricCard
                  title="CPA (Custo por Aquisição)"
                  value={formatCurrency(metrics.custoPorCompra)}
                  icon={Target}
                />
              </div>
            </div>

            {/* Seção 3: Engajamento e Cliques */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">🎯 Engajamento e Cliques</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  title="CTR (%)"
                  value={formatPercent(metrics.ctrMedio)}
                  icon={MousePointerClick}
                  subtitle="Taxa de cliques"
                />
                <MetricCard
                  title="Taxa de Engajamento (%)"
                  value={formatPercent(metrics.taxaEngajamento)}
                  icon={Heart}
                />
                <MetricCard
                  title="Cliques Totais"
                  value={formatNumber(metrics.cliquesTotal)}
                  icon={MessageSquare}
                  subtitle={`Cliques de saída: ${formatNumber(metrics.cliquesDesaida)}`}
                />
                <MetricCard
                  title="Engajamentos Totais"
                  value={formatNumber(metrics.engajamentosTotal)}
                  icon={Heart}
                />
                <MetricCard
                  title="Taxa de Conversão (%)"
                  value={formatPercent(metrics.taxaConversao)}
                  icon={CheckCircle}
                  variant="success"
                  subtitle="Compras / Cliques de saída"
                />
              </div>
            </div>

            {/* Seção 4: Funil de Conversão */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">🛒 Funil de Conversão</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        </div>
      )}
    </div>
  );
};

export default Ads;
