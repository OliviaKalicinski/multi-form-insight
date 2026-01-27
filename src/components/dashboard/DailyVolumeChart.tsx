import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChartViewMode } from "./DailyRevenueChart";
import { Button } from "@/components/ui/button";
import { FlaskConical } from "lucide-react";

// Types for order data with breakdown
interface OrderDataWithTypes {
  date?: string;
  week?: string;
  month?: string;
  orders: number;
  sampleOnlyOrders?: number;
  productOrders?: number;
}

interface DailyVolumeChartProps {
  data: OrderDataWithTypes[];
  viewMode: ChartViewMode;
  onViewModeChange?: (mode: ChartViewMode) => void;
  dailyGoal?: number;
  includeSamples?: boolean;
  onIncludeSamplesChange?: (include: boolean) => void;
}

// Formatar label de semana
const formatWeekLabel = (week: string): string => {
  const match = week.match(/\d{4}-W(\d{2})/);
  if (match) {
    return `Sem ${match[1]}`;
  }
  return week;
};

// Cores para as barras empilhadas
const COLORS = {
  aboveMeta: {
    products: '#10b981', // verde esmeralda (escuro)
    samplesOnly: '#6ee7b7', // verde claro
  },
  belowMeta: {
    products: '#f59e0b', // amarelo (escuro)
    samplesOnly: '#fcd34d', // amarelo claro
  },
};

// Custom shape para as barras com cores dinâmicas
const CustomBar = (props: any) => {
  const { x, y, width, height, payload, dataKey, targetLine } = props;
  
  if (height <= 0) return null;
  
  const isAboveMeta = payload.orders >= targetLine;
  const colors = isAboveMeta ? COLORS.aboveMeta : COLORS.belowMeta;
  const fill = dataKey === 'productOrders' ? colors.products : colors.samplesOnly;
  
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      rx={dataKey === 'sampleOnlyOrders' ? 4 : 0}
      ry={dataKey === 'sampleOnlyOrders' ? 4 : 0}
    />
  );
};

