import { NFIssuanceDistribution } from "@/types/marketing";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface NFIssuanceChartProps {
  distribution: NFIssuanceDistribution[];
  averageDays: number;
}

const getBarColor = (faixa: string) => {
  if (faixa === "0-1 dias") return "#10b981"; // green
  if (faixa === "2-3 dias") return "#22c55e"; // light green
  if (faixa === "4-7 dias") return "#fbbf24"; // yellow
  if (faixa === "8-15 dias") return "#f97316"; // orange
  return "#ef4444"; // red for 15+
};

export const NFIssuanceChart = ({ distribution, averageDays }: NFIssuanceChartProps) => {
  const chartData = distribution.map(item => ({
    faixa: item.faixa,
    quantidade: item.quantidade,
    percentual: item.percentual,
    color: getBarColor(item.faixa)
  }));

  return (
    <div className="space-y-4">
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
              radius={[4, 4, 0, 0]}
              name="Quantidade de pedidos"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
        {distribution.map((item, index) => (
          <div 
            key={index} 
            className="flex flex-col items-center p-2 rounded"
            style={{ backgroundColor: `${getBarColor(item.faixa)}15` }}
          >
            <span className="font-medium text-xs">{item.faixa}</span>
            <span className="text-lg font-bold" style={{ color: getBarColor(item.faixa) }}>
              {item.quantidade}
            </span>
            <span className="text-xs text-muted-foreground">
              ({item.percentual.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
