import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';
import { DollarSign, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProcessedOrder } from "@/types/marketing";
import { filterRealOrders, calculateRevenueByPeriod, calculateWeeklyRevenue, calculateQuarterlyRevenue } from "@/utils/financialMetrics";
import { format, parse, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ChartViewMode = 'daily' | 'weekly' | 'monthly' | 'quarterly';

interface DailyRevenueChartProps {
  rawOrders: ProcessedOrder[];
  viewMode?: ChartViewMode;
  onViewModeChange?: (mode: ChartViewMode) => void;
  showViewModeToggle?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);

const formatCompact = (value: number) => {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return formatCurrency(value);
};

export const DailyRevenueChart = ({ 
  rawOrders,
  viewMode = 'daily',
  onViewModeChange,
  showViewModeToggle = true
}: DailyRevenueChartProps) => {
  const [includeSamples, setIncludeSamples] = useState(true);

  // Filtrar pedidos baseado no toggle
  const ordersToUse = useMemo(() => {
    return includeSamples ? rawOrders : filterRealOrders(rawOrders);
  }, [rawOrders, includeSamples]);

  // Calcular dados do gráfico baseado no viewMode
  const chartData = useMemo(() => {
    if (viewMode === 'daily') {
      const dailyRevenue = calculateRevenueByPeriod(ordersToUse, 'day');
      return dailyRevenue.map(item => ({
        label: format(parse(item.period, "yyyy-MM-dd", new Date()), "dd/MM", { locale: ptBR }),
        revenue: item.revenue
      }));
    } else if (viewMode === 'weekly') {
      const weeklyRevenue = calculateWeeklyRevenue(ordersToUse);
      return weeklyRevenue.map(item => {
        // Extract week number from format "yyyy-Www" directly
        const match = item.week.match(/\d{4}-W(\d{2})/);
        const weekLabel = match ? `S${match[1]}` : item.week;
        return {
          label: weekLabel,
          revenue: item.revenue
        };
      });
    } else if (viewMode === 'quarterly') {
      const quarterlyRevenue = calculateQuarterlyRevenue(ordersToUse);
      return quarterlyRevenue.map(item => ({
        label: item.quarter,
        revenue: item.revenue
      }));
    } else {
      const monthlyRevenue = calculateRevenueByPeriod(ordersToUse, 'month');
      return monthlyRevenue.map(item => ({
        label: format(parse(item.period, "yyyy-MM", new Date()), "MMM/yy", { locale: ptBR }),
        revenue: item.revenue
      }));
    }
  }, [ordersToUse, viewMode]);

  // Calcular total
  const totalRevenue = useMemo(() => {
    return ordersToUse.reduce((sum, o) => sum + o.valorTotal, 0);
  }, [ordersToUse]);

  const viewModeLabel = viewMode === 'daily' ? 'Diário' : viewMode === 'weekly' ? 'Semanal' : viewMode === 'quarterly' ? 'Trimestral' : 'Mensal';

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-primary" />
            Faturamento {viewModeLabel}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            {showViewModeToggle && onViewModeChange && (
              <div className="flex gap-1">
                {(['daily', 'weekly', 'monthly', 'quarterly'] as ChartViewMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onViewModeChange(mode)}
                  >
                    {mode === 'daily' ? 'Dia' : mode === 'weekly' ? 'Sem' : mode === 'quarterly' ? 'Tri' : 'Mês'}
                  </Button>
                ))}
              </div>
            )}
            
            {/* Samples Toggle */}
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={includeSamples ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIncludeSamples(!includeSamples)}
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{includeSamples ? "Incluindo amostras" : "Apenas produtos reais"}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mt-1">
          Total: {formatCurrency(totalRevenue)}
          {!includeSamples && <span className="text-amber-600 ml-1">(sem amostras)</span>}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              tickFormatter={formatCompact}
              tick={{ fontSize: 10 }}
              width={50}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Bar 
              dataKey="revenue" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
              name="Faturamento"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
