import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  Truck,
  DollarSign,
  ShoppingCart,
  Weight,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { getOfficialRevenue, getRevenueOrders, getB2BOrders } from "@/utils/revenue";
import { filterOrdersByDateRange } from "@/utils/salesCalculator";
import { format, differenceInDays } from "date-fns";
import { ProcessedOrder } from "@/types/marketing";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatKg = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value) + " kg";

const formatMonth = (yyyyMM: string): string => {
  const [year, month] = yyyyMM.split("-");
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${names[parseInt(month) - 1]}/${year}`;
};

interface ClienteB2B {
  cpf: string;
  nome: string;
  receita: number;
  pedidos: number;
  totalKg: number;
  ticketMedio: number;
  receitaPorKg: number;
  ultimoPedido: Date;
  diasSemComprar: number;
  intervaloMedio: number; // média de dias entre pedidos
  orders: ProcessedOrder[];
}

function calcIntervaloMedio(orders: ProcessedOrder[]): number {
  if (orders.length < 2) return 0;
  const sorted = [...orders].sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime());
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += differenceInDays(sorted[i].dataVenda, sorted[i - 1].dataVenda);
  }
  return Math.round(total / (sorted.length - 1));
}

function statusCliente(diasSemComprar: number, intervaloMedio: number): { label: string; color: string } {
  if (intervaloMedio === 0) return { label: "novo", color: "bg-blue-100 text-blue-800" };
  const ratio = diasSemComprar / intervaloMedio;
  if (ratio < 1.2) return { label: "ativo", color: "bg-green-100 text-green-800" };
  if (ratio < 2) return { label: "atenção", color: "bg-amber-100 text-amber-800" };
  return { label: "em risco", color: "bg-red-100 text-red-800" };
}

type SortField = "nome" | "receita" | "pedidos" | "ultimoPedido" | "diasSemComprar";
type SortDir = "asc" | "desc";

export default function LetsFly() {
  const { salesData, dateRange } = useDashboard();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("receita");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const today = useMemo(() => new Date(), []);

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "nome" ? "asc" : "desc");
    }
  };

  const filteredOrders = useMemo(() => {
    const segmented = getRevenueOrders(getB2BOrders(salesData));
    return dateRange ? filterOrdersByDateRange(segmented, dateRange.start, dateRange.end) : segmented;
  }, [salesData, dateRange]);

  const kpis = useMemo(() => {
    const receita = filteredOrders.reduce((s, o) => s + getOfficialRevenue(o), 0);
    const pedidos = filteredOrders.length;
    const totalKg = filteredOrders.reduce((s, o) => s + (o.pesoLiquido || 0), 0);
    const ticketMedio = pedidos > 0 ? receita / pedidos : 0;
    const receitaPorKg = totalKg > 0 ? receita / totalKg : 0;
    return { receita, pedidos, totalKg, ticketMedio, receitaPorKg };
  }, [filteredOrders]);

  const clientes = useMemo((): ClienteB2B[] => {
    const map = new Map<
      string,
      { nome: string; receita: number; pedidos: number; totalKg: number; orders: ProcessedOrder[] }
    >();
    filteredOrders.forEach((o) => {
      const key = o.cpfCnpj || "sem-doc";
      const cur = map.get(key) || {
        nome: o.nomeCliente?.trim() || "—",
        receita: 0,
        pedidos: 0,
        totalKg: 0,
        orders: [],
      };
      cur.receita += getOfficialRevenue(o);
      cur.pedidos += 1;
      cur.totalKg += o.pesoLiquido || 0;
      cur.orders.push(o);
      map.set(key, cur);
    });

    const list: ClienteB2B[] = Array.from(map.entries()).map(([cpf, d]) => {
      const sorted = [...d.orders].sort((a, b) => b.dataVenda.getTime() - a.dataVenda.getTime());
      const ultimoPedido = sorted[0].dataVenda;
      const diasSemComprar = differenceInDays(today, ultimoPedido);
      const intervaloMedio = calcIntervaloMedio(d.orders);
      return {
        cpf,
        ...d,
        ticketMedio: d.pedidos > 0 ? d.receita / d.pedidos : 0,
        receitaPorKg: d.totalKg > 0 ? d.receita / d.totalKg : 0,
        ultimoPedido,
        diasSemComprar,
        intervaloMedio,
        orders: sorted,
      };
    });

    return list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "nome") return dir * a.nome.localeCompare(b.nome);
      if (sortField === "pedidos") return dir * (a.pedidos - b.pedidos);
      if (sortField === "ultimoPedido") return dir * (a.ultimoPedido.getTime() - b.ultimoPedido.getTime());
      if (sortField === "diasSemComprar") return dir * (a.diasSemComprar - b.diasSemComprar);
      return dir * (a.receita - b.receita);
    });
  }, [filteredOrders, sortField, sortDir, today]);

  const emRisco = clientes.filter((c) => {
    const s = statusCliente(c.diasSemComprar, c.intervaloMedio);
    return s.label === "em risco" || s.label === "atenção";
  });

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
          title="Sem dados B2B"
          description="Não há pedidos B2B para o período selecionado."
          action={{ label: "Ir para Upload", href: "/upload" }}
        />
      </div>
    );
  }

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 hover:bg-transparent font-medium text-xs"
      onClick={() => handleSort(field)}
    >
      {label}
      {sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}
    </Button>
  );

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🚀 B2B — Lets Fly</h1>
        <p className="text-muted-foreground">Canal de venda direta para empresas</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: "Receita",
            value: formatCurrency(kpis.receita),
            icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
          },
          { label: "Pedidos", value: kpis.pedidos, icon: <ShoppingCart className="h-4 w-4 text-muted-foreground" /> },
          {
            label: "Volume",
            value: formatKg(kpis.totalKg),
            icon: <Weight className="h-4 w-4 text-muted-foreground" />,
          },
          {
            label: "Ticket Médio",
            value: formatCurrency(kpis.ticketMedio),
            icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
          },
          {
            label: "Receita/kg",
            value: formatCurrency(kpis.receitaPorKg),
            icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
          },
        ].map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{k.label}</CardTitle>
              {k.icon}
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerta de risco */}
      {emRisco.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <span className="font-semibold">{emRisco.length} cliente(s) sem compra recente — </span>
            {emRisco.map((c, i) => (
              <span key={c.cpf}>
                <span className="font-medium">{c.nome}</span>{" "}
                <span className="text-amber-600">({c.diasSemComprar}d sem comprar)</span>
                {i < emRisco.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabela por cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes B2B</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-6" />
                <TableHead>
                  <SortBtn field="nome" label="Cliente" />
                </TableHead>
                <TableHead className="text-right">
                  <SortBtn field="receita" label="Receita" />
                </TableHead>
                <TableHead className="text-right">
                  <SortBtn field="pedidos" label="Pedidos" />
                </TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">R$/kg</TableHead>
                <TableHead className="text-right">
                  <SortBtn field="ultimoPedido" label="Último pedido" />
                </TableHead>
                <TableHead className="text-right">
                  <SortBtn field="diasSemComprar" label="Dias sem comprar" />
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => {
                const status = statusCliente(c.diasSemComprar, c.intervaloMedio);
                const isExpanded = expandedRows.has(c.cpf);
                return (
                  <>
                    <TableRow key={c.cpf} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(c.cpf)}>
                      <TableCell className="text-muted-foreground">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.receita)}</TableCell>
                      <TableCell className="text-right">{c.pedidos}</TableCell>
                      <TableCell className="text-right">{formatKg(c.totalKg)}</TableCell>
                      <TableCell className="text-right">
                        {c.totalKg > 0 ? formatCurrency(c.receitaPorKg) : "—"}
                      </TableCell>
                      <TableCell className="text-right">{format(c.ultimoPedido, "dd/MM/yy")}</TableCell>
                      <TableCell className="text-right">
                        <span className={c.diasSemComprar > 30 ? "text-red-600 font-semibold" : ""}>
                          {c.diasSemComprar}d
                        </span>
                        {c.intervaloMedio > 0 && (
                          <span className="text-muted-foreground text-xs ml-1">(ciclo {c.intervaloMedio}d)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${c.cpf}-exp`} className="bg-muted/20">
                        <TableCell colSpan={9} className="p-0">
                          <div className="px-8 py-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Histórico de pedidos:</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground border-b">
                                  <th className="text-left py-1 pr-4">Data</th>
                                  <th className="text-left py-1 pr-4">NF</th>
                                  <th className="text-left py-1 pr-4">Produtos</th>
                                  <th className="text-right py-1 pr-4">Volume</th>
                                  <th className="text-right py-1">Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.orders.map((o, i) => (
                                  <tr key={i} className="border-b border-muted/50">
                                    <td className="py-1 pr-4">{format(o.dataVenda, "dd/MM/yyyy")}</td>
                                    <td className="py-1 pr-4 font-mono text-muted-foreground">
                                      {o.numeroNota || o.numeroNF || "—"}
                                    </td>
                                    <td className="py-1 pr-4 max-w-[300px] truncate">
                                      {o.produtos
                                        .map((p) => `${p.descricaoAjustada || p.descricao} x ${p.quantidade}`)
                                        .join(", ")}
                                    </td>
                                    <td className="py-1 pr-4 text-right">
                                      {o.pesoLiquido ? formatKg(o.pesoLiquido) : "—"}
                                    </td>
                                    <td className="py-1 text-right font-semibold">
                                      {formatCurrency(getOfficialRevenue(o))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Evolução mensal */}
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
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">R$/kg</TableHead>
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