export const DailyVolumeChart = ({ 
  data, 
  viewMode,
  onViewModeChange,
  dailyGoal,
  includeSamples = true,
  onIncludeSamplesChange
}: DailyVolumeChartProps) => {

  // Preparar dados com a chave correta e garantir breakdown
  const chartData = useMemo(() => {
    return data.map(item => {
      let label = '';
      if ('date' in item && item.date) label = item.date;
      else if ('week' in item && item.week) label = formatWeekLabel(item.week);
      else if ('month' in item && item.month) label = item.month;
      
      // Se não tiver breakdown, considerar todos como produtos
      const sampleOnlyOrders = item.sampleOnlyOrders ?? 0;
      const productOrders = item.productOrders ?? item.orders;
      
      // Quando não inclui amostras, usar apenas productOrders como total
      const displayOrders = includeSamples ? item.orders : productOrders;
      
      return { 
        label, 
        orders: item.orders,
        displayOrders,
        sampleOnlyOrders: includeSamples ? sampleOnlyOrders : 0,
        productOrders,
      };
    });
  }, [data, includeSamples]);

  // Calcular média para linha de referência (baseada em displayOrders)
  const averageOrders = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.displayOrders, 0) / chartData.length;
  }, [chartData]);

  // Calcular meta baseada no viewMode
  const targetLine = useMemo(() => {
    if (!dailyGoal) return Math.round(averageOrders);
    if (viewMode === 'daily') return dailyGoal;
    if (viewMode === 'weekly') return dailyGoal * 7;
    return dailyGoal * 30; // monthly
  }, [dailyGoal, viewMode, averageOrders]);

  // Detectar quais categorias de cores estão visíveis no gráfico
  const { hasAbove, hasBelow } = useMemo(() => {
    let above = false;
    let below = false;
    
    chartData.forEach(item => {
      if (item.displayOrders >= targetLine) above = true;
      else below = true;
    });
    
    return { hasAbove: above, hasBelow: below };
  }, [chartData, targetLine]);

  const titles = {
    daily: { title: "📦 Volume de Pedidos", description: "Número de pedidos por dia" },
    weekly: { title: "📦 Volume Semanal", description: "Pedidos agregados por semana" },
    monthly: { title: "📦 Volume Mensal", description: "Pedidos agregados por mês" },
  };

  const isCompact = viewMode === 'monthly' || viewMode === 'weekly';
  const hasGoal = dailyGoal !== undefined && dailyGoal > 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const data = payload[0]?.payload;
    if (!data) return null;
    
    const isAbove = data.displayOrders >= targetLine;
    
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          {includeSamples ? (
            <>
              <p className="text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{data.orders} pedidos</span>
              </p>
              <p className="text-muted-foreground">
                Produtos: <span className="font-medium">{data.productOrders}</span>
              </p>
              <p className="text-muted-foreground">
                Só Amostras: <span className="font-medium">{data.sampleOnlyOrders}</span>
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">
              Produtos: <span className="font-semibold text-foreground">{data.productOrders} pedidos</span>
            </p>
          )}
          <p className={cn(
            "mt-1 pt-1 border-t text-xs",
            isAbove ? "text-emerald-600" : "text-amber-600"
          )}>
            {isAbove ? "✅ Acima da " : "⚠️ Abaixo da "}{hasGoal ? 'meta' : 'média'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{titles[viewMode].title}</CardTitle>
            <CardDescription className="text-xs">{titles[viewMode].description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
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
            {onIncludeSamplesChange && (
              <Button
                variant={includeSamples ? "default" : "outline"}
                size="sm"
                onClick={() => onIncludeSamplesChange(!includeSamples)}
                className="h-7 text-xs gap-1.5"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                {includeSamples ? "Com Amostras" : "Só Produtos"}
              </Button>
            )}
          </div>
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
            <Tooltip content={<CustomTooltip />} />
            
            {/* Barra de Produtos (base) */}
            <Bar 
              dataKey="productOrders" 
              stackId="orders"
              name="Produtos"
              radius={includeSamples ? [0, 0, 0, 0] : [4, 4, 0, 0]}
              shape={(props: any) => (
                <CustomBar {...props} dataKey="productOrders" targetLine={targetLine} />
              )}
            />
            
            {/* Barra de Só Amostras (topo) - apenas se includeSamples */}
            {includeSamples && (
              <Bar 
                dataKey="sampleOnlyOrders" 
                stackId="orders"
                name="Só Amostras"
                radius={[4, 4, 0, 0]}
                shape={(props: any) => (
                  <CustomBar {...props} dataKey="sampleOnlyOrders" targetLine={targetLine} />
                )}
              />
            )}
            
            {/* ReferenceLine rendered AFTER bars to appear on top */}
            <ReferenceLine 
              y={targetLine} 
              stroke="hsl(var(--chart-4))" 
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ 
                value: hasGoal ? 'Meta' : 'Média', 
                position: 'right',
                fill: 'hsl(var(--chart-4))',
                fontSize: 10,
                fontWeight: 600
              }}
            />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Legenda customizada - dinâmica baseada nos dados */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-3 text-xs text-muted-foreground">
          {includeSamples ? (
            <>
              {/* Mostrar cores verdes apenas se houver barras acima da meta */}
              {hasAbove && (
                <div className="flex items-center gap-4">
                  {hasBelow && <span className="font-medium text-emerald-600">Acima:</span>}
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.aboveMeta.products }} />
                    <span>Produtos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.aboveMeta.samplesOnly }} />
                    <span>Só Amostras</span>
                  </div>
                </div>
              )}
              
              {/* Mostrar cores amarelas apenas se houver barras abaixo da meta */}
              {hasBelow && (
                <div className="flex items-center gap-4">
                  {hasAbove && <span className="font-medium text-amber-600">Abaixo:</span>}
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.belowMeta.products }} />
                    <span>Produtos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.belowMeta.samplesOnly }} />
                    <span>Só Amostras</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Legenda simplificada quando só mostra produtos */}
              {hasAbove && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.aboveMeta.products }} />
                  <span className="text-emerald-600">Acima da {hasGoal ? 'meta' : 'média'}</span>
                </div>
              )}
              {hasBelow && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.belowMeta.products }} />
                  <span className="text-amber-600">Abaixo da {hasGoal ? 'meta' : 'média'}</span>
                </div>
              )}
            </>
          )}
          
          {/* Linha de referência - sempre visível */}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
            <span>{hasGoal ? `Meta: ${targetLine}` : `Média: ${Math.round(averageOrders)}`}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
