import { DollarSign, TrendingUp, ShoppingCart, Award, Calendar, TrendingDown } from "lucide-react";
import { SalesMetricCard } from "./SalesMetricCard";
import { FinancialMetrics } from "@/types/marketing";
import { formatCurrency, formatPercentage, formatQuantity } from "@/utils/salesCalculator";

interface FinancialSummaryCardsProps {
  metrics: FinancialMetrics;
}

export const FinancialSummaryCards = ({ metrics }: FinancialSummaryCardsProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <SalesMetricCard
        title="Faturamento Total"
        value={formatCurrency(metrics.faturamentoTotal)}
        icon={DollarSign}
        subtitle="No período selecionado"
        trend={
          metrics.growthRate !== 0
            ? {
                value: metrics.growthRate,
                label: "vs mês anterior",
              }
            : undefined
        }
        variant={metrics.growthRate > 0 ? "success" : metrics.growthRate < 0 ? "warning" : "default"}
      />

      <SalesMetricCard
        title="Ticket Médio"
        value={formatCurrency(metrics.ticketMedio)}
        icon={TrendingUp}
        subtitle="Por pedido"
      />

      <SalesMetricCard
        title="Total de Pedidos"
        value={formatQuantity(metrics.totalPedidos)}
        icon={ShoppingCart}
        subtitle="Pedidos únicos"
      />

      <SalesMetricCard
        title="Melhor Plataforma"
        value={metrics.topPlatform}
        icon={Award}
        subtitle={`${metrics.platformPerformance[0]?.marketShare.toFixed(1)}% do faturamento`}
        variant="success"
      />

      <SalesMetricCard
        title="Melhor Mês"
        value={metrics.seasonality.bestMonth}
        icon={Calendar}
        subtitle="Maior faturamento"
      />

      <SalesMetricCard
        title="Pior Mês"
        value={metrics.seasonality.worstMonth}
        icon={TrendingDown}
        subtitle="Menor faturamento"
      />

      <SalesMetricCard
        title="Índice de Sazonalidade"
        value={formatPercentage(metrics.seasonality.seasonalityIndex)}
        icon={TrendingUp}
        subtitle="Variação ao longo do tempo"
      />
    </div>
  );
};
