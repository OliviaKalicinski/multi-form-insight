import { ShippingMethodStat } from "@/types/marketing";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface ShippingMethodsChartProps {
  data: ShippingMethodStat[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', '#8b5cf6', '#ec4899', '#f59e0b'];

export const ShippingMethodsChart = ({ data }: ShippingMethodsChartProps) => {
  const chartData = data.map(stat => ({
    name: stat.formaEnvio,
    value: stat.numeroPedidos,
    percentual: stat.percentual
  }));

  return (
    <ChartContainer
      config={data.reduce((acc, stat, index) => ({
        ...acc,
        [stat.formaEnvio]: {
          label: stat.formaEnvio,
          color: COLORS[index % COLORS.length]
        }
      }), {})}
      className="h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percentual }) => `${name}: ${percentual.toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number, name: string, props: any) => [
              `${value} pedidos (${props.payload.percentual.toFixed(1)}%)`,
              name
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
