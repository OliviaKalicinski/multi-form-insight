import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelStage {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface ConversionFunnelChartProps {
  totalSampleCustomers: number;
  customersWhoRepurchased: number;
  loyalCustomers: number;
}

export const ConversionFunnelChart = ({
  totalSampleCustomers,
  customersWhoRepurchased,
  loyalCustomers,
}: ConversionFunnelChartProps) => {
  const stages: FunnelStage[] = [
    {
      label: "Compraram Amostra",
      value: totalSampleCustomers,
      percentage: 100,
      color: "hsl(var(--chart-1))",
    },
    {
      label: "Recompraram",
      value: customersWhoRepurchased,
      percentage: totalSampleCustomers > 0 ? (customersWhoRepurchased / totalSampleCustomers) * 100 : 0,
      color: "hsl(var(--chart-2))",
    },
    {
      label: "Clientes Fiéis (4+ compras)",
      value: loyalCustomers,
      percentage: totalSampleCustomers > 0 ? (loyalCustomers / totalSampleCustomers) * 100 : 0,
      color: "hsl(var(--chart-3))",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-foreground">{stage.label}</span>
                <span className="text-muted-foreground">
                  {stage.value.toLocaleString('pt-BR')} ({stage.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
                <div
                  className="h-full flex items-center justify-center text-sm font-medium text-white transition-all duration-500"
                  style={{
                    width: `${stage.percentage}%`,
                    backgroundColor: stage.color,
                  }}
                >
                  {stage.percentage > 10 && `${stage.percentage.toFixed(1)}%`}
                </div>
              </div>
              {index < stages.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="text-muted-foreground text-xs">
                    ↓ {stages[index + 1].percentage.toFixed(1)}% conversão
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
