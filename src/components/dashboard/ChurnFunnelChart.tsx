import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ChurnFunnelChartProps {
  ativos: number;
  emRisco: number;
  inativos: number;
  churn: number;
}

export const ChurnFunnelChart = ({ ativos, emRisco, inativos, churn }: ChurnFunnelChartProps) => {
  const data = [
    { name: "Ativos (0-30 dias)", value: ativos, color: "hsl(var(--success))" },
    { name: "Em Risco (31-60 dias)", value: emRisco, color: "hsl(var(--warning))" },
    { name: "Inativos (61-90 dias)", value: inativos, color: "hsl(var(--destructive))" },
    { name: "Churn (90+ dias)", value: churn, color: "hsl(var(--muted-foreground))" },
  ];

  const total = ativos + emRisco + inativos + churn;

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
        <YAxis 
          type="category" 
          dataKey="name" 
          width={150}
          stroke="hsl(var(--muted-foreground))"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
          formatter={(value: number) => [
            `${value} clientes (${((value / total) * 100).toFixed(1)}%)`,
            "Quantidade"
          ]}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
