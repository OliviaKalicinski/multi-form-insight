import { Package, Tag, Gift, Truck, Clock } from "lucide-react";
import { SalesMetricCard } from "./SalesMetricCard";
import { ProductOperationsMetrics } from "@/types/marketing";

interface ProductOperationsSummaryCardsProps {
  metrics: ProductOperationsMetrics;
  viewMode?: 'as-sold' | 'individual';
}

export const ProductOperationsSummaryCards = ({ 
  metrics, 
  viewMode = 'as-sold' 
}: ProductOperationsSummaryCardsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <SalesMetricCard
        title="Total de Produtos"
        value={metrics.totalProducts}
        icon={Package}
        subtitle={
          viewMode === 'as-sold' 
            ? 'Produtos únicos (kits agrupados)' 
            : 'Produtos individuais (kits desmembrados)'
        }
      />
      <SalesMetricCard
        title="Total de SKUs"
        value={metrics.totalSKUs}
        icon={Tag}
        subtitle="Códigos de produto únicos"
      />
      <SalesMetricCard
        title="Produtos Brinde"
        value={metrics.freebieProducts.length}
        icon={Gift}
        subtitle="Itens promocionais (R$ 0,01)"
        variant={metrics.freebieProducts.length > 0 ? "success" : "default"}
      />
      <SalesMetricCard
        title="Formas de Envio"
        value={metrics.shippingMethodStats.length}
        icon={Truck}
        subtitle="Métodos de entrega diferentes"
      />
      <SalesMetricCard
        title="Tempo Médio Emissão NF"
        value={`${metrics.averageNFIssuanceTime.toFixed(1)} dias`}
        icon={Clock}
        subtitle="Venda até emissão de nota fiscal"
        variant={metrics.averageNFIssuanceTime <= 3 ? "success" : metrics.averageNFIssuanceTime <= 7 ? "default" : "warning"}
      />
    </div>
  );
};
