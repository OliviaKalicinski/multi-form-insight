import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CustomerSegment } from "@/types/marketing";
import { formatCurrency } from "@/utils/salesCalculator";

interface SegmentRevenueChartProps {
  segments: CustomerSegment[];
}

const SEGMENT_COLORS: Record<string, string> = {
  'VIP': '#8b5cf6',
  'Fiel': '#10b981',
  'Recorrente': '#3b82f6',
  'Primeira Compra': '#f97316',
};

export const SegmentRevenueChart = ({ segments }: SegmentRevenueChartProps) => {
  const data = segments
    .map(seg => ({
      name: seg.segment,
      revenue: seg.totalRevenue,
      count: seg.count,
      percentage: seg.percentage,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = segments.reduce((sum, s) => sum + s.totalRevenue, 0);

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
          <XAxis 
            type="number" 
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => formatCurrency(value)}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={80}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            formatter={(value: number, name: string, props: any) => {
              const revenuePercentage = ((value / totalRevenue) * 100).toFixed(1);
              return [
                `${formatCurrency(value)} (${revenuePercentage}% da receita)`,
                `${props.payload.count} clientes`
              ];
            }}
            labelFormatter={(label) => `Segmento: ${label}`}
          />
          <Bar dataKey="revenue" radius={[0, 8, 8, 0]} barSize={32}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[entry.name] || '#6b7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Revenue percentages */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {data.map(seg => {
          const revenuePercentage = ((seg.revenue / totalRevenue) * 100).toFixed(1);
          return (
            <div key={seg.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: SEGMENT_COLORS[seg.name] || '#6b7280' }}
              />
              <span className="text-muted-foreground">
                {seg.name}: <strong>{revenuePercentage}%</strong> receita
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
