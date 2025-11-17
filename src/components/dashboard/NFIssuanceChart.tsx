import { NFIssuanceDistribution } from "@/types/marketing";
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface NFIssuanceChartProps {
  distribution: NFIssuanceDistribution[];
  averageDays: number;
}

export const NFIssuanceChart = ({ distribution, averageDays }: NFIssuanceChartProps) => {
  const chartData = distribution.map(item => ({
    faixa: item.faixa,
    quantidade: item.quantidade,
    percentual: item.percentual
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tempo médio de emissão</p>
          <p className="text-2xl font-bold">{averageDays.toFixed(1)} dias</p>
        </div>
      </div>
      
      <ChartContainer
        config={{
          quantidade: {
            label: "Quantidade de pedidos",
            color: "hsl(var(--primary))"
          }
        }}
        className="h-[300px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="faixa" 
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                `${value} pedidos (${props.payload.percentual.toFixed(1)}%)`,
                "Quantidade"
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Bar 
              dataKey="quantidade" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
              name="Quantidade de pedidos"
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {distribution.map((item, index) => (
          <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
            <span className="font-medium">{item.faixa}</span>
            <span className="text-muted-foreground">
              {item.quantidade} ({item.percentual.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
