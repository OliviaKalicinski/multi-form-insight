import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Package, Users, ShoppingCart, DollarSign, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { getOfficialRevenue, getRevenueOrders, getB2B2COrders } from "@/utils/revenue";
import { filterOrdersByDateRange } from "@/utils/salesCalculator";
import { format, differenceInDays } from "date-fns";
import { ProcessedOrder } from "@/types/marketing";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface Distribuidor {
  cpf: string;
  nome: string;
  receita: number;
  pedidos: number;
  ticketMedio: number;
  ultimoPedido: Date;
  diasSemComprar: number;
  intervaloMedio: number;
  share: number;
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

function statusDistribuidor(diasSemComprar: number, intervaloMedio: number): { label: string; color: string } {
  if (intervaloMedio === 0) return { label: "novo", color: "bg-blue-100 text-blue-800" };
  const ratio = diasSemComprar / intervaloMedio;
  if (ratio < 1.2) return { label: "ativo", color: "bg-green-100 text-green-800" };
  if (ratio < 2) return { label: "atenção", color: "bg-amber-100 text-amber-800" };
  return { label: "em risco", color: "bg-red-100 text-red-800" };
}

type SortField = "nome" | "receita" | "pedidos" | "ticketMedio" | "diasSemComprar";
type SortDir = "asc" | "desc";

export default function Distribuidores() {
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
    if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir(field === "nome" ? "asc" : "desc");
    }
  };

  const filteredOrders = useMemo(() => {
    const segmented = getRevenueOrders(getB2B2COrders(salesData));
    return dateRange ? filterOrdersByDateRange(segmented, dateRange.start, dateRange.end) : segmented;
  }, [salesData, dateRange]);

  const kpis = useMemo(() => {
    const receita = filteredOrders.reduce((s, o) => s + getOfficialRevenue(o), 0);
    const pedidos = filteredOrders.length;
    const ticketMedio = pedidos > 0 ? receita / pedidos : 0;
    const ativos = new Set(filteredOrders.map((o) => o.cpfCnpj)).size;
    return { receita, pedidos, ticketMedio, ativos };
  }, [filteredOrders]);

  const distribuidores = useMemo((): Distribuidor[] => {
    const map = new Map<string, { nome: string; receita: number; pedidos: number; orders: ProcessedOrder[] }>();
    filteredOrders.forEach((o) => {
      const key = o.cpfCnpj || "sem-doc";
      const cur = map.get(key) || { nome: o.nomeCliente?.trim() || "—", receita: 0, pedidos: 0, orders: [] };
      cur.receita += getOfficialRevenue(o);
      cur.pedidos += 1;
      cur.orders.push(o);
      map.set(key, cur);
    });

    const totalReceita = kpis.receita || 1;

    const list: Distribuidor[] = Array.from(map.entries()).map(([cpf, d]) => {
      const sorted = [...d.orders].sort((a, b) => b.dataVenda.getTime() - a.dataVenda.getTime());
      const ultimoPedido = sorted[0].dataVenda;
      const diasSemComprar = differenceInDays(today, ultimoPedido);
      const intervaloMedio = calcIntervaloMedio(d.orders);
      return {
        cpf,
        ...d,
        ticketMedio: d.pedidos > 0 ? d.receita / d.pedidos : 0,
        ultimoPedido,
        diasSemComprar,
        intervaloMedio,
        share: (d.receita / totalReceita) * 100,
        orders: sorted,
      };
    });

    return list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "nome") return dir * a.nome.localeCompare(b.nome);
      if (sortField === "pedidos") return dir * (a.pedidos - b.pedidos);
      if (sortField === "ticketMedio") return dir * (a.ticketMedio - b.ticketMedio);
      if (sortField === "diasSemComprar") return dir * (a.diasSemComprar - b.diasSemComprar);
      return dir * (a.receita - b.receita);
    });
  }, [filteredOrders, sortField, sortDir, today, kpis.receita]);

  const emRisco = distribuidores.filter((d) => {
    const s = statusDistribuidor(d.diasSemComprar, d.intervaloMedio);
    return s.label === "em risco" || s.label === "atenção";
  });

  if (filteredOrders.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="Sem dados de distribuidores"
          description="Não há pedidos B2B2C para o período selecionado."
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
        <h1 className="text-3xl font-bold">📦 B2B2C — Distribuidores</h1>
        <p className="text-muted-foreground">Revendedores e parceiros de canal</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Receita",
            value: formatCurrency(kpis.receita),
            icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
          },
          { label: "Pedidos", value: kpis.pedidos, icon: <ShoppingCart className="h-4 w-4 text-muted-foreground" /> },
          {
            label: "Ticket Médio",
            value: formatCurrency(kpis.ticketMedio),
            icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
          },
          {
            label: "Distribuidores ativos",
            value: kpis.ativos,
            icon: <Users className="h-4 w-4 text-muted-foreground" />,
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
            <span className="font-semibold">{emRisco.length} distribuidor(es) fora do ciclo de recompra — </span>
            {emRisco.map((d, i) => (
              <span key={d.cpf}>
                <span className="font-medium">{d.nome}</span>{" "}
                <span className="text-amber-600">
                  ({d.diasSemComprar}d sem comprar
                  {d.intervaloMedio > 0 ? `, ciclo médio ${d.intervaloMedio}d` : ""})
                </span>
                {i < emRisco.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabela de distribuidores */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuidores</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-6" />
                <TableHead>
                  <SortBtn field="nome" label="Distribuidor" />
                </TableHead>
                <TableHead className="text-right">
                  <SortBtn field="receita" label="Receita" />
                </TableHead>
                <TableHead className="w-36">% Canal</TableHead>
                <TableHead className="text-right">
                  <SortBtn field="pedidos" label="Pedidos" />
                </TableHead>
                <TableHead className="text-right">
                  <SortBtn field="ticketMedio" label="Ticket Médio" />
                </TableHead>
                <TableHead className="text-right">Último pedido</TableHead>
                <TableHead className="text-right">
                  <SortBtn field="diasSemComprar" label="Dias sem comprar" />
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distribuidores.map((d) => {
                const status = statusDistribuidor(d.diasSemComprar, d.intervaloMedio);
                const isExpanded = expandedRows.has(d.cpf);
                return (
                  <>
                    <TableRow key={d.cpf} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(d.cpf)}>
                      <TableCell className="text-muted-foreground">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{d.nome}</TableCell>
                      <TableCell className="text-right">{formatCurrency(d.receita)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${Math.min(d.share, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{d.share.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{d.pedidos}</TableCell>
                      <TableCell className="text-right">{formatCurrency(d.ticketMedio)}</TableCell>
                      <TableCell className="text-right">{format(d.ultimoPedido, "dd/MM/yy")}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            d.diasSemComprar > (d.intervaloMedio * 1.5 || 30) ? "text-red-600 font-semibold" : ""
                          }
                        >
                          {d.diasSemComprar}d
                        </span>
                        {d.intervaloMedio > 0 && (
                          <span className="text-muted-foreground text-xs ml-1">(ciclo {d.intervaloMedio}d)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${d.cpf}-exp`} className="bg-muted/20">
                        <TableCell colSpan={9} className="p-0">
                          <div className="px-8 py-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Histórico de pedidos:</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground border-b">
                                  <th className="text-left py-1 pr-4">Data</th>
                                  <th className="text-left py-1 pr-4">NF</th>
                                  <th className="text-left py-1 pr-4">Produtos</th>
                                  <th className="text-right py-1">Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {d.orders.map((o, i) => (
                                  <tr key={i} className="border-b border-muted/50">
                                    <td className="py-1 pr-4">{format(o.dataVenda, "dd/MM/yyyy")}</td>
                                    <td className="py-1 pr-4 font-mono text-muted-foreground">
                                      {o.numeroNota || o.numeroNF || "—"}
                                    </td>
                                    <td className="py-1 pr-4 max-w-[320px] truncate">
                                      {o.produtos
                                        .map((p) => `${p.descricaoAjustada || p.descricao} x ${p.quantidade}`)
                                        .join(", ")}
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

      {/* Concentração de receita */}
      <Card>
        <CardHeader>
          <CardTitle>Concentração de receita</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...distribuidores]
            .sort((a, b) => b.receita - a.receita)
            .map((d) => (
              <div key={d.cpf} className="flex items-center gap-3">
                <span className="text-sm w-48 truncate">{d.nome}</span>
                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(d.share, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-10 text-right">{d.share.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground w-24 text-right">{formatCurrency(d.receita)}</span>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
