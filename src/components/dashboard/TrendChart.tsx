import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MarketingData } from "@/types/marketing";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TrendChartProps {
  data: MarketingData[];
  title: string;
  description: string;
}

export const TrendChart = ({ data, title, description }: TrendChartProps) => {
  const chartData = data.map((item) => ({
    data: format(new Date(item.Data), "dd/MM", { locale: ptBR }),
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
            <Line 
              type="monotone" 
              dataKey="alcance" 
              stroke="hsl(var(--chart-1))" 
              strokeWidth={2}
              name="Alcance"
              dot={{ fill: "hsl(var(--chart-1))" }}
            />
            <Line 
              type="monotone" 
              dataKey="visitas" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              name="Visitas"
              dot={{ fill: "hsl(var(--chart-2))" }}
            />
            <Line 
              type="monotone" 
              dataKey="interacoes" 
              stroke="hsl(var(--chart-3))" 
              strokeWidth={2}
              name="Interações"
              dot={{ fill: "hsl(var(--chart-3))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
