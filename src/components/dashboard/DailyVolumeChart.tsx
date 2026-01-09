import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChartViewMode } from "./DailyRevenueChart";

interface DailyVolumeChartProps {
  data: { date: string; orders: number }[] | { week: string; orders: number }[] | { month: string; orders: number }[];
  viewMode: ChartViewMode;
  onViewModeChange?: (mode: ChartViewMode) => void;
  dailyGoal?: number;
}

// Formatar label de semana
const formatWeekLabel = (week: string): string => {
  const match = week.match(/\d{4}-W(\d{2})/);
  if (match) {
    return `Sem ${match[1]}`;
  }
  return week;
};

export const DailyVolumeChart = ({ 
  data, 
  viewMode,
  onViewModeChange,
  dailyGoal 
}: DailyVolumeChartProps) => {
  // Preparar dados com a chave correta
  const chartData = useMemo(() => {
    return data.map(item => {
      let label = '';
      if ('date' in item) label = item.date;
      else if ('week' in item) label = formatWeekLabel(item.week);
      else if ('month' in item) label = item.month;
      return { label, orders: item.orders };
    });
  }, [data]);

  // Calcular média para linha de referência
  const averageOrders = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.orders, 0) / chartData.length;
  }, [chartData]);

  // Calcular meta baseada no viewMode
  const targetLine = useMemo(() => {
    if (!dailyGoal) return Math.round(averageOrders);
    if (viewMode === 'daily') return dailyGoal;
    if (viewMode === 'weekly') return dailyGoal * 7;
    return dailyGoal * 30; // monthly
  }, [dailyGoal, viewMode, averageOrders]);

  const titles = {
    daily: { title: "📦 Volume de Pedidos", description: "Número de pedidos por dia" },
    weekly: { title: "📦 Volume Semanal", description: "Pedidos agregados por semana" },
    monthly: { title: "📦 Volume Mensal", description: "Pedidos agregados por mês" },
  };

  const isCompact = viewMode === 'monthly' || viewMode === 'weekly';
  const hasGoal = dailyGoal !== undefined;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{titles[viewMode].title}</CardTitle>
            <CardDescription className="text-xs">{titles[viewMode].description}</CardDescription>
          </div>
          {onViewModeChange && (
            <div className="flex gap-1">
              {(['daily', 'weekly', 'monthly'] as ChartViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onViewModeChange(mode)}
                  className={cn(
                    "px-2 py-1 text-xs rounded-md font-medium transition-colors",
                    viewMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  {mode === 'daily' ? 'Diário' : mode === 'weekly' ? 'Semanal' : 'Mensal'}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              angle={isCompact ? 0 : -45}
              textAnchor={isCompact ? "middle" : "end"}
              height={isCompact ? 40 : 60}
              interval={viewMode === 'daily' ? 'preserveStartEnd' : 0}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickFormatter={(value) => Math.round(value).toString()}
              width={40}
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
            
            <ReferenceLine 
              y={targetLine} 
              stroke="hsl(var(--chart-4))" 
              strokeDasharray="5 5"
              label={{ 
                value: hasGoal ? 'Meta' : 'Média', 
                position: 'right',
                fill: 'hsl(var(--chart-4))',
                fontSize: 10
              }}
            />
            
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
        
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
            <span>Acima</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-3))' }} />
            <span>Abaixo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
            <span>{hasGoal ? `Meta: ${targetLine}` : `Média: ${Math.round(averageOrders)}`}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
