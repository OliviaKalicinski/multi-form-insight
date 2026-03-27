import { Fragment, useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, TrendingUp, ShoppingCart, DollarSign, Users, Search, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────
interface RawRow {
  campaign: string;
  coupons: string;
  date_sale: string;
  date_validation: string;
  date_payment_schedule: string;
  order_id: string;
  order_value: string;
  payment_value: string;
  products: string;
}

interface SaleRow {
  coupon: string; // primeiro coupon
  date_sale: Date;
  order_id: string;
  order_value: number;
  payment_value: number;
  products: string[];
}

interface InfluencerStats {
  coupon: string;
  total_orders: number;
  gmv: number;
  commission: number;
  avg_ticket: number;
  products: Record<string, number>; // product name → qty
  last_sale: Date;
  first_sale: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseBRNumber(raw: string): number {
  if (!raw) return 0;
  // Remove aspas, espaços; troca vírgula por ponto
  return parseFloat(raw.replace(/["\s]/g, "").replace(",", ".")) || 0;
}

function parseFlexDate(raw: string): Date | null {
  if (!raw) return null;
  // Normalise Portuguese month abbreviations → English
  const ptToEn: Record<string, string> = {
    "jan.": "Jan", "fev.": "Feb", "mar.": "Mar", "abr.": "Apr",
    "mai.": "May", "jun.": "Jun", "jul.": "Jul", "ago.": "Aug",
    "set.": "Sep", "out.": "Oct", "nov.": "Nov", "dez.": "Dec",
  };
  let s = raw.trim();
  for (const [pt, en] of Object.entries(ptToEn)) {
    s = s.replace(new RegExp(pt, "gi"), en);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function firstCoupon(raw: string): string {
  // "ZEDALMEIDA , ARYA , JOCA" → "ZEDALMEIDA"
  return raw.split(",")[0].trim().toUpperCase();
}

function parseCSV(raw: string): SaleRow[] {
  const result = Papa.parse<RawRow>(raw, { header: true, skipEmptyLines: true });
  return result.data
    .map((row): SaleRow | null => {
      const coupon = firstCoupon(row.coupons || "");
      if (!coupon) return null;
      const date_sale = parseFlexDate(row.date_sale);
      if (!date_sale) return null;
      return {
        coupon,
        date_sale,
        order_id: row.order_id || "",
        order_value: parseBRNumber(row.order_value),
        payment_value: parseBRNumber(row.payment_value),
        products: (row.products || "").split(",").map((p) => p.trim()).filter(Boolean),
      };
    })
    .filter((r): r is SaleRow => r !== null);
}

function buildStats(rows: SaleRow[]): InfluencerStats[] {
  const map = new Map<string, InfluencerStats>();

  for (const row of rows) {
    if (!map.has(row.coupon)) {
      map.set(row.coupon, {
        coupon: row.coupon,
        total_orders: 0,
        gmv: 0,
        commission: 0,
        avg_ticket: 0,
        products: {},
        last_sale: row.date_sale,
        first_sale: row.date_sale,
      });
    }
    const s = map.get(row.coupon)!;
    s.total_orders += 1;
    s.gmv += row.order_value;
    s.commission += row.payment_value;
    if (row.date_sale > s.last_sale) s.last_sale = row.date_sale;
    if (row.date_sale < s.first_sale) s.first_sale = row.date_sale;
    for (const p of row.products) {
      s.products[p] = (s.products[p] || 0) + 1;
    }
  }

  for (const s of map.values()) {
    s.avg_ticket = s.total_orders > 0 ? s.gmv / s.total_orders : 0;
  }

  return Array.from(map.values()).sort((a, b) => b.gmv - a.gmv);
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function topProducts(products: Record<string, number>, n = 3): string {
  return Object.entries(products)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, qty]) => `${name} (${qty}x)`)
    .join(", ");
}

const STORAGE_KEY = "influencer_performance_csv";

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function PerformanceInfluenciadores() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<SaleRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved, (k, v) =>
        k === "date_sale" ? new Date(v) : v
      ) : [];
    } catch { return []; }
  });

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof InfluencerStats>("gmv");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedCoupon, setExpandedCoupon] = useState<string | null>(null);

  // Date filter
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const filteredRows = useMemo(() => {
    let r = rows;
    if (dateFrom) r = r.filter((row) => row.date_sale >= new Date(dateFrom));
    if (dateTo)   r = r.filter((row) => row.date_sale <= new Date(dateTo + "T23:59:59"));
    return r;
  }, [rows, dateFrom, dateTo]);

  const stats = useMemo(() => buildStats(filteredRows), [filteredRows]);

  const totalGMV = useMemo(() => stats.reduce((s, r) => s + r.gmv, 0), [stats]);
  const totalCommission = useMemo(() => stats.reduce((s, r) => s + r.commission, 0), [stats]);
  const totalOrders = useMemo(() => stats.reduce((s, r) => s + r.total_orders, 0), [stats]);

  const displayed = useMemo(() => {
    let list = [...stats];
    if (search) {
      list = list.filter((s) => s.coupon.toLowerCase().includes(search.toLowerCase()));
    }
    list.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av instanceof Date && bv instanceof Date) {
        return sortAsc ? av.getTime() - bv.getTime() : bv.getTime() - av.getTime();
      }
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      return 0;
    });
    return list;
  }, [stats, search, sortField, sortAsc]);

  const handleSort = (field: keyof InfluencerStats) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const SortIcon = ({ field }: { field: keyof InfluencerStats }) =>
    sortField === field
      ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
      : <ChevronDown className="h-3 w-3 opacity-30" />;

  const clearData = () => {
    if (!confirm("Limpar todos os dados carregados?")) return;
    setRows([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Performance de Influenciadores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Análise de vendas por coupon</p>
        </div>
        <div className="flex gap-2">
          {rows.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearData}>
              <X className="h-4 w-4 mr-1" /> Limpar dados
            </Button>
          )}
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Importar CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed rounded-xl">
          <Upload className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-muted-foreground">Nenhum dado carregado</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Importe a planilha de vendas por influenciador (formato padrão do sistema)
            </p>
          </div>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Importar CSV
          </Button>
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> GMV Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(totalGMV)}</div>
                <p className="text-xs text-muted-foreground mt-0.5">gerado pelos coupons</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> Comissões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(totalCommission)}</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalGMV > 0 ? ((totalCommission / totalGMV) * 100).toFixed(1) : "0"}% do GMV
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <ShoppingCart className="h-3.5 w-3.5" /> Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ticket médio {totalOrders > 0 ? fmt(totalGMV / totalOrders) : "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Influenciadores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.length}</div>
                <p className="text-xs text-muted-foreground mt-0.5">coupons ativos no período</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                className="pl-8 w-48"
                placeholder="Buscar coupon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>De</span>
              <Input
                type="date"
                className="w-36"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span>Até</span>
              <Input
                type="date"
                className="w-36"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Coupon</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("total_orders")}
                      >
                        <div className="flex items-center gap-1">Pedidos <SortIcon field="total_orders" /></div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("gmv")}
                      >
                        <div className="flex items-center gap-1">GMV <SortIcon field="gmv" /></div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("commission")}
                      >
                        <div className="flex items-center gap-1">Comissão <SortIcon field="commission" /></div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("avg_ticket")}
                      >
                        <div className="flex items-center gap-1">Ticket Médio <SortIcon field="avg_ticket" /></div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("last_sale")}
                      >
                        <div className="flex items-center gap-1">Última Venda <SortIcon field="last_sale" /></div>
                      </TableHead>
                      <TableHead>Tops Produtos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Bug fix: Fragment com key para reconciliação correta no map */}
                    {displayed.map((s, i) => (
                      <Fragment key={s.coupon}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => setExpandedCoupon(expandedCoupon === s.coupon ? null : s.coupon)}
                        >
                          <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{s.coupon}</span>
                              {i === 0 && <Badge className="text-[10px] px-1.5 py-0">🏆 Top</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{s.total_orders}</TableCell>
                          <TableCell className="font-medium">{fmt(s.gmv)}</TableCell>
                          <TableCell className="text-amber-700">{fmt(s.commission)}</TableCell>
                          <TableCell>{fmt(s.avg_ticket)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{fmtDate(s.last_sale)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                            {topProducts(s.products)}
                          </TableCell>
                        </TableRow>

                        {/* Expanded row: product breakdown */}
                        {expandedCoupon === s.coupon && (
                          <TableRow key={`${s.coupon}-expanded`} className="bg-muted/20">
                            <TableCell colSpan={8} className="py-3 px-6">
                              <div className="text-xs font-medium mb-2 text-muted-foreground">
                                Todos os produtos — {s.coupon} ({s.total_orders} pedidos, ativo de {fmtDate(s.first_sale)} a {fmtDate(s.last_sale)})
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(s.products)
                                  .sort((a, b) => b[1] - a[1])
                                  .map(([product, qty]) => (
                                    <div
                                      key={product}
                                      className="bg-white border rounded-md px-2.5 py-1 text-xs flex items-center gap-1.5"
                                    >
                                      <span>{product}</span>
                                      <Badge variant="secondary" className="text-[10px] px-1 py-0">{qty}x</Badge>
                                    </div>
                                  ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}

                    {displayed.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhum resultado encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
