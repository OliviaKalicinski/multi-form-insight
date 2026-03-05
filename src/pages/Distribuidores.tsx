import { useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Package, Users, ShoppingCart, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { getOfficialRevenue, getRevenueOrders, getB2B2COrders } from "@/utils/revenue";
import { filterOrdersByMonth } from "@/utils/salesCalculator";
import { format } from "date-fns";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function Distribuidores() {
  const { salesData, selectedMonth } = useDashboard();

  const availableSalesMonths = useMemo(() => {
    const months = new Set<string>();
    salesData.forEach(o => months.add(format(o.dataVenda, "yyyy-MM")));
    return Array.from(months).sort();
  }, [salesData]);

  const filteredOrders = useMemo(() => {
    const segmented = getRevenueOrders(getB2B2COrders(salesData));
    return selectedMonth
      ? filterOrdersByMonth(segmented, selectedMonth, availableSalesMonths)
      : segmented;
  }, [salesData, selectedMonth, availableSalesMonths]);

  const kpis = useMemo(() => {
    const receita = filteredOrders.reduce((s, o) => s + getOfficialRevenue(o), 0);
    const pedidos = filteredOrders.length;
    const ticketMedio = pedidos > 0 ? receita / pedidos : 0;
    const clientesUnicos = new Set(filteredOrders.map(o => o.cpfCnpj)).size;
    return { receita, pedidos, ticketMedio, clientesUnicos };
  }, [filteredOrders]);

  const distribuidores = useMemo(() => {
    const map = new Map<string, { nome: string; receita: number; pedidos: number }>();
    filteredOrders.forEach(o => {
      const key = o.cpfCnpj || "sem-doc";
      const cur = map.get(key) || { nome: o.nomeCliente?.trim() || "—", receita: 0, pedidos: 0 };
      cur.receita += getOfficialRevenue(o);
      cur.pedidos += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([cpf, d]) => ({ cpf, ...d }))
      .sort((a, b) => b.receita - a.receita);
  }, [filteredOrders]);

  if (filteredOrders.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="Sem dados de distribuidores"
          description="Não há pedidos B2B2C para o período selecionado. Verifique o filtro de mês ou faça upload de dados com segmento 'b2b2c'."
          action={{ label: "Ir para Upload", href: "/upload" }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">📦 Distribuidores</h1>
        <p className="text-muted-foreground">Canal B2B2C — performance por distribuidor</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(kpis.receita)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{kpis.pedidos}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(kpis.ticketMedio)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{kpis.clientesUnicos}</p></CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Top Distribuidores</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Distribuidor</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distribuidores.map(d => (
                <TableRow key={d.cpf}>
                  <TableCell className="font-medium">{d.nome}</TableCell>
                  <TableCell className="text-right">{formatCurrency(d.receita)}</TableCell>
                  <TableCell className="text-right">{d.pedidos}</TableCell>
                  <TableCell className="text-right">{formatCurrency(d.pedidos > 0 ? d.receita / d.pedidos : 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
