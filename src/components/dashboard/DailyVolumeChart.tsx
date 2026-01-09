import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { useMemo } from "react";

interface DailyVolumeChartProps {
  data: { date: string; orders: number }[] | { month: string; orders: number }[];
  title: string;
  description: string;
  isMonthly?: boolean;
  dailyGoal?: number;
}

export const DailyVolumeChart = ({ 
  data, 
  title, 
  description, 
  isMonthly = false,
  dailyGoal 
}: DailyVolumeChartProps) => {
  // Preparar dados com a chave correta (date ou month)
  const chartData = useMemo(() => {
    return data.map(item => ({
      label: 'date' in item ? item.date : item.month,
      orders: item.orders
    }));
  }, [data]);

  // Calcular média para linha de referência
  const averageOrders = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.orders, 0) / chartData.length;
  }, [chartData]);

  // Usar meta diária ou média como referência
  const targetLine = dailyGoal || Math.round(averageOrders);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              angle={isMonthly ? 0 : -45}
              textAnchor={isMonthly ? "middle" : "end"}
              height={isMonthly ? 60 : 80}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => Math.round(value).toString()}
            />
            <Tooltip 
              formatter={(value: number) => [`${Math.round(value)} pedidos`, 'Volume']}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            
            {/* Linha de meta/média */}
            <ReferenceLine 
              y={targetLine} 
              stroke="hsl(var(--chart-4))" 
              strokeDasharray="5 5"
              label={{ 
                value: dailyGoal ? 'Meta' : 'Média', 
                position: 'right',
                fill: 'hsl(var(--chart-4))',
                fontSize: 10
              }}
            />
            
            {/* Barras com cores condicionais */}
            <Bar 
              dataKey="orders" 
              radius={[4, 4, 0, 0]}
              name="Pedidos"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.orders >= targetLine 
                    ? 'hsl(var(--chart-2))' 
                    : 'hsl(var(--chart-3))'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        {/* Legenda */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
            <span>Acima da {dailyGoal ? 'meta' : 'média'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-3))' }} />
            <span>Abaixo da {dailyGoal ? 'meta' : 'média'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5" style={{ backgroundColor: 'hsl(var(--chart-4))', borderStyle: 'dashed' }} />
            <span>{dailyGoal ? `Meta: ${dailyGoal}` : `Média: ${Math.round(averageOrders)}`}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
