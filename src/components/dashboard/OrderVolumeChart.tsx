import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrderVolumeChartProps {
  data: { date: string; orders: number }[];
  viewMode: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

export const OrderVolumeChart = ({ data, viewMode }: OrderVolumeChartProps) => {
  const averageOrders = data.length > 0 
    ? data.reduce((sum, d) => sum + d.orders, 0) / data.length 
    : 0;

  const formatXAxis = (value: string) => {
    try {
      if (viewMode === 'daily') {
        const date = parse(value, 'yyyy-MM-dd', new Date());
        return format(date, 'dd/MM', { locale: ptBR });
      } else if (viewMode === 'monthly') {
        const date = parse(value, 'yyyy-MM', new Date());
        return format(date, 'MMM/yy', { locale: ptBR });
      } else if (viewMode === 'quarterly') {
        return value; // Already formatted as 2024-Q1
      }
      return value;
    } catch {
      return value;
    }
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={formatXAxis}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
          labelFormatter={(label) => formatXAxis(label)}
          formatter={(value: number) => [`${value} pedidos`, "Volume"]}
        />
        <ReferenceLine 
          y={averageOrders} 
          stroke="hsl(var(--destructive))" 
          strokeDasharray="3 3"
          label={{ value: `Média: ${averageOrders.toFixed(1)}`, fill: "hsl(var(--muted-foreground))" }}
        />
        <Line 
          type="monotone" 
          dataKey="orders" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          dot={{ fill: "hsl(var(--primary))", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
