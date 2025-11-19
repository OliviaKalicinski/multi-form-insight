import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DailyVolumeChartProps {
  data: { date: string; orders: number }[] | { month: string; orders: number }[];
  title: string;
  description: string;
  isMonthly?: boolean;
}

export const DailyVolumeChart = ({ data, title, description, isMonthly = false }: DailyVolumeChartProps) => {
  // Preparar dados com a chave correta (date ou month)
  const chartData = data.map(item => ({
    label: 'date' in item ? item.date : item.month,
    orders: item.orders
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
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
            <Area 
              type="monotone" 
              dataKey="orders" 
              stroke="hsl(var(--chart-2))" 
              fillOpacity={1} 
              fill="url(#volumeGradient)"
              name="Pedidos"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
