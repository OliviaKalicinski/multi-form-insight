import { PieChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerSegmentationChart } from "@/components/dashboard/CustomerSegmentationChart";
import { SegmentRevenueChart } from "@/components/dashboard/SegmentRevenueChart";
import { SegmentDetailTable } from "@/components/dashboard/SegmentDetailTable";
import { useCustomerData } from "@/hooks/useCustomerData";
import { Skeleton } from "@/components/ui/skeleton";

export default function SegmentacaoClientes() {
  const { segments, isLoading } = useCustomerData();

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8 space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (segments.length === 0) {
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
            💡 <strong>Período:</strong> Exibindo dados de <strong>todo o histórico</strong> (fonte: banco de dados).
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
            <CustomerSegmentationChart segments={segments} />
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
            <SegmentRevenueChart segments={segments} />
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
          <SegmentDetailTable segments={segments} />
        </CardContent>
      </Card>
    </div>
  );
}
