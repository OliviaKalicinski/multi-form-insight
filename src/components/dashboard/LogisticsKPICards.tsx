import { Clock, Zap, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { KPITooltip } from "./KPITooltip";

interface LogisticsKPICardsProps {
  averageDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
}

const getStatus = (days: number) => {
  if (days <= 2) return { status: 'success', bgClass: 'bg-green-500/10', textClass: 'text-green-600', borderClass: 'border-green-500/20' };
  if (days <= 5) return { status: 'warning', bgClass: 'bg-yellow-500/10', textClass: 'text-yellow-600', borderClass: 'border-yellow-500/20' };
  return { status: 'danger', bgClass: 'bg-red-500/10', textClass: 'text-red-600', borderClass: 'border-red-500/20' };
};

export const LogisticsKPICards = ({
  averageDays,
  medianDays,
  minDays,
  maxDays
}: LogisticsKPICardsProps) => {
  const avgStatus = getStatus(averageDays);
  const medianStatus = getStatus(medianDays);
  const minStatus = getStatus(minDays);
  const maxStatus = getStatus(maxDays);

  const kpis = [
    {
      title: "Tempo Médio NF",
      value: `${averageDays.toFixed(1)} dias`,
      icon: Clock,
      tooltipKey: "tempo_medio_nf",
      ...avgStatus
    },
    {
      title: "Mediana NF",
      value: `${medianDays} dia${medianDays !== 1 ? 's' : ''}`,
      icon: Clock,
      tooltipKey: "mediana_nf",
      ...medianStatus
    },
    {
      title: "Mais Rápido",
      value: `${minDays} dia${minDays !== 1 ? 's' : ''}`,
      icon: Zap,
      tooltipKey: "mais_rapido",
      ...minStatus
    },
    {
      title: "Mais Lento",
      value: `${maxDays} dias`,
      icon: AlertTriangle,
      tooltipKey: "mais_lento",
      ...maxStatus
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <KPITooltip key={index} metricKey={kpi.tooltipKey}>
          <Card 
            className={cn(
              "border transition-colors",
              kpi.borderClass,
              kpi.bgClass
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={cn("h-4 w-4", kpi.textClass)} />
                <span className="text-xs font-medium text-muted-foreground">
                  {kpi.title}
                </span>
              </div>
              <p className={cn("text-2xl font-bold", kpi.textClass)}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        </KPITooltip>
      ))}
    </div>
  );
};
