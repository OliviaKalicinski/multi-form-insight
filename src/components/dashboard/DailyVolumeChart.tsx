import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ShoppingCart, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProcessedOrder } from "@/types/marketing";
import { filterRealOrders, calculateOrdersByDayWithTypes, calculateOrdersByWeekWithTypes, calculateOrdersByMonthWithTypes, calculateOrdersByQuarterWithTypes, OrderDataWithTypes } from "@/utils/financialMetrics";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ChartViewMode = 'daily' | 'weekly' | 'monthly' | 'quarterly';

interface DailyVolumeChartProps {
  rawOrders: ProcessedOrder[];
  viewMode?: ChartViewMode;
  onViewModeChange?: (mode: ChartViewMode) => void;
  showViewModeToggle?: boolean;
}

export const DailyVolumeChart = ({ 
  rawOrders,
  viewMode = 'daily',
  onViewModeChange,
  showViewModeToggle = true
}: DailyVolumeChartProps) => {
  const [includeSamples, setIncludeSamples] = useState(true);

  // Calcular dados do gráfico baseado no viewMode e toggle
  const chartData = useMemo(() => {
    const ordersToUse = includeSamples ? rawOrders : filterRealOrders(rawOrders);
    
    if (viewMode === 'daily') {
      return calculateOrdersByDayWithTypes(ordersToUse);
    } else if (viewMode === 'weekly') {
      return calculateOrdersByWeekWithTypes(ordersToUse);
    } else if (viewMode === 'quarterly') {
      return calculateOrdersByQuarterWithTypes(ordersToUse);
    } else {
      return calculateOrdersByMonthWithTypes(ordersToUse);
    }
  }, [rawOrders, viewMode, includeSamples]);

  // Formatar labels
  const formattedData = useMemo(() => {
    return chartData.map(item => ({
      ...item,
      label: item.date || item.week || item.month || (item as any).quarter || '',
    }));
  }, [chartData]);

  // Calcular total
  const totalOrders = useMemo(() => {
    return includeSamples ? rawOrders.length : filterRealOrders(rawOrders).length;
  }, [rawOrders, includeSamples]);

  const viewModeLabel = viewMode === 'daily' ? 'Diário' : viewMode === 'weekly' ? 'Semanal' : viewMode === 'quarterly' ? 'Trimestral' : 'Mensal';

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Volume de Pedidos {viewModeLabel}
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
          Total: {totalOrders.toLocaleString('pt-BR')} pedidos
          {!includeSamples && <span className="text-amber-600 ml-1">(sem amostras)</span>}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={formattedData}>
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
              tick={{ fontSize: 10 }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {includeSamples ? (
              <>
                <Bar 
                  dataKey="productOrders" 
                  stackId="a"
                  fill="hsl(var(--primary))" 
                  name="Produtos"
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="sampleOnlyOrders" 
                  stackId="a"
                  fill="hsl(var(--chart-2))" 
                  name="Só Amostras"
                  radius={[4, 4, 0, 0]}
                />
              </>
            ) : (
              <Bar 
                dataKey="orders" 
                fill="hsl(var(--primary))" 
                name="Pedidos"
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
