import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MarketingData } from "@/types/marketing";
import { format, startOfWeek, startOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "daily" | "weekly" | "monthly";

interface MetricConfig {
  dataKey: string;
  name: string;
  stroke?: string;
}

interface TrendChartWithFilterProps {
  data: MarketingData[];
  title: string;
  description?: string;
  metrics: MetricConfig[];
}

const safeInt = (v?: string) => {
  const n = parseInt((v ?? "0").trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

const parseMarketingDate = (s: string): Date | null => {
  if (!s) return null;

  // "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS"
  const normalized = s.includes(" ") ? s.replace(" ", "T") : s;

  // parseISO handles "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss"
  const d = parseISO(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const TrendChartWithFilter = ({ data, title, description, metrics }: TrendChartWithFilterProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("daily");

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Normalize and sort by date
    const normalized = data
      .map(item => {
        const d = parseMarketingDate(item.Data);
        if (!d) return null;
        return {
          date: d,
          visualizacoes: safeInt(item.Visualizações),
          alcance: safeInt(item.Alcance),
          visitas: safeInt(item.Visitas),
          interacoes: safeInt(item.Interações),
          clicks: safeInt(item["Clicks no Link"]),
        };
      })
      .filter(Boolean) as Array<{
        date: Date;
        visualizacoes: number;
        alcance: number;
        visitas: number;
        interacoes: number;
        clicks: number;
      }>;

    normalized.sort((a, b) => a.date.getTime() - b.date.getTime());

    if (viewMode === "daily") {
      return normalized.map(r => ({
        label: format(r.date, "dd/MM", { locale: ptBR }),
        visualizacoes: r.visualizacoes,
        alcance: r.alcance,
        visitas: r.visitas,
        interacoes: r.interacoes,
        clicks: r.clicks,
      }));
    }

    const grouped = new Map<string, { ts: number; sums: { visualizacoes: number; alcance: number; visitas: number; interacoes: number; clicks: number } }>();

    normalized.forEach(r => {
      const bucketDate =
        viewMode === "weekly"
          ? startOfWeek(r.date, { weekStartsOn: 0 })
          : startOfMonth(r.date);

      const key = viewMode === "weekly"
        ? format(bucketDate, "dd/MM", { locale: ptBR })
        : format(bucketDate, "MMM/yy", { locale: ptBR });

      if (!grouped.has(key)) {
        grouped.set(key, {
          ts: bucketDate.getTime(),
          sums: {
            visualizacoes: 0,
            alcance: 0,
            visitas: 0,
            interacoes: 0,
            clicks: 0,
          },
        });
      }

      const g = grouped.get(key)!;
      g.sums.visualizacoes += r.visualizacoes;
      g.sums.alcance += r.alcance;
      g.sums.visitas += r.visitas;
      g.sums.interacoes += r.interacoes;
      g.sums.clicks += r.clicks;
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[1].ts - b[1].ts)
      .map(([label, v]) => ({
        label,
        visualizacoes: v.sums.visualizacoes,
        alcance: v.sums.alcance,
        visitas: v.sums.visitas,
        interacoes: v.sums.interacoes,
        clicks: v.sums.clicks,
      }));
  }, [data, viewMode]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(v) => v && setViewMode(v as ViewMode)}
          className="gap-1"
        >
          <ToggleGroupItem value="daily" size="sm" className="text-xs px-2">
            Diário
          </ToggleGroupItem>
          <ToggleGroupItem value="weekly" size="sm" className="text-xs px-2">
            Semanal
          </ToggleGroupItem>
          <ToggleGroupItem value="monthly" size="sm" className="text-xs px-2">
            Mensal
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="label" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
            />
            <YAxis 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: number) => new Intl.NumberFormat('pt-BR').format(value)}
            />
            <Legend />
            {metrics.map((m) => (
              <Line
                key={m.dataKey}
                type="monotone"
                dataKey={m.dataKey}
                stroke={m.stroke || "hsl(var(--primary))"}
                strokeWidth={2}
                name={m.name}
                dot={{ fill: m.stroke || "hsl(var(--primary))", r: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
