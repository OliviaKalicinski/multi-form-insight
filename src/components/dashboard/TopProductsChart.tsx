import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { ProductRanking } from "@/types/marketing";
import { formatCurrency } from "@/utils/salesCalculator";
import { TrendingUp, Gift, Package, ListTree } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TopProductsChartProps {
  products: ProductRanking[];
  sortBy: 'quantity' | 'revenue';
  viewMode: 'as-sold' | 'individual';
  limit?: number;
}

export const TopProductsChart = ({ 
  products, 
  sortBy, 
  viewMode,
  limit = 15 
}: TopProductsChartProps) => {
  const topProducts = products.slice(0, limit);
  
  const chartData = topProducts.map((p, index) => ({
    name: p.descricaoAjustada.length > 35 
      ? p.descricaoAjustada.substring(0, 35) + '...' 
      : p.descricaoAjustada,
    fullName: p.descricaoAjustada,
    value: sortBy === 'quantity' ? p.quantidadeTotal : p.faturamentoTotal,
    percentage: sortBy === 'quantity' ? p.percentualQuantidade : p.percentualFaturamento,
    quantity: p.quantidadeTotal,
    revenue: p.faturamentoTotal,
    orders: p.numeroPedidos,
    ticketMedio: p.ticketMedio,
    isFreebie: p.ticketMedio <= 0.02, // Brindes
    originalIndex: index,
    sku: p.sku,
  }));

  const getBarColor = (item: typeof chartData[0], index: number) => {
    if (item.isFreebie) return "hsl(142, 76%, 36%)"; // Verde
    if (index === 0) return "hsl(45, 93%, 47%)"; // Ouro
    if (index === 1) return "hsl(0, 0%, 60%)"; // Prata
    if (index === 2) return "hsl(28, 84%, 45%)"; // Bronze
    return "hsl(var(--primary))"; // Azul padrão
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top {limit} Produtos - Ranking Visual
            </CardTitle>
            <CardDescription>
              Visualização gráfica com produtos regulares e brindes
            </CardDescription>
          </div>
          
          {/* Badges de Status dos Filtros */}
          <div className="flex flex-col gap-2">
            <Badge variant={viewMode === 'as-sold' ? 'default' : 'secondary'} className="justify-center">
              {viewMode === 'as-sold' ? (
                <><Package className="h-3 w-3 mr-1" /> Como Vendidos</>
              ) : (
                <><ListTree className="h-3 w-3 mr-1" /> Individuais</>
              )}
            </Badge>
            <Badge variant={sortBy === 'quantity' ? 'default' : 'secondary'} className="justify-center">
              {sortBy === 'quantity' ? '📊 Quantidade' : '💰 Faturamento'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 130, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number"
              tick={{ fill: 'hsl(var(--foreground))' }}
              tickFormatter={(value) => 
                sortBy === 'quantity' 
                  ? value.toLocaleString('pt-BR')
                  : formatCurrency(value)
              }
            />
            <YAxis 
              type="category"
              dataKey="name" 
              width={120}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value: number, name: string, props: any) => {
                const item = props.payload;
                return [
                  <div key="tooltip" className="space-y-1.5">
                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                      <span>{item.fullName}</span>
                      {item.isFreebie && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-normal">
                          🎁 Brinde
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div>Quantidade:</div>
                      <div className="font-semibold">{item.quantity.toLocaleString('pt-BR')}</div>
                      <div>Faturamento:</div>
                      <div className="font-semibold">{formatCurrency(item.revenue)}</div>
                      <div>Pedidos:</div>
                      <div className="font-semibold">{item.orders}</div>
                      <div>Ticket Médio:</div>
                      <div className="font-semibold">{formatCurrency(item.ticketMedio)}</div>
                      <div>Participação:</div>
                      <div className="font-semibold">{item.percentage.toFixed(1)}%</div>
                    </div>
                  </div>,
                  ''
                ];
              }}
              labelFormatter={() => ''}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry, index)} 
                  opacity={entry.isFreebie ? 0.85 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        {/* Legenda de Cores */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground justify-center border-t pt-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(45, 93%, 47%)" }}></div>
            <span>🥇 1º Lugar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(0, 0%, 60%)" }}></div>
            <span>🥈 2º Lugar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(28, 84%, 45%)" }}></div>
            <span>🥉 3º Lugar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary"></div>
            <span>Produtos Regulares</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(142, 76%, 36%)" }}></div>
            <span>🎁 Brindes (R$ 0,01)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
