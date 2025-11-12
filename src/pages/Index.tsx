import { useState, useMemo } from "react";
import { TrendingUp, Users, MousePointerClick, Eye, Target, TrendingDown } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { MonthFilter } from "@/components/dashboard/MonthFilter";
import { marketingData as defaultData } from "@/data/marketingData";
import { calculateMonthlyMetrics, calculateGrowthMetrics, formatNumber } from "@/utils/metricsCalculator";
import { MarketingData } from "@/types/marketing";

const Index = () => {
  const [marketingData, setMarketingData] = useState<MarketingData[]>(defaultData);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // Extract available months from data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    marketingData.forEach((item) => {
      const month = item.Data.substring(0, 7); // YYYY-MM
      months.add(month);
    });
    return Array.from(months).sort();
  }, [marketingData]);

  // Set initial selected month
  useMemo(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  // Filter data by selected month
  const currentMonthData = useMemo(() => {
    if (!selectedMonth) return [];
    return marketingData.filter((item) => item.Data.startsWith(selectedMonth));
  }, [marketingData, selectedMonth]);

  // Get previous month data for comparison
  const previousMonthData = useMemo(() => {
    if (!selectedMonth || availableMonths.length < 2) return [];
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex <= 0) return [];
    const previousMonth = availableMonths[currentIndex - 1];
    return marketingData.filter((item) => item.Data.startsWith(previousMonth));
  }, [marketingData, selectedMonth, availableMonths]);

  const currentMetrics = useMemo(
    () => calculateMonthlyMetrics(currentMonthData),
    [currentMonthData]
  );

  const growthMetrics = useMemo(() => {
    if (previousMonthData.length === 0) {
      return { crescimentoAlcance: 0, crescimentoVisitas: 0 };
    }
    return calculateGrowthMetrics(currentMonthData, previousMonthData);
  }, [currentMonthData, previousMonthData]);

  const handleDataLoaded = (data: MarketingData[], fileName: string) => {
    setMarketingData(data);
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

        {/* CSV Uploader */}
        <CSVUploader onDataLoaded={handleDataLoaded} />

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
                  title="Alcance Total"
                  value={formatNumber(currentMetrics.alcanceTotal)}
                  icon={TrendingUp}
                  trend={previousMonthData.length > 0 ? growthMetrics.crescimentoAlcance : undefined}
                />
                <MetricCard
                  title="Visitas ao Perfil"
                  value={formatNumber(currentMetrics.visitasTotal)}
                  icon={Users}
                  trend={previousMonthData.length > 0 ? growthMetrics.crescimentoVisitas : undefined}
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
            {previousMonthData.length > 0 && (
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
            )}

            {/* Charts */}
            <TrendChart
              data={currentMonthData}
              title="Tendência de Desempenho"
              description="Visualize a evolução das métricas ao longo do período"
            />
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
