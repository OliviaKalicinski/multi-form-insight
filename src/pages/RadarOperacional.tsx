import { useRadarOperacional, type OverallStatus } from "@/hooks/useRadarOperacional";
import { StatusMetricCard } from "@/components/dashboard/StatusMetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Truck,
  Package,
  Tag,
  Layers,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<OverallStatus, { label: string; color: string; bg: string }> = {
  estavel: { label: 'Estável', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  indicio: { label: 'Indício', color: 'text-amber-700', bg: 'bg-amber-100' },
  desvio: { label: 'Desvio', color: 'text-red-700', bg: 'bg-red-100' },
};

const axisIcons: Record<string, React.ReactNode> = {
  transportador: <Truck className="h-5 w-5" />,
  produto: <Package className="h-5 w-5" />,
  lote: <Layers className="h-5 w-5" />,
  tipo_reclamacao: <Tag className="h-5 w-5" />,
};

export default function RadarOperacional() {
  const {
    kpis,
    overallStatus,
    mainProblemSource,
    criticalRanking,
    recommendation,
    parameters,
    isLoading,
  } = useRadarOperacional();

  const sc = statusConfig[overallStatus];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Activity className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Radar Operacional</h1>
        <Badge className={cn("text-sm font-semibold px-3 py-1", sc.color, sc.bg)}>
          {sc.label}
        </Badge>
      </div>

      {/* Block 1: KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <StatusMetricCard
            key={kpi.label}
            title={kpi.label}
            value={kpi.formattedValue}
            status={kpi.status}
            trend={kpi.trend}
            trendLabel="vs 30d anterior"
            interpretation={kpi.detail}
            invertTrend
          />
        ))}
      </div>

      {/* Block 2: Principal Fonte de Problema */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            Principal Fonte de Problema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mainProblemSource ? (
            <div className="flex items-start gap-4">
              <div className={cn("p-3 rounded-lg bg-red-50 text-red-600")}>
                {axisIcons[mainProblemSource.axis] || <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-lg capitalize">{mainProblemSource.item}</p>
                <p className="text-sm text-muted-foreground">
                  Eixo: <span className="font-medium text-foreground">{mainProblemSource.axisLabel}</span>
                </p>
                <div className="flex gap-4 text-sm">
                  <span>{mainProblemSource.count} reclamações (90d)</span>
                  {mainProblemSource.rate !== undefined && (
                    <span>Taxa: {(mainProblemSource.rate * 100).toFixed(1)}%</span>
                  )}
                  <span className="text-red-600 font-medium">
                    +{mainProblemSource.deviationPercent.toFixed(0)}% vs período anterior
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Nenhum desvio significativo detectado</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block 3: Ranking Crítico */}
      {mainProblemSource && criticalRanking.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Ranking Crítico — {mainProblemSource.axisLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Reclamações (90d)</TableHead>
                  {criticalRanking.some(r => r.rate !== undefined) && (
                    <TableHead className="text-right">Taxa</TableHead>
                  )}
                  <TableHead className="text-center">Tendência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criticalRanking.map((item, idx) => (
                  <TableRow key={item.item}>
                    <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium capitalize">{item.item}</TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                    {criticalRanking.some(r => r.rate !== undefined) && (
                      <TableCell className="text-right">
                        {item.rate !== undefined ? `${(item.rate * 100).toFixed(1)}%` : '—'}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      {item.trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500 inline" />}
                      {item.trend === 'down' && <TrendingDown className="h-4 w-4 text-emerald-500 inline" />}
                      {item.trend === 'stable' && <Minus className="h-4 w-4 text-muted-foreground inline" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Block 4: Recomendação */}
      {recommendation && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Decisão Recomendada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-medium text-amber-900">{recommendation.text}</p>
            <p className="text-sm text-amber-700">{recommendation.context}</p>
            {recommendation.affectedVips.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-xs text-muted-foreground font-medium">VIPs afetados:</span>
                {recommendation.affectedVips.map(vip => (
                  <Badge key={vip} variant="outline" className="text-xs">
                    {vip}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Footer: Technical criteria */}
      <Accordion type="single" collapsible>
        <AccordionItem value="criteria">
          <AccordionTrigger className="text-sm text-muted-foreground">
            Como o Radar calcula
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">📌 Critérios de Detecção (fixos até revisão)</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>🟡 <strong>Indício:</strong> +{parameters.trendWarningPercent}% vs 30d anterior ou média 90d + {parameters.sigmaWarning}σ</li>
                  <li>🔴 <strong>Desvio:</strong> média 90d + {parameters.sigmaDanger}σ</li>
                  <li>Itens considerados apenas se ≥ {parameters.minComplaintThreshold} reclamações</li>
                  <li>Recompra considerada até {parameters.repurchaseWindowDays} dias após última reclamação</li>
                  <li>Fricção requer mínimo de {parameters.minOrdersForFriction} pedidos/mês</li>
                  <li>Normalização por volume: transportador (pedidos) e produto (vendas)</li>
                  <li>Comparação: últimos 90d vs dias 91–{parameters.historicalWindowDays}</li>
                </ul>
              </div>
              <div className="flex flex-col gap-1 pt-2 border-t">
                <span>Parâmetros congelados desde: <strong>{format(new Date(parameters.freezeDate), "dd/MM/yyyy", { locale: ptBR })}</strong></span>
                <span>Próxima revisão prevista: <strong>{format(new Date(parameters.reviewDate), "dd/MM/yyyy", { locale: ptBR })}</strong></span>
                <span>Dados analisados até: <strong>{format(new Date(), "dd/MM/yyyy", { locale: ptBR })}</strong></span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
