import { ProductCombination } from "@/types/marketing";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface CrossSellBarsChartProps {
  combinations: ProductCombination[];
  limit?: number;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

export const CrossSellBarsChart = ({ combinations, limit = 5 }: CrossSellBarsChartProps) => {
  const topCombos = combinations
    .slice(0, limit)
    .map(combo => ({
      name: `${combo.produto1.slice(0, 20)}... + ${combo.produto2.slice(0, 20)}...`,
      fullName: `${combo.produto1} + ${combo.produto2}`,
      frequency: combo.frequencia,
      ticket: combo.faturamentoMedio
    }));

  if (topCombos.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        Nenhuma combinação encontrada
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <ChartContainer
      config={topCombos.reduce((acc, combo, index) => ({
        ...acc,
        [combo.name]: {
          label: combo.fullName,
          color: COLORS[index % COLORS.length]
        }
      }), {})}
      className="h-[250px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={topCombos}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis type="number" />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={180}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: number, name: string, props: any) => [
              `${value} vezes | Ticket: ${formatCurrency(props.payload.ticket)}`,
              'Frequência'
            ]}
            labelFormatter={(label) => {
              const combo = topCombos.find(c => c.name === label);
              return combo?.fullName || label;
            }}
          />
          <Bar dataKey="frequency" radius={[0, 4, 4, 0]}>
            {topCombos.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
