import { useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Truck, DollarSign, ShoppingCart, Weight, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { getOfficialRevenue, getRevenueOrders, getB2BOrders } from "@/utils/revenue";
import { filterOrdersByMonth } from "@/utils/salesCalculator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatKg = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value) + " kg";

const formatMonth = (yyyyMM: string): string => {
  const [year, month] = yyyyMM.split("-");
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${names[parseInt(month) - 1]}/${year}`;
};

export default function LetsFly() {
  const { salesData, selectedMonth } = useDashboard();

  const availableSalesMonths = useMemo(() => {
    const months = new Set<string>();
    salesData.forEach((o) => months.add(format(o.dataVenda, "yyyy-MM")));
    return Array.from(months).sort();
  }, [salesData]);

  const filteredOrders = useMemo(() => {
    const segmented = getRevenueOrders(getB2BOrders(salesData));
    return selectedMonth ? filterOrdersByMonth(segmented, selectedMonth, availableSalesMonths) : segmented;
  }, [salesData, selectedMonth, availableSalesMonths]);

  const kpis = useMemo(() => {
    const receita = filteredOrders.reduce((s, o) => s + getOfficialRevenue(o), 0);
    const pedidos = filteredOrders.length;
    const totalKg = filteredOrders.reduce((s, o) => s + (o.pesoLiquido || 0), 0);
    const ticketMedio = pedidos > 0 ? receita / pedidos : 0;
    const receitaPorKg = totalKg > 0 ? receita / totalKg : 0;
    return { receita, pedidos, totalKg, ticketMedio, receitaPorKg };
  }, [filteredOrders]);

  // Tabela mensal
  const monthlyData = useMemo(() => {
    const map = new Map<string, { receita: number; kg: number; pedidos: number }>();
    filteredOrders.forEach((o) => {
      const month = format(o.dataVenda, "yyyy-MM");
      const cur = map.get(month) || { receita: 0, kg: 0, pedidos: 0 };
      cur.receita += getOfficialRevenue(o);
      cur.kg += o.pesoLiquido || 0;
      cur.pedidos += 1;
      map.set(month, cur);
    });
    return Array.from(map.entries())
      .map(([month, d]) => ({ month, ...d, receitaPorKg: d.kg > 0 ? d.receita / d.kg : 0 }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [filteredOrders]);

  if (filteredOrders.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <EmptyState
          icon={<Truck className="h-8 w-8" />}
          title="Sem dados Let's Fly"
          description="Não há pedidos B2B para o período selecionado. Verifique o filtro de mês ou faça upload de dados com segmento 'b2b'."
          action={{ label: "Ir para Upload", href: "/upload" }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">🚀 Let's Fly</h1>
        <p className="text-muted-foreground">Canal B2B — performance por volume e receita</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(kpis.receita)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis.pedidos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Volume</CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatKg(kpis.totalKg)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(kpis.ticketMedio)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita/KG</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(kpis.receitaPorKg)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Volume KG</TableHead>
                <TableHead className="text-right">Receita/KG</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((d) => (
                <TableRow key={d.month}>
                  <TableCell className="font-medium">{formatMonth(d.month)}</TableCell>
                  <TableCell className="text-right">{d.pedidos}</TableCell>
                  <TableCell className="text-right">{formatCurrency(d.receita)}</TableCell>
                  <TableCell className="text-right">{formatKg(d.kg)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(d.receitaPorKg)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
