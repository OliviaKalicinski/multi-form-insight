import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { PlatformPerformance } from "@/types/marketing";
import { Trophy } from "lucide-react";

interface PlatformComparisonChartProps {
  data: PlatformPerformance[];
  metric: 'revenue' | 'orders' | 'averageTicket';
}

export const PlatformComparisonChart = ({ data, metric }: PlatformComparisonChartProps) => {
  const getMetricValue = (platform: PlatformPerformance) => {
    switch (metric) {
      case 'revenue':
        return platform.revenue;
      case 'orders':
        return platform.orders;
      case 'averageTicket':
        return platform.averageTicket;
    }
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'revenue':
        return 'Faturamento';
      case 'orders':
        return 'Número de Pedidos';
      case 'averageTicket':
        return 'Ticket Médio';
    }
  };

  const formatValue = (value: number) => {
    if (metric === 'orders') {
      return value.toString();
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const chartData = data.map((platform) => ({
    ...platform,
    value: getMetricValue(platform),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Plataforma</CardTitle>
        <CardDescription>Compare o desempenho de cada canal de vendas</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number"
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              tickFormatter={formatValue}
            />
            <YAxis 
              type="category"
              dataKey="platform"
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              width={120}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value: number) => [formatValue(value), getMetricLabel()]}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--chart-2))'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          {data.map((platform, index) => (
            <div key={platform.platform} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                {index === 0 && <Trophy className="w-4 h-4 text-primary" />}
                <span className="font-medium">{platform.platform}</span>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatValue(getMetricValue(platform))}</div>
                <div className="text-xs text-muted-foreground">
                  {platform.marketShare.toFixed(1)}% do total
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
