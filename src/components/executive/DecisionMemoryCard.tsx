import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DecisionMemory } from "@/types/decisions";
import { History, Clock, Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface DecisionMemoryCardProps {
  memory: DecisionMemory;
}

// Mapa de tradução para nomes legíveis de métricas
const metricLabels: Record<string, string> = {
  roasAds: "ROAS Ads",
  churn: "Churn",
  ticketMedio: "Ticket Médio",
  recorrencia: "Recorrência",
  conversao: "Conversão",
  retenção: "Retenção",
  ltv: "LTV",
  cac: "CAC",
  margem: "Margem",
};

const formatResponseTime = (hours: number): string => {
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)} dias`;
};

const getMetricLabel = (key: string): string => {
  return metricLabels[key] || key;
};

export const DecisionMemoryCard = ({ memory }: DecisionMemoryCardProps) => {
  // Não exibir se não há histórico
  if (memory.totalGenerated === 0) {
    return null;
  }

  // Filtrar métricas com generated > 0
  const metricsWithData = Object.entries(memory.byMetric).filter(
    ([_, data]) => data.generated > 0
  );

  return (
    <Card className="border-slate-200 bg-slate-50/50">
      {/* SEÇÃO 1: Cabeçalho */}
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-slate-700">
          <History className="h-5 w-5 text-slate-500" />
          Memória de Decisão
        </CardTitle>
        <CardDescription className="text-slate-500">
          Registro histórico das recomendações apresentadas
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* SEÇÃO 2: Resumo Geral (4 números) */}
        <div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-semibold text-slate-700">
                {memory.totalGenerated}
              </div>
              <div className="text-xs text-slate-500">Geradas</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-semibold text-slate-600">
                {memory.byStatus.ACCEPTED}
              </div>
              <div className="text-xs text-slate-500">Aceitas</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-semibold text-slate-600">
                {memory.byStatus.REJECTED}
              </div>
              <div className="text-xs text-slate-500">Rejeitadas</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-semibold text-slate-600">
                {memory.byStatus.EXPIRED}
              </div>
              <div className="text-xs text-slate-500">Expiradas</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">
            Desde o início do uso deste painel
          </p>
        </div>

        {/* SEÇÃO 3: Tempo Médio de Resposta */}
        {memory.avgResponseTimeHours > 0 && (
          <>
            <Separator className="bg-slate-200" />
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-sm">
                Tempo médio: <strong>{formatResponseTime(memory.avgResponseTimeHours)}</strong>
              </span>
              <span className="text-xs text-slate-400">
                entre geração e decisão explícita
              </span>
            </div>
          </>
        )}

        {/* SEÇÃO 4: Tabela por Métrica */}
        {metricsWithData.length > 0 && (
          <>
            <Separator className="bg-slate-200" />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-200">
                    <TableHead className="text-slate-500 font-medium">Métrica</TableHead>
                    <TableHead className="text-slate-500 font-medium text-center">Geradas</TableHead>
                    <TableHead className="text-slate-500 font-medium text-center">Aceitas</TableHead>
                    <TableHead className="text-slate-500 font-medium text-center">Rejeitadas</TableHead>
                    <TableHead className="text-slate-500 font-medium text-center">Exp.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metricsWithData.map(([metricKey, data]) => (
                    <TableRow key={metricKey} className="hover:bg-slate-100/50 border-slate-200">
                      <TableCell className="text-slate-600 font-medium">
                        {getMetricLabel(metricKey)}
                      </TableCell>
                      <TableCell className="text-slate-600 text-center">{data.generated}</TableCell>
                      <TableCell className="text-slate-600 text-center">{data.accepted}</TableCell>
                      <TableCell className="text-slate-600 text-center">{data.rejected}</TableCell>
                      <TableCell className="text-slate-600 text-center">{data.expired}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* SEÇÃO 5: Rodapé Epistemológico */}
        <Separator className="bg-slate-200" />
        <div className="flex items-start gap-2 text-xs text-slate-400">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <p>
            Este histórico não altera automaticamente recomendações, alertas ou prioridades.
            Ele existe para tornar explícita a relação entre sugestões do sistema e decisões humanas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
