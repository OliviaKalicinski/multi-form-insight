import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend } from "recharts";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isValid, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

export type ViewMode = "daily" | "weekly" | "monthly";

interface DataPoint {
  date: string;
  value: number;
}

interface FollowersTrendChartProps {
  data: DataPoint[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  title?: string;
  description?: string;
  color?: string;
  showMovingAverage?: boolean;
}

// Calculate 7-day moving average
const calculateMovingAverage = (data: DataPoint[], windowSize: number = 7): (number | null)[] => {
  return data.map((_, index) => {
    if (index < windowSize - 1) return null;
    const window = data.slice(index - windowSize + 1, index + 1);
    const sum = window.reduce((acc, item) => acc + item.value, 0);
    return sum / windowSize;
  });
};

// Aggregate data by week
const aggregateByWeek = (data: DataPoint[]): DataPoint[] => {
  if (data.length === 0) return [];
  
  const validData = data.filter(d => d.date && isValid(parseISO(d.date)));
  if (validData.length === 0) return [];

  const dates = validData.map(d => parseISO(d.date));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  const weeks = eachWeekOfInterval({ start: minDate, end: maxDate }, { weekStartsOn: 1 });
  
  return weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekData = validData.filter(d => {
      const date = parseISO(d.date);
      return date >= weekStart && date <= weekEnd;
    });
    return {
      date: format(weekStart, "yyyy-MM-dd"),
      value: weekData.reduce((sum, d) => sum + d.value, 0),
    };
  });
};

// Aggregate data by month
const aggregateByMonth = (data: DataPoint[]): DataPoint[] => {
  if (data.length === 0) return [];
  
  const validData = data.filter(d => d.date && isValid(parseISO(d.date)));
  if (validData.length === 0) return [];

  const dates = validData.map(d => parseISO(d.date));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  const months = eachMonthOfInterval({ start: startOfMonth(minDate), end: endOfMonth(maxDate) });
  
  return months.map(monthStart => {
    const monthEnd = endOfMonth(monthStart);
    const monthData = validData.filter(d => {
      const date = parseISO(d.date);
      return date >= monthStart && date <= monthEnd;
    });
    return {
      date: format(monthStart, "yyyy-MM-dd"),
      value: monthData.reduce((sum, d) => sum + d.value, 0),
    };
  });
};

export const FollowersTrendChart = ({
  data,
  viewMode,
  onViewModeChange,
  title = "Evolução de Seguidores",
  description = "Novos seguidores ao longo do tempo",
  color = "hsl(var(--chart-1))",
  showMovingAverage = true,
}: FollowersTrendChartProps) => {
  const processedData = useMemo(() => {
    let aggregatedData: DataPoint[];
    
    switch (viewMode) {
      case "weekly":
        aggregatedData = aggregateByWeek(data);
        break;
      case "monthly":
        aggregatedData = aggregateByMonth(data);
        break;
      default:
        aggregatedData = data;
    }

    const movingAverages = viewMode === "daily" && showMovingAverage 
      ? calculateMovingAverage(aggregatedData) 
      : [];

    return aggregatedData.map((item, index) => ({
      ...item,
      movingAverage: movingAverages[index] ?? undefined,
      displayDate: formatDisplayDate(item.date, viewMode),
    }));
  }, [data, viewMode, showMovingAverage]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(v) => v && onViewModeChange(v as ViewMode)}
          className="bg-muted rounded-lg p-1"
        >
          <ToggleGroupItem value="daily" className="text-xs px-3 data-[state=on]:bg-background">
            Diário
          </ToggleGroupItem>
          <ToggleGroupItem value="weekly" className="text-xs px-3 data-[state=on]:bg-background">
            Semanal
          </ToggleGroupItem>
          <ToggleGroupItem value="monthly" className="text-xs px-3 data-[state=on]:bg-background">
            Mensal
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--background))',
                }}
                formatter={(value: number, name: string) => [
                  value.toLocaleString("pt-BR"),
                  name === "movingAverage" ? "Média 7 dias" : "Novos Seguidores"
                ]}
                labelFormatter={(label) => label}
              />
              <Legend 
                verticalAlign="top"
                height={36}
                formatter={(value) => value === "movingAverage" ? "Média 7 dias" : "Novos Seguidores"}
              />
              <Area
                type="monotone"
                dataKey="value"
                name="value"
                stroke={color}
                strokeWidth={2}
                fill="url(#colorFollowers)"
              />
              {viewMode === "daily" && showMovingAverage && (
                <Line
                  type="monotone"
                  dataKey="movingAverage"
                  name="movingAverage"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper to format dates based on view mode
function formatDisplayDate(dateStr: string, viewMode: ViewMode): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    
    switch (viewMode) {
      case "weekly":
        return `Sem ${format(date, "dd/MM", { locale: ptBR })}`;
      case "monthly":
        return format(date, "MMM/yy", { locale: ptBR });
      default:
        return format(date, "dd/MM", { locale: ptBR });
    }
  } catch {
    return dateStr;
  }
}
