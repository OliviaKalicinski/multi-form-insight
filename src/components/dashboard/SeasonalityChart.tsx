import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

interface SeasonalityChartProps {
  monthlyData: { month: string; monthLabel: string; revenue: number; orders: number }[];
  quarterlyData: { quarter: string; revenue: number; orders: number }[];
  viewMode: 'monthly' | 'quarterly';
}

export const SeasonalityChart = ({ 
  monthlyData, 
  quarterlyData, 
  viewMode 
}: SeasonalityChartProps) => {
  const data = viewMode === 'monthly' ? monthlyData : quarterlyData;
  const xDataKey = viewMode === 'monthly' ? 'monthLabel' : 'quarter';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Sazonalidade</CardTitle>
        <CardDescription>Identifique padrões e picos de vendas ao longo do tempo</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey={xDataKey}
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              yAxisId="left"
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              tickFormatter={(value) => 
                new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                }).format(value)
              }
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value: number, name: string) => {
                if (name === "Faturamento") {
                  return new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(value);
                }
                return value;
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="revenue"
              name="Faturamento"
              fill="hsl(var(--primary))"
              radius={[8, 8, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="orders"
              name="Pedidos"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--destructive))', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
