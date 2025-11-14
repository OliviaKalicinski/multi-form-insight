import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { MonthlyAggregate } from "@/utils/monthlyAggregator";
import { ComparisonChartData } from "@/types/marketing";

interface NewFollowersChartProps {
  data: MonthlyAggregate[] | ComparisonChartData[];
  title: string;
  description: string;
  comparisonMode?: boolean;
  selectedMonths?: string[];
  monthColors?: Record<string, string>;
}

export const NewFollowersChart = ({ 
  data, 
  title, 
  description,
  comparisonMode = false,
  selectedMonths = [],
  monthColors = {},
}: NewFollowersChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
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
            {comparisonMode && <Legend />}
            {comparisonMode ? (
              selectedMonths.map((month) => {
                const color = monthColors[month] || "hsl(var(--chart-5))";
                return (
                  <Bar
                    key={month}
                    dataKey={month}
                    name={month}
                    fill={color}
                    radius={[4, 4, 0, 0]}
                  />
                );
              })
            ) : (
              <Bar
                dataKey="NovosSeguidores"
                name="Novos Seguidores"
                fill="hsl(var(--chart-5))"
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
