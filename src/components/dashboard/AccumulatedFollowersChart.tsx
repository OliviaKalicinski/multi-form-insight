import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { MonthlyAggregate } from "@/utils/monthlyAggregator";
import { ComparisonChartData } from "@/types/marketing";

interface AccumulatedFollowersChartProps {
  data: MonthlyAggregate[] | ComparisonChartData[];
  title: string;
  description: string;
  comparisonMode?: boolean;
  selectedMonths?: string[];
  monthColors?: Record<string, string>;
}

export const AccumulatedFollowersChart = ({ 
  data, 
  title, 
  description,
  comparisonMode = false,
  selectedMonths = [],
  monthColors = {},
}: AccumulatedFollowersChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey={comparisonMode ? "dia" : "monthLabel"}
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            {comparisonMode ? (
              selectedMonths.map((month) => {
                const color = monthColors[month] || "hsl(var(--chart-4))";
                return (
                  <Line
                    key={month}
                    type="monotone"
                    dataKey={month}
                    name={month}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, r: 3 }}
                  />
                );
              })
            ) : (
              <Line
                type="monotone"
                dataKey="CrescimentoAcumulado"
                name="Crescimento Acumulado"
                stroke="hsl(var(--chart-4))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-4))', r: 4 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
