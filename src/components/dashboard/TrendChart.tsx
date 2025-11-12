import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MarketingData } from "@/types/marketing";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MetricConfig {
  dataKey: string;
  name: string;
  color: string;
}

interface TrendChartProps {
  data: MarketingData[];
  title: string;
  description: string;
  metrics: MetricConfig[];
}

export const TrendChart = ({ data, title, description, metrics }: TrendChartProps) => {
  const chartData = data.map((item) => ({
    data: format(new Date(item.Data), "dd/MM", { locale: ptBR }),
    visualizacoes: parseInt(item.Visualizações),
    alcance: parseInt(item.Alcance),
    visitas: parseInt(item.Visitas),
    interacoes: parseInt(item.Interações),
  }));

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="data" 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            {metrics.map((metric) => (
              <Line
                key={metric.dataKey}
                type="monotone"
                dataKey={metric.dataKey}
                stroke={metric.color}
                strokeWidth={2}
                name={metric.name}
                dot={{ fill: metric.color }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
