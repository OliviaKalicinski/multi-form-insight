import { useCustomerData } from "@/hooks/useCustomerData";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChurnFunnelChart } from "@/components/dashboard/ChurnFunnelChart";
import { ChurnRiskTable } from "@/components/dashboard/ChurnRiskTable";
import { KPITooltip } from "@/components/dashboard/KPITooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Users, UserMinus, DollarSign, FileWarning, TrendingDown } from "lucide-react";

export default function AnaliseChurn() {
  const { churnMetrics, churnRiskCustomers, isLoading } = useCustomerData();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (churnMetrics.totalClientes === 0) {
    return (
      <div className="p-6 space-y-6">
        <EmptyState
          icon={<FileWarning className="h-8 w-8 text-muted-foreground" />}
          title="Sem dados de clientes"
          description="Faça upload de dados de vendas para visualizar a análise de churn."
        />
      </div>
    );
  }

  const { totalClientes, clientesAtivos, clientesEmRisco, clientesInativos, clientesChurn, taxaChurn } = churnMetrics;
  const valorEmRisco = churnRiskCustomers.reduce((sum, c) => sum + c.valorTotal, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Análise de Churn</h1>
            <p className="text-muted-foreground">
              Identifique clientes em risco e monitore a retenção da base
            </p>
          </div>
        </div>
        
        {/* Period indicator */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            📅 <strong>Período:</strong> Todo o histórico (fonte: banco de dados)
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <KPITooltip metricKey="taxa_churn">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Taxa de Churn
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {taxaChurn.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes que pararam de comprar
              </p>
            </CardContent>
          </Card>
        </KPITooltip>

        <KPITooltip metricKey="clientes_ativos">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Clientes Ativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {clientesAtivos.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalClientes > 0 ? ((clientesAtivos / totalClientes) * 100).toFixed(1) : 0}% da base
              </p>
            </CardContent>
          </Card>
        </KPITooltip>

        <KPITooltip metricKey="clientes_em_risco">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Em Risco
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {clientesEmRisco.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalClientes > 0 ? ((clientesEmRisco / totalClientes) * 100).toFixed(1) : 0}% da base
              </p>
            </CardContent>
          </Card>
        </KPITooltip>

        <KPITooltip metricKey="clientes_inativos">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <UserMinus className="h-4 w-4" />
                Inativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {clientesInativos.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalClientes > 0 ? ((clientesInativos / totalClientes) * 100).toFixed(1) : 0}% da base
              </p>
            </CardContent>
          </Card>
        </KPITooltip>

        <KPITooltip metricKey="valor_em_risco">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Valor em Risco
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                R$ {valorEmRisco.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Receita potencial perdida
              </p>
            </CardContent>
          </Card>
        </KPITooltip>
      </div>

      {/* Retention Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Funil de Retenção
          </CardTitle>
          <CardDescription>
            Distribuição de clientes por status de atividade
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ChurnFunnelChart 
            ativos={clientesAtivos}
            emRisco={clientesEmRisco}
            inativos={clientesInativos}
            churn={clientesChurn}
          />
        </CardContent>
      </Card>

      {/* Customers at Risk Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Clientes em Risco de Churn
          </CardTitle>
          <CardDescription>
            Lista de clientes que podem abandonar a marca
          </CardDescription>
        </CardHeader>
        <CardContent>
          {churnRiskCustomers.length > 0 ? (
            <ChurnRiskTable customers={churnRiskCustomers} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cliente em risco identificado.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
