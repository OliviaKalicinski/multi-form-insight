import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { MonthlyAggregate } from "@/utils/monthlyAggregator";

interface MetricConfig {
  dataKey: string;
  name: string;
  color: string;
}

interface MonthlyAggregateChartProps {
  data: MonthlyAggregate[];
  title: string;
  description: string;
  metrics: MetricConfig[];
}

export const MonthlyAggregateChart = ({ 
  data, 
  title, 
  description, 
  metrics 
}: MonthlyAggregateChartProps) => {
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
              dataKey="monthLabel" 
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
            <Legend />
            {metrics.map((metric) => (
              <Line
                key={metric.dataKey}
                type="monotone"
                dataKey={metric.dataKey}
                name={metric.name}
                stroke={metric.color}
                strokeWidth={2}
                dot={{ fill: metric.color, r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
