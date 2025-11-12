import { useMemo } from "react";
import { TrendingUp, Users, MousePointerClick, Eye, Target, TrendingDown } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { marketingData } from "@/data/marketingData";
import { calculateMonthlyMetrics, calculateGrowthMetrics, formatNumber } from "@/utils/metricsCalculator";

const Index = () => {
  const januaryData = useMemo(() => marketingData.filter((item) => item.Data.startsWith("2025-01")), []);
  const februaryData = useMemo(() => marketingData.filter((item) => item.Data.startsWith("2025-02")), []);

  const currentMetrics = useMemo(() => calculateMonthlyMetrics(februaryData), [februaryData]);
  const growthMetrics = useMemo(() => calculateGrowthMetrics(februaryData, januaryData), [februaryData, januaryData]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Dashboard de Marketing</h1>
          <p className="text-muted-foreground">Visualize e analise suas principais métricas de desempenho</p>
        </div>

        {/* Volume Metrics */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">📊 Volume (Totais do Mês)</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Alcance Total"
              value={formatNumber(currentMetrics.alcanceTotal)}
              icon={TrendingUp}
              trend={growthMetrics.crescimentoAlcance}
            />
            <MetricCard
              title="Visitas ao Perfil"
              value={formatNumber(currentMetrics.visitasTotal)}
              icon={Users}
              trend={growthMetrics.crescimentoVisitas}
            />
            <MetricCard
              title="Interações Totais"
              value={formatNumber(currentMetrics.interacoesTotal)}
              icon={Eye}
            />
            <MetricCard
              title="Cliques no Link"
              value={formatNumber(currentMetrics.clicksTotal)}
              icon={MousePointerClick}
            />
          </div>
        </div>

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
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">📈 Crescimento (vs Mês Anterior)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard
              title="Crescimento de Alcance"
              value={`${growthMetrics.crescimentoAlcance >= 0 ? "+" : ""}${growthMetrics.crescimentoAlcance.toFixed(1)}%`}
              icon={growthMetrics.crescimentoAlcance >= 0 ? TrendingUp : TrendingDown}
              variant={growthMetrics.crescimentoAlcance >= 0 ? "success" : undefined}
            />
            <MetricCard
              title="Crescimento de Visitas"
              value={`${growthMetrics.crescimentoVisitas >= 0 ? "+" : ""}${growthMetrics.crescimentoVisitas.toFixed(1)}%`}
              icon={growthMetrics.crescimentoVisitas >= 0 ? TrendingUp : TrendingDown}
              variant={growthMetrics.crescimentoVisitas >= 0 ? "success" : undefined}
            />
          </div>
        </div>

        {/* Charts */}
        <TrendChart
          data={februaryData}
          title="Tendência de Desempenho"
          description="Visualize a evolução das métricas ao longo do período"
        />
      </div>
    </div>
  );
};

export default Index;
