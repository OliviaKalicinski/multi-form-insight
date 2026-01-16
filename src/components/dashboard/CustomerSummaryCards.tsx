import { CustomerBehaviorMetrics } from "@/types/marketing";
import { SalesMetricCard } from "./SalesMetricCard";
import { Users, Repeat, CheckCircle, AlertTriangle, Moon, XCircle, Shield, DollarSign } from "lucide-react";
import { formatCurrency, formatQuantity, formatPercentage } from "@/utils/salesCalculator";

interface CustomerSummaryCardsProps {
  metrics: CustomerBehaviorMetrics;
}

export const CustomerSummaryCards = ({ metrics }: CustomerSummaryCardsProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <SalesMetricCard
        title="Total de Clientes"
        value={formatQuantity(metrics.totalClientes)}
        icon={Users}
        subtitle="Clientes únicos"
        tooltipKey="total_clientes"
      />
      
      <SalesMetricCard
        title="Taxa de Recompra"
        value={formatPercentage(metrics.taxaRecompra)}
        icon={Repeat}
        subtitle="Clientes com 2+ pedidos"
        variant={metrics.taxaRecompra >= 30 ? "success" : "warning"}
        tooltipKey="taxa_recompra"
      />
      
      <SalesMetricCard
        title="Clientes Ativos"
        value={formatQuantity(metrics.clientesAtivos)}
        icon={CheckCircle}
        subtitle="Última compra < 30 dias"
        variant="success"
        tooltipKey="clientes_ativos"
      />
      
      <SalesMetricCard
        title="Clientes em Risco"
        value={formatQuantity(metrics.clientesEmRisco)}
        icon={AlertTriangle}
        subtitle="31-60 dias sem comprar"
        variant="warning"
        tooltipKey="clientes_em_risco"
      />
      
      <SalesMetricCard
        title="Clientes Inativos"
        value={formatQuantity(metrics.clientesInativos)}
        icon={Moon}
        subtitle="61-90 dias sem comprar"
        tooltipKey="clientes_inativos"
      />
      
      <SalesMetricCard
        title="Clientes Churn"
        value={formatQuantity(metrics.clientesChurn)}
        icon={XCircle}
        subtitle="90+ dias sem comprar"
        tooltipKey="clientes_churn"
      />
      
      <SalesMetricCard
        title="Taxa de Retenção"
        value={formatPercentage(metrics.taxaRetencao)}
        icon={Shield}
        subtitle="Clientes não perdidos"
        variant={metrics.taxaRetencao >= 70 ? "success" : "warning"}
        tooltipKey="taxa_retencao"
      />
      
      <SalesMetricCard
        title="Customer Lifetime Value"
        value={formatCurrency(metrics.customerLifetimeValue)}
        icon={DollarSign}
        subtitle="Valor médio por cliente"
        tooltipKey="clv"
      />
    </div>
  );
};
