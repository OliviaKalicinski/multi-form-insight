import { useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { PieChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerSegmentationChart } from "@/components/dashboard/CustomerSegmentationChart";
import { SegmentRevenueChart } from "@/components/dashboard/SegmentRevenueChart";
import { SegmentDetailTable } from "@/components/dashboard/SegmentDetailTable";
import { calculateCustomerBehaviorMetrics } from "@/utils/customerBehaviorMetrics";

export default function SegmentacaoClientes() {
  const { salesData } = useDashboard();

  // ALWAYS use all data for segmentation - ignore month filter
  const behaviorMetrics = useMemo(() => {
    if (salesData.length === 0) return null;
    return calculateCustomerBehaviorMetrics(salesData);
  }, [salesData]);

  if (salesData.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-6 h-6" />
              🎯 Segmentação de Clientes
            </CardTitle>
            <CardDescription>
              Carregue os dados de vendas na página "Upload" para visualizar a segmentação de clientes.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <PieChart className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">🎯 Segmentação de Clientes</h1>
          <p className="text-muted-foreground">
            Distribuição por comportamento de compra e contribuição para o faturamento
          </p>
        </div>
      </div>

      {/* Indicador de período - fixo para "todo o histórico" */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="py-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 <strong>Período:</strong> Exibindo dados de <strong>todo o histórico</strong>.
          </p>
        </CardContent>
      </Card>

      {/* Gráficos de segmentação */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Clientes</CardTitle>
            <CardDescription>
              Segmentação por comportamento de compra
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerSegmentationChart
              segments={behaviorMetrics?.customerSegmentation || []}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita por Segmento</CardTitle>
            <CardDescription>
              Contribuição de cada perfil para o faturamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SegmentRevenueChart
              segments={behaviorMetrics?.customerSegmentation || []}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tabela detalhada de segmentos */}
      <Card>
        <CardHeader>
          <CardTitle>Análise Detalhada por Segmento</CardTitle>
          <CardDescription>
            Métricas completas de cada perfil de cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SegmentDetailTable
            segments={behaviorMetrics?.customerSegmentation || []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
