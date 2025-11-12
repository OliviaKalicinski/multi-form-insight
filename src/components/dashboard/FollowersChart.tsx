import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { FollowersData } from "@/types/marketing";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FollowersChartProps {
  data: FollowersData[];
  title: string;
  description: string;
}

export const FollowersChart = ({ data, title, description }: FollowersChartProps) => {
  // Sort data by date and calculate accumulated followers
  const sortedData = [...data].sort((a, b) => new Date(a.Data).getTime() - new Date(b.Data).getTime());
  
  let accumulated = 0;
  const chartData = sortedData.map((item) => {
    accumulated += parseInt(item.Seguidores);
    return {
      data: format(new Date(item.Data), "dd/MM", { locale: ptBR }),
      seguidoresAcumulados: accumulated,
      novosSeguidores: parseInt(item.Seguidores),
    };
  });

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
              dataKey="seguidoresAcumulados" 
              stroke="hsl(var(--chart-4))" 
              strokeWidth={2}
              name="Seguidores Acumulados"
              dot={{ fill: "hsl(var(--chart-4))" }}
            />
            <Line 
              type="monotone" 
              dataKey="novosSeguidores" 
              stroke="hsl(var(--chart-5))" 
              strokeWidth={2}
              name="Novos Seguidores"
              dot={{ fill: "hsl(var(--chart-5))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
