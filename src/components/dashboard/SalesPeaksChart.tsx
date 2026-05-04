import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { SalesPeak } from "@/types/marketing";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SalesPeaksChartProps {
  peaks: SalesPeak[];
}

export const SalesPeaksChart = ({ peaks }: SalesPeaksChartProps) => {
  // Pegar os top 20 dias com mais pedidos
  const topPeaks = peaks.slice(0, 20);
  
  const average = peaks.length > 0 
    ? peaks.reduce((sum, p) => sum + p.orders, 0) / peaks.length 
    : 0;
  const variance = peaks.length > 0
    ? peaks.reduce((sum, p) => sum + Math.pow(p.orders - average, 2), 0) / peaks.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const peakThreshold = average + 2 * stdDev;

  const formatXAxis = (value: string) => {
    try {
      const date = parse(value, 'yyyy-MM-dd', new Date());
      return format(date, 'dd/MM', { locale: ptBR });
    } catch {
      return value;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--destructive))" }}></div>
          <span className="text-muted-foreground">Picos (acima média + 2σ)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--primary))" }}></div>
          <span className="text-muted-foreground">Dias normais</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={topPeaks}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={formatXAxis}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            labelFormatter={(label) => formatXAxis(label)}
            formatter={(value: number, name: string, props: any) => {
              const isPeak = props.payload.isPeak;
              const percentage = props.payload.percentageAboveAverage;
              return [
                `${value} pedidos${isPeak ? ` (+${percentage.toFixed(0)}% acima da média)` : ''}`,
                "Volume"
              ];
            }}
          />
          <ReferenceLine 
            y={average} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="3 3"
            label={{ value: `Média: ${average.toFixed(1)}`, fill: "hsl(var(--muted-foreground))" }}
          />
          <Bar dataKey="orders" radius={[8, 8, 0, 0]}>
            {topPeaks.map((entry, index) => {
              const isPeak = entry.orders >= peakThreshold;
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={isPeak ? "hsl(var(--destructive))" : "hsl(var(--primary))"} 
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {peaks.filter(p => p.isPeak).length > 0 && (
        <div className="text-sm text-muted-foreground">
          Total de {peaks.filter(p => p.isPeak).length} picos de venda identificados
        </div>
      )}
    </div>
  );
};
