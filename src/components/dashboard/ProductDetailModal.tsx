import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Package, DollarSign, ShoppingCart, Users } from "lucide-react";
import { formatCurrency } from "@/utils/salesCalculator";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProductDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    descricaoAjustada: string;
    quantidadeTotal: number;
    faturamentoTotal: number;
    precoMedio?: number;
  } | null;
}

export function ProductDetailModal({
  open,
  onOpenChange,
  product,
}: ProductDetailModalProps) {
  const { salesData, availableMonths } = useDashboard();

  // Calcular tendência de vendas por mês
  const trendData = useMemo(() => {
    if (!product || !salesData.length) return [];

    const monthlyData: Record<string, { quantity: number; revenue: number }> = {};

    salesData.forEach((order) => {
      const month = format(order.dataVenda, "yyyy-MM");
      
      order.produtos.forEach((item) => {
        if (item.descricaoAjustada === product.descricaoAjustada) {
          if (!monthlyData[month]) {
            monthlyData[month] = { quantity: 0, revenue: 0 };
          }
          monthlyData[month].quantity += item.quantidade;
          monthlyData[month].revenue += item.preco * item.quantidade;
        }
      });
    });

    return availableMonths
      .map((month) => ({
        month,
        monthLabel: format(parse(month, "yyyy-MM", new Date()), "MMM yy", { locale: ptBR }),
        quantity: monthlyData[month]?.quantity || 0,
        revenue: monthlyData[month]?.revenue || 0,
      }))
      .slice(-6); // últimos 6 meses
  }, [product, salesData, availableMonths]);

  // Calcular principais compradores
  const topBuyers = useMemo(() => {
    if (!product || !salesData.length) return [];

    const buyerData: Record<string, { name: string; quantity: number; revenue: number }> = {};

    salesData.forEach((order) => {
      order.produtos.forEach((item) => {
        if (item.descricaoAjustada === product.descricaoAjustada) {
          const clienteId = order.nomeCliente || "Anônimo";
          if (!buyerData[clienteId]) {
            buyerData[clienteId] = { name: clienteId, quantity: 0, revenue: 0 };
          }
          buyerData[clienteId].quantity += item.quantidade;
          buyerData[clienteId].revenue += item.preco * item.quantidade;
        }
      });
    });

    return Object.values(buyerData)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [product, salesData]);

  // Calcular produtos frequentemente comprados juntos
  const frequentCombinations = useMemo(() => {
    if (!product || !salesData.length) return [];

    const combinations: Record<string, { product: string; count: number }> = {};

    salesData.forEach((order) => {
      const hasProduct = order.produtos.some(
        (item) => item.descricaoAjustada === product.descricaoAjustada
      );

      if (hasProduct) {
        order.produtos.forEach((item) => {
          if (item.descricaoAjustada !== product.descricaoAjustada) {
            if (!combinations[item.descricaoAjustada]) {
              combinations[item.descricaoAjustada] = { product: item.descricaoAjustada, count: 0 };
            }
            combinations[item.descricaoAjustada].count++;
          }
        });
      }
    });

    return Object.values(combinations)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [product, salesData]);

  // Calcular variação vs mês anterior
  const variation = useMemo(() => {
    if (trendData.length < 2) return null;
    const current = trendData[trendData.length - 1];
    const previous = trendData[trendData.length - 2];
    
    if (previous.quantity === 0) return null;
    
    return ((current.quantity - previous.quantity) / previous.quantity) * 100;
  }, [trendData]);

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product.descricaoAjustada}
          </DialogTitle>
          <DialogDescription>
            Análise detalhada do produto
          </DialogDescription>
        </DialogHeader>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <ShoppingCart className="h-4 w-4" />
                Quantidade
              </div>
              <div className="text-2xl font-bold">
                {product.quantidadeTotal.toLocaleString("pt-BR")}
              </div>
              {variation !== null && (
                <div className={`flex items-center gap-1 text-xs ${variation >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {variation >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {variation >= 0 ? "+" : ""}{variation.toFixed(1)}% vs mês anterior
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Faturamento
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(product.faturamentoTotal)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Preço Médio
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(product.precoMedio || product.faturamentoTotal / product.quantidadeTotal)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                Compradores
              </div>
              <div className="text-2xl font-bold">
                {topBuyers.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trend" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trend">📈 Tendência</TabsTrigger>
            <TabsTrigger value="buyers">👥 Compradores</TabsTrigger>
            <TabsTrigger value="combinations">🔗 Combinações</TabsTrigger>
          </TabsList>

          <TabsContent value="trend" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vendas nos Últimos 6 Meses</CardTitle>
              </CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="monthLabel" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          name === "quantity" ? value.toLocaleString("pt-BR") : formatCurrency(value),
                          name === "quantity" ? "Quantidade" : "Receita",
                        ]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="quantity"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Sem dados de tendência disponíveis
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="buyers" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 Compradores</CardTitle>
              </CardHeader>
              <CardContent>
                {topBuyers.length > 0 ? (
                  <div className="space-y-3">
                    {topBuyers.map((buyer, index) => (
                      <div
                        key={buyer.name}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                            {index + 1}
                          </Badge>
                          <span className="font-medium text-sm truncate max-w-[200px]">
                            {buyer.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {buyer.quantity} un.
                          </span>
                          <span className="font-semibold">
                            {formatCurrency(buyer.revenue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Sem dados de compradores disponíveis
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="combinations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Produtos Frequentemente Comprados Juntos</CardTitle>
              </CardHeader>
              <CardContent>
                {frequentCombinations.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={frequentCombinations} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis
                        type="category"
                        dataKey="product"
                        width={150}
                        className="text-xs"
                        tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + "..." : value}
                      />
                      <Tooltip
                        formatter={(value: number) => [value, "Pedidos juntos"]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Sem combinações frequentes encontradas
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
