import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, ReferenceLine } from 'recharts';
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export type ChartViewMode = 'daily' | 'weekly' | 'monthly';

interface DailyRevenueChartProps {
  data: { date: string; revenue: number }[] | { week: string; revenue: number }[] | { month: string; revenue: number }[];
  viewMode: ChartViewMode;
  onViewModeChange?: (mode: ChartViewMode) => void;
  showMovingAverage?: boolean;
}

// Calcular média móvel
const calculateMovingAverage = (data: { label: string; revenue: number }[], window: number = 7) => {
  return data.map((item, index) => {
    const start = Math.max(0, index - window + 1);
    const windowData = data.slice(start, index + 1);
    const avg = windowData.reduce((sum, d) => sum + d.revenue, 0) / windowData.length;
    return { ...item, movingAverage: avg };
  });
};

// Formatar label de semana (ex: "2025-W01" -> "Sem 01")
const formatWeekLabel = (week: string): string => {
  const match = week.match(/\d{4}-W(\d{2})/);
  if (match) {
    return `Sem ${match[1]}`;
  }
  return week;
};

export const DailyRevenueChart = ({ 
  data, 
  viewMode,
  onViewModeChange,
  showMovingAverage = true,
}: DailyRevenueChartProps) => {
  // Preparar dados com a chave correta
  const chartData = useMemo(() => {
    const baseData = data.map(item => {
      let label = '';
      if ('date' in item) label = item.date;
      else if ('week' in item) label = formatWeekLabel(item.week);
      else if ('month' in item) label = item.month;
      return { label, revenue: item.revenue };
    });
    
    // Adicionar média móvel apenas para diário e se tiver dados suficientes
    const windowSize = viewMode === 'daily' ? 7 : viewMode === 'weekly' ? 4 : 0;
    if (showMovingAverage && viewMode !== 'monthly' && baseData.length >= windowSize) {
      return calculateMovingAverage(baseData, windowSize);
    }
    
    return baseData;
  }, [data, viewMode, showMovingAverage]);

  // Calcular média geral para referência
  const averageRevenue = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.revenue, 0) / chartData.length;
  }, [chartData]);

  const titles = {
    daily: { title: "📈 Faturamento Diário", description: "Receita por dia com média móvel 7 dias" },
    weekly: { title: "📈 Faturamento Semanal", description: "Receita agregada por semana" },
    monthly: { title: "📈 Faturamento Mensal", description: "Receita agregada por mês" },
  };

  const isCompact = viewMode === 'monthly' || viewMode === 'weekly';
  const showMA = showMovingAverage && viewMode !== 'monthly' && chartData.length >= (viewMode === 'daily' ? 7 : 4);

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
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
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
              tickFormatter={(value) => 
                new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL',
                  notation: 'compact',
                  maximumFractionDigits: 1
                }).format(value)
              }
              width={60}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                const maLabel = viewMode === 'daily' ? 'Média 7 dias' : 'Média 4 sem';
                const label = name === 'movingAverage' ? maLabel : 'Faturamento';
                return [
                  new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(value),
                  label
                ];
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            
            <ReferenceLine 
              y={averageRevenue} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="5 5"
              label={{ 
                value: 'Média', 
                position: 'right',
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 10
              }}
            />
            
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--chart-1))" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#revenueGradient)"
              name="Faturamento"
            />
            
            {showMA && (
              <Line 
                type="monotone" 
                dataKey="movingAverage" 
                stroke="hsl(var(--chart-4))" 
                strokeWidth={2}
                dot={false}
                name="movingAverage"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        
        {showMA && (
          <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
              <span>Faturamento</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
              <span>Média Móvel {viewMode === 'daily' ? '7 dias' : '4 semanas'}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
