import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, ReferenceLine } from 'recharts';
import { useMemo } from "react";

interface DailyRevenueChartProps {
  data: { date: string; revenue: number }[] | { month: string; revenue: number }[];
  title: string;
  description: string;
  isMonthly?: boolean;
  showMovingAverage?: boolean;
  highlightPeaks?: boolean;
}

// Calcular média móvel de 7 dias
const calculateMovingAverage = (data: { label: string; revenue: number }[], window: number = 7) => {
  return data.map((item, index) => {
    const start = Math.max(0, index - window + 1);
    const windowData = data.slice(start, index + 1);
    const avg = windowData.reduce((sum, d) => sum + d.revenue, 0) / windowData.length;
    return { ...item, movingAverage: avg };
  });
};

export const DailyRevenueChart = ({ 
  data, 
  title, 
  description, 
  isMonthly = false,
  showMovingAverage = true,
  highlightPeaks = true
}: DailyRevenueChartProps) => {
  // Preparar dados com a chave correta (date ou month)
  const chartData = useMemo(() => {
    const baseData = data.map(item => ({
      label: 'date' in item ? item.date : item.month,
      revenue: item.revenue
    }));
    
    // Adicionar média móvel se não for mensal e tiver mais de 7 pontos
    if (showMovingAverage && !isMonthly && baseData.length >= 7) {
      return calculateMovingAverage(baseData);
    }
    
    return baseData;
  }, [data, isMonthly, showMovingAverage]);

  // Calcular média geral para referência
  const averageRevenue = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.revenue, 0) / chartData.length;
  }, [chartData]);

  // Identificar picos (valores > 2x média)
  const peakThreshold = averageRevenue * 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
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
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              angle={isMonthly ? 0 : -45}
              textAnchor={isMonthly ? "middle" : "end"}
              height={isMonthly ? 60 : 80}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => 
                new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(value)
              }
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                const label = name === 'movingAverage' ? 'Média 7 dias' : 'Faturamento';
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
            
            {/* Linha de média geral */}
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
            
            {/* Área principal */}
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--chart-1))" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#revenueGradient)"
              name="Faturamento"
            />
            
            {/* Linha de média móvel */}
            {showMovingAverage && !isMonthly && chartData.length >= 7 && (
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
        
        {/* Legenda */}
        {showMovingAverage && !isMonthly && chartData.length >= 7 && (
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
              <span>Faturamento Diário</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
              <span>Média Móvel 7 dias</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
