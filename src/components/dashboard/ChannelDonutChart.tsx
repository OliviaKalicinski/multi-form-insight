import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Store } from "lucide-react";
import { PlatformPerformance } from "@/types/marketing";

interface ChannelDonutChartProps {
  data: PlatformPerformance[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);

export const ChannelDonutChart = ({ data }: ChannelDonutChartProps) => {
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  const chartData = data.map((item, index) => ({
    name: item.platform,
    value: item.revenue,
    percentage: item.marketShare,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="h-4 w-4 text-primary" />
          Receita por Canal
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col items-center">
          {/* Donut Chart */}
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="w-full space-y-2 mt-2">
            {chartData.slice(0, 4).map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs truncate max-w-[100px]">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium">{item.percentage.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="w-full pt-2 mt-2 border-t text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-semibold">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
