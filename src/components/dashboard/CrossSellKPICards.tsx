import { Link2, Repeat, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCombination } from "@/types/marketing";
import { KPITooltip } from "./KPITooltip";

interface CrossSellKPICardsProps {
  combinations: ProductCombination[];
}

export const CrossSellKPICards = ({ combinations }: CrossSellKPICardsProps) => {
  const totalCombinations = combinations.length;
  
  const avgFrequency = combinations.length > 0
    ? combinations.reduce((sum, c) => sum + c.frequencia, 0) / combinations.length
    : 0;
  
  const avgTicket = combinations.length > 0
    ? combinations.reduce((sum, c) => sum + c.faturamentoMedio, 0) / combinations.length
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const kpis = [
    {
      title: "Combinações Detectadas",
      value: totalCombinations.toString(),
      icon: Link2,
      color: "text-primary",
      tooltipKey: "combinacoes_detectadas"
    },
    {
      title: "Frequência Média",
      value: `${avgFrequency.toFixed(1)}x`,
      icon: Repeat,
      color: "text-blue-600",
      tooltipKey: "frequencia_media"
    },
    {
      title: "Ticket Médio c/ Combo",
      value: formatCurrency(avgTicket),
      icon: Receipt,
      color: "text-green-600",
      tooltipKey: "ticket_medio_combo"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {kpis.map((kpi, index) => (
        <KPITooltip key={index} metricKey={kpi.tooltipKey}>
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-xs font-medium text-muted-foreground">
                  {kpi.title}
                </span>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        </KPITooltip>
      ))}
    </div>
  );
};
