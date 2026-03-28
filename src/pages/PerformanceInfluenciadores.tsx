import { Fragment, useState, useMemo, useRef, useCallback } from "react";
import Papa from "papaparse";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Upload, TrendingUp, ShoppingCart, DollarSign, Package,
  Search, ChevronDown, ChevronUp, X, AlertCircle, User,
} from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────
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
  coupon: string;
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
  products: Record<string, number>;
  last_sale: Date;
  first_sale: Date;
}

interface BonifRow {
  id: string;
  data_venda: string;
  valor_total: number;
  cliente_nome: string | null;
  cliente_email: string | null;
  cpf_cnpj: string | null;
  produtos: any[] | null;
}

interface Influencer {
  email: string;
  name: string;
  instagram: string;
  cnpj?: string;
  cpf?: string;
}

// ─── Storage keys (legacy, kept for reference) ────────────────────────────────────
// Data now comes from Supabase tables instead of localStorage
// const STORAGE_KEY = "influencer_performance_csv";
// const REGISTRY_KEY = "influencer_registry";
// const LINKS_KEY = "influencer_coupon_links";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseBRNumber(raw: string): number {
  if (!raw) return 0;
  return parseFloat(raw.replace(/["\s]/g, "").replace(",", ".")) || 0;
}

function parseFlexDate(raw: string): Date | null {
  if (!raw) return null;
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

/** Normaliza nome para comparação tolerante */
function normalizeName(s: string | null | undefined): string {
  if (!s) return "";
  return s.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: Date | null | undefined): string {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy", { locale: ptBR });
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PerformanceInfluenciadores() {
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Filtro global do dashboard
  const { dateRange } = useDashboard();

  // ── Influencer registry from Supabase ───────────────────────────────────
  const { data: influencers = [], isLoading: loadingInfluencers } = useQuery({
    queryKey: ["influencer_registry"],
    queryFn: async () => {
      // Usa select("*") para não quebrar caso a coluna cpf ainda não exista no banco
      const { data, error } = await (supabase.from("influencer_registry") as any)
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as Array<{
        email: string;
        name: string;
        instagram: string;
        tiktok?: string;
        cnpj?: string;
        cpf?: string;
        coupon: string | null;
      }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Derive coupon maps from influencer registry
  const couponByEmail = useMemo(() => {
    const map = new Map<string, string>();
    for (const inf of influencers) {
      if (inf.coupon) {
        map.set(inf.email.toLowerCase(), inf.coupon);
      }
    }
    return map;
  }, [influencers]);

  // Reverse map: coupon → influencer
  const influencerByCoupon = useMemo(() => {
    const map = new Map<string, Influencer>();
    for (const inf of influencers) {
      if (inf.coupon) {
        map.set(inf.coupon, {
          email: inf.email,
          name: inf.name,
          instagram: inf.instagram || "",
          cnpj: inf.cnpj,
          cpf: inf.cpf,
        });
      }
    }
    return map;
  }, [influencers]);

  // ── NFs de bonificação (sales_data com tipo_movimento = 'bonificacao') ──
  const { data: bonifRaw = [], isLoading: loadingBonif } = useQuery({
    queryKey: ["bonificacao-influenciadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_data")
        .select("id, data_venda, valor_total, cliente_nome, cliente_email, cpf_cnpj, produtos")
        .eq("tipo_movimento", "bonificacao")
        .order("data_venda", { ascending: false });
      if (error) throw error;
      return (data || []) as BonifRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filtra bonificações pelo dateRange global
  const bonifFiltered = useMemo(() => {
    if (!dateRange) return bonifRaw;
    return bonifRaw.filter((r) => {
      if (!r.data_venda) return false;
      const d = new Date(r.data_venda);
      return !isNaN(d.getTime()) && d >= dateRange.start && d <= dateRange.end;
    });
  }, [bonifRaw, dateRange]);

  // Map: coupon → list of bonification rows
  // Também rastreia NFs não casadas para diagnóstico
  const { bonifByCoupon, bonifUnmatched } = useMemo(() => {
    const map = new Map<string, BonifRow[]>();
    const unmatched: BonifRow[] = [];

    for (const row of bonifFiltered) {
      let coupon: string | undefined;

      // 1. Match por e-mail — só tenta se o campo realmente parece um e-mail (contém "@")
      // Muitos sistemas gravam o CPF no campo cliente_email; ignoramos nesses casos.
      const isRealEmail = row.cliente_email?.includes("@");
      if (isRealEmail) {
        coupon = couponByEmail.get(row.cliente_email!.trim().toLowerCase());
      }

      // 2. Match por documento (CPF / CNPJ)
      // Verifica cpf_cnpj E cliente_email quando este último parecer um documento
      const docCandidates = new Set<string>();
      if (row.cpf_cnpj) docCandidates.add(row.cpf_cnpj.replace(/\D/g, ""));
      if (!isRealEmail && row.cliente_email) docCandidates.add(row.cliente_email.replace(/\D/g, ""));

      if (!coupon && docCandidates.size > 0) {
        for (const inf of influencers) {
          const cnpjNorm = inf.cnpj?.replace(/\D/g, "");
          const cpfNorm  = inf.cpf?.replace(/\D/g, "");
          if ((cnpjNorm && docCandidates.has(cnpjNorm)) ||
              (cpfNorm  && docCandidates.has(cpfNorm))) {
            coupon = couponByEmail.get(inf.email.toLowerCase());
            break;
          }
        }
      }

      // 3. Match por nome — exato primeiro, depois parcial (≥2 partes significativas)
      if (!coupon && row.cliente_nome) {
        const normRow  = normalizeName(row.cliente_nome);
        const rowParts = normRow.split(" ").filter((p) => p.length >= 3);

        // 3a. exato
        for (const inf of influencers) {
          if (normalizeName(inf.name) === normRow) {
            coupon = couponByEmail.get(inf.email.toLowerCase());
            if (coupon) break;
          }
        }
        // 3b. parcial — todas as partes significativas da NF aparecem no nome do cadastro
        if (!coupon && rowParts.length >= 2) {
          for (const inf of influencers) {
            const normInf = normalizeName(inf.name);
            if (rowParts.every((p) => normInf.includes(p))) {
              coupon = couponByEmail.get(inf.email.toLowerCase());
              if (coupon) break;
            }
          }
        }
      }
      if (!coupon) {
        unmatched.push(row);
        continue;
      }
      if (!map.has(coupon)) map.set(coupon, []);
      map.get(coupon)!.push(row);
    }
    return { bonifByCoupon: map, bonifUnmatched: unmatched };
  }, [bonifFiltered, couponByEmail, influencers]);

  // ── CSV data from Supabase ───────────────────────────────────────────────
  const { data: rows = [], isLoading: loadingRows, refetch: refetchRows } = useQuery({
    queryKey: ["influencer_sales"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("influencer_sales") as any)
        .select("coupon, date_sale, order_id, order_value, payment_value, products")
        .order("date_sale", { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        coupon: row.coupon,
        date_sale: new Date(row.date_sale),
        order_id: row.order_id,
        order_value: row.order_value || 0,
        payment_value: row.payment_value || 0,
        products: row.products || [],
      })) as SaleRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Mutation for upserting sales data
  const upsertSalesMutation = useMutation({
    mutationFn: async (salesData: SaleRow[]) => {
      // Transform date back to string for Supabase
      const transformed = salesData.map((row) => ({
        coupon: row.coupon,
        date_sale: row.date_sale.toISOString().split("T")[0],
        order_id: row.order_id,
        order_value: row.order_value,
        payment_value: row.payment_value,
        products: row.products,
        imported_at: new Date().toISOString(),
      }));

      // Upsert with conflict resolution on (order_id, coupon)
      const { error } = await (supabase.from("influencer_sales") as any)
        .upsert(transformed, {
          onConflict: "order_id,coupon",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencer_sales"] });
    },
  });

  // Mutation for deleting all sales data
  const deleteAllSalesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from("influencer_sales") as any)
        .delete()
        .neq("coupon", ""); // Delete all rows
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencer_sales"] });
    },
  });

  const [search, setSearch] = useState("");
  type SortField = keyof InfluencerStats | "bonificado" | "roi";
  const [sortField, setSortField] = useState<SortField>("gmv");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedCoupon, setExpandedCoupon] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target?.result as string);
      upsertSalesMutation.mutate(parsed);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  // Filtra pelo dateRange global
  const filteredRows = useMemo(() => {
    if (!dateRange) return rows;
    return rows.filter(
      (row) => row.date_sale >= dateRange.start && row.date_sale <= dateRange.end
    );
  }, [rows, dateRange]);

  const stats = useMemo(() => buildStats(filteredRows), [filteredRows]);

  const totalGMV = useMemo(() => stats.reduce((s, r) => s + r.gmv, 0), [stats]);
  const totalCommission = useMemo(() => stats.reduce((s, r) => s + r.commission, 0), [stats]);
  const totalOrders = useMemo(() => stats.reduce((s, r) => s + r.total_orders, 0), [stats]);
  const totalBonificado = useMemo(
    () => bonifFiltered.reduce((s, r) => s + (r.valor_total || 0), 0),
    [bonifFiltered]
  );

  // Coupon com melhor ROI (para badge 🏆)
  const topRoiCoupon = useMemo(() => {
    let best: string | null = null;
    let bestRoi = 0;
    for (const s of stats) {
      const bonifs = bonifByCoupon.get(s.coupon) ?? [];
      const totalB = bonifs.reduce((acc, r) => acc + (r.valor_total || 0), 0);
      if (totalB > 0) {
        const roi = s.gmv / totalB;
        if (roi > bestRoi) { bestRoi = roi; best = s.coupon; }
      }
    }
    return best;
  }, [stats, bonifByCoupon]);

  const displayed = useMemo(() => {
    let list = [...stats];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => {
        if (s.coupon.toLowerCase().includes(q)) return true;
        const inf = influencerByCoupon.get(s.coupon);
        if (inf && (inf.name.toLowerCase().includes(q) || inf.instagram.toLowerCase().includes(q))) return true;
        return false;
      });
    }
    const getBonif = (coupon: string) =>
      (bonifByCoupon.get(coupon) ?? []).reduce((s, r) => s + (r.valor_total || 0), 0);
    const getRoi = (coupon: string, gmv: number) => {
      const b = getBonif(coupon);
      return b > 0 ? gmv / b : -1; // -1 = sem bonificação (fica por último)
    };

    list.sort((a, b) => {
      let an: number, bn: number;

      if (sortField === "bonificado") {
        an = getBonif(a.coupon);
        bn = getBonif(b.coupon);
      } else if (sortField === "roi") {
        an = getRoi(a.coupon, a.gmv);
        bn = getRoi(b.coupon, b.gmv);
      } else {
        const av = a[sortField];
        const bv = b[sortField];
        if (av instanceof Date && bv instanceof Date)
          return sortAsc ? av.getTime() - bv.getTime() : bv.getTime() - av.getTime();
        if (typeof av === "number" && typeof bv === "number")
          return sortAsc ? av - bv : bv - av;
        return 0;
      }
      return sortAsc ? an - bn : bn - an;
    });
    return list;
  }, [stats, search, sortField, sortAsc, bonifByCoupon]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field
      ? sortAsc
        ? <ChevronUp className="h-3 w-3" />
        : <ChevronDown className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3 opacity-30" />;

  const clearData = () => {
    if (!confirm("Limpar todos os dados carregados?")) return;
    deleteAllSalesMutation.mutate();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Performance de Influenciadoras</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vendas por coupon
            {dateRange && (
              <span className="ml-1 text-xs text-blue-600">
                · filtrando {format(dateRange.start, "dd/MM/yy")} –{" "}
                {format(dateRange.end, "dd/MM/yy")}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {rows.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearData}>
              <X className="h-4 w-4 mr-1" /> Limpar CSV
            </Button>
          )}
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Importar CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>
      </div>

      {/* Aviso filtro global ativo */}
      {dateRange && rows.length > 0 && filteredRows.length < rows.length && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Exibindo <strong>{filteredRows.length}</strong> de{" "}
            <strong>{rows.length}</strong> linhas do CSV conforme o filtro de período do dashboard.
          </span>
        </div>
      )}

      {/* Aviso: sem registro de influenciadoras */}
      {rows.length > 0 && influencers.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Importe o cadastro de influenciadoras na página <strong>Cadastro</strong> e
            vincule os coupons para ver nomes e bonificações por influenciadora.
          </span>
        </div>
      )}

      {/* Diagnóstico: NFs de bonificação não casadas */}
      {bonifUnmatched.length > 0 && influencers.length > 0 && (
        <details className="border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-sm">
          <summary className="flex items-center gap-2 cursor-pointer text-amber-800 font-medium select-none">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {bonifUnmatched.length} NF(s) de bonificação sem influenciadora associada — clique para ver
          </summary>
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-amber-700 mb-2">
              Estas NFs não casaram por e-mail, CPF/CNPJ nem nome. Verifique se a influenciadora
              está cadastrada com o coupon vinculado e se o CPF/CNPJ ou e-mail da NF corresponde ao cadastro.
            </p>
            {bonifUnmatched.map((b) => (
              <div key={b.id} className="bg-white border border-amber-100 rounded px-2.5 py-1.5 text-xs flex flex-wrap gap-x-4 gap-y-0.5">
                <span className="font-medium">{b.data_venda ? format(new Date(b.data_venda), "dd/MM/yyyy") : "—"}</span>
                <span className="text-rose-700 font-semibold">
                  {(b.valor_total ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
                {b.cliente_nome && <span className="text-muted-foreground">👤 {b.cliente_nome}</span>}
                {b.cliente_email?.includes("@") && <span className="text-muted-foreground">✉ {b.cliente_email}</span>}
                {b.cpf_cnpj && <span className="text-muted-foreground font-mono">CPF/CNPJ: {b.cpf_cnpj}</span>}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed rounded-xl">
          <Upload className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-muted-foreground">Nenhum dado de vendas carregado</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Importe a planilha de vendas por coupon (formato padrão)
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
                  {totalGMV > 0
                    ? `${((totalCommission / totalGMV) * 100).toFixed(1)}% do GMV`
                    : "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" /> Total Bonificado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(totalBonificado)}</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {loadingBonif
                    ? "carregando..."
                    : `${bonifFiltered.length} NF(s) de bonificação`}
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
                  {stats.length} coupons · ticket médio{" "}
                  {totalOrders > 0 ? fmt(totalGMV / totalOrders) : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Busca */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                className="pl-8 w-56"
                placeholder="Buscar coupon ou nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Clique em uma linha para ver detalhes de produtos e bonificações
            </p>
          </div>

          {/* Tabela */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Influenciadora</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("total_orders")}
                      >
                        <div className="flex items-center gap-1">
                          Pedidos <SortIcon field="total_orders" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("gmv")}
                      >
                        <div className="flex items-center gap-1">
                          GMV <SortIcon field="gmv" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("commission")}
                      >
                        <div className="flex items-center gap-1">
                          Comissão <SortIcon field="commission" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("avg_ticket")}
                      >
                        <div className="flex items-center gap-1">
                          Ticket Médio <SortIcon field="avg_ticket" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("bonificado")}
                      >
                        <div className="flex items-center gap-1">
                          Bonificado <SortIcon field="bonificado" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("roi")}
                      >
                        <div className="flex items-center gap-1">
                          ROI <SortIcon field="roi" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("last_sale")}
                      >
                        <div className="flex items-center gap-1">
                          Última Venda <SortIcon field="last_sale" />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {displayed.map((s, i) => {
                      const inf = influencerByCoupon.get(s.coupon);
                      const bonifs = bonifByCoupon.get(s.coupon) ?? [];
                      const totalBonifInflu = bonifs.reduce(
                        (acc, r) => acc + (r.valor_total || 0),
                        0
                      );
                      const roi =
                        totalBonifInflu > 0 ? s.gmv / totalBonifInflu : null;

                      return (
                        <Fragment key={s.coupon}>
                          <TableRow
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() =>
                              setExpandedCoupon(
                                expandedCoupon === s.coupon ? null : s.coupon
                              )
                            }
                          >
                            <TableCell className="text-muted-foreground text-xs">
                              {i + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div>
                                  {inf ? (
                                    <>
                                      <div className="font-semibold">{inf.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {inf.instagram || s.coupon}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold font-mono">
                                        {s.coupon}
                                      </span>
                                      {s.coupon === topRoiCoupon && (
                                        <Badge className="text-[10px] px-1.5 py-0">
                                          🏆 Top ROI
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  {inf && s.coupon === topRoiCoupon && (
                                    <Badge className="text-[10px] px-1.5 py-0 mt-0.5">
                                      🏆 Top ROI
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{s.total_orders}</TableCell>
                            <TableCell className="font-medium">{fmt(s.gmv)}</TableCell>
                            <TableCell className="text-amber-700">
                              {fmt(s.commission)}
                            </TableCell>
                            <TableCell>{fmt(s.avg_ticket)}</TableCell>
                            <TableCell>
                              {bonifs.length > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm font-medium text-rose-700">
                                    {fmt(totalBonifInflu)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {bonifs.length} NF(s)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {roi !== null ? (
                                <Badge
                                  variant={
                                    roi >= 3
                                      ? "default"
                                      : roi >= 1
                                      ? "secondary"
                                      : "destructive"
                                  }
                                  className="text-xs font-mono"
                                >
                                  {roi.toFixed(1)}x
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {fmtDate(s.last_sale)}
                            </TableCell>
                          </TableRow>

                          {/* Linha expandida */}
                          {expandedCoupon === s.coupon && (
                            <TableRow className="bg-muted/20 hover:bg-muted/20">
                              <TableCell colSpan={9} className="py-4 px-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                  {/* Produtos vendidos */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                      Produtos vendidos
                                      <span className="normal-case ml-1 font-normal">
                                        ({s.total_orders} pedidos ·{" "}
                                        {fmtDate(s.first_sale)} → {fmtDate(s.last_sale)})
                                      </span>
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(s.products)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([product, qty]) => (
                                          <div
                                            key={product}
                                            className="bg-white border rounded-md px-2.5 py-1 text-xs flex items-center gap-1.5"
                                          >
                                            <span>{product}</span>
                                            <Badge
                                              variant="secondary"
                                              className="text-[10px] px-1 py-0"
                                            >
                                              {qty}x
                                            </Badge>
                                          </div>
                                        ))}
                                    </div>
                                  </div>

                                  {/* Bonificações */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                      Bonificações enviadas
                                    </p>
                                    {bonifs.length === 0 ? (
                                      <div className="text-xs text-muted-foreground">
                                        {inf ? (
                                          <span>
                                            Nenhuma NF de bonificação encontrada para{" "}
                                            <strong>{inf.name}</strong>. Verifique se o
                                            e-mail da influenciadora no cadastro corresponde
                                            ao destinatário nas NFs fiscais.
                                          </span>
                                        ) : (
                                          <span>
                                            Vincule esta influenciadora no{" "}
                                            <strong>Cadastro</strong> para ver as
                                            bonificações.
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {bonifs.map((b) => (
                                          <div
                                            key={b.id}
                                            className="bg-white border rounded-md p-2.5 text-xs space-y-1"
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium">
                                                {format(
                                                  new Date(b.data_venda),
                                                  "dd/MM/yyyy"
                                                )}
                                              </span>
                                              <span className="font-semibold text-rose-700">
                                                {fmt(b.valor_total)}
                                              </span>
                                            </div>
                                            {b.cliente_nome && (
                                              <div className="flex items-center gap-1 text-muted-foreground">
                                                <User className="h-3 w-3" />
                                                {b.cliente_nome}
                                              </div>
                                            )}
                                            {b.produtos && b.produtos.length > 0 && (
                                              <div className="flex flex-wrap gap-1">
                                                {b.produtos.map((p: any, idx: number) => {
                                                  const label = typeof p === "string"
                                                    ? p
                                                    : (p?.descricaoAjustada || p?.descricao || p?.sku || "");
                                                  if (!label) return null;
                                                  return (
                                                    <span
                                                      key={idx}
                                                      className="bg-gray-50 border rounded px-1.5 py-0.5 text-[10px]"
                                                    >
                                                      {label}{p?.quantidade > 1 ? ` (${p.quantidade}x)` : ""}
                                                    </span>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        ))}

                                        <div className="flex items-center justify-between pt-1 border-t text-xs">
                                          <span className="text-muted-foreground">
                                            Total bonificado
                                          </span>
                                          <span className="font-semibold text-rose-700">
                                            {fmt(totalBonifInflu)}
                                          </span>
                                        </div>
                                        {roi !== null && (
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">
                                              ROI (GMV ÷ bonificado)
                                            </span>
                                            <Badge
                                              variant={
                                                roi >= 3
                                                  ? "default"
                                                  : roi >= 1
                                                  ? "secondary"
                                                  : "destructive"
                                              }
                                              className="font-mono"
                                            >
                                              {roi.toFixed(2)}x
                                            </Badge>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}

                    {displayed.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center py-8 text-muted-foreground"
                        >
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
