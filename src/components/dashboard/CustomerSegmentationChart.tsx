import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { CustomerSegment } from "@/types/marketing";

interface CustomerSegmentationChartProps {
  segments: CustomerSegment[];
}

const COLORS = {
  'Novo': 'hsl(var(--chart-1))',
  'Ativo': 'hsl(var(--chart-2))',
  'Frequente': 'hsl(var(--chart-3))',
  'VIP': 'hsl(var(--chart-4))',
};

export const CustomerSegmentationChart = ({ segments }: CustomerSegmentationChartProps) => {
  const data = segments.map(seg => ({
    name: seg.segment,
    value: seg.count,
    percentage: seg.percentage,
    criteria: seg.criteria
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => `${entry.percentage.toFixed(1)}%`}
          outerRadius={120}
          innerRadius={40}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
          formatter={(value: number, name: string, props: any) => [
            `${value} clientes (${props.payload.percentage.toFixed(1)}%)`,
            props.payload.criteria
          ]}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          formatter={(value) => {
            const segment = segments.find(s => s.segment === value);
            return `${value}: ${segment?.criteria || ''}`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
