import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ProductRevenueData {
  product: string;
  revenue: number;
  percentage: number;
}

interface ProductRevenuePieChartProps {
  data: ProductRevenueData[];
  title: string;
  description: string;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c7c',
  '#8dd1e1',
  '#a4de6c',
  '#d084d0',
  '#ffbb28',
  '#ff8042',
  '#0088fe',
];

export const ProductRevenuePieChart = ({ 
  data, 
  title, 
  description 
}: ProductRevenuePieChartProps) => {
  const chartData = data.map(item => ({
    name: item.product,
    value: item.revenue,
    percentage: item.percentage
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Gráfico de Rosca */}
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.percentage.toFixed(1)}%`}
                  outerRadius={120}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => 
                    new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(value)
                  }
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend 
                  verticalAlign="middle" 
                  align="right"
                  layout="vertical"
                  wrapperStyle={{ fontSize: '12px', paddingLeft: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Tabela resumo ao lado */}
          <div className="flex-1 space-y-2">
            <h4 className="font-semibold text-sm mb-3">Top Produtos</h4>
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-2">
              {data.slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm border-b pb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs">{item.product}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="font-medium">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(item.revenue)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
