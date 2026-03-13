import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, eachDayOfInterval } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import {
  Monitor, Smartphone, Users, ShoppingCart, TrendingUp,
  ArrowRight, AlertTriangle, Lightbulb, Eye, Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────
interface SessionRow {
  date: string;
  source_medium: string;
  sessions: number;
  users: number;
  new_users: number;
  transactions: number;
  purchase_revenue: number;
  add_to_carts: number;
  checkouts: number;
}

interface ProductRow {
  date: string;
  item_name: string;
  items_viewed: number;
  items_added_to_cart: number;
  items_purchased: number;
  item_revenue: number;
}

interface BehaviorRow {
  date: string;
  dimension_type: string;
  dimension_value: string;
  sessions: number;
  users: number;
  new_users: number;
  bounce_rate: number;
  avg_session_duration: number;
  transactions: number;
}

// ─── Formatters ──────────────────────────────────────────────────────────
const fmtN = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));

const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const fmtR = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtMin = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
};

// ─── KPI Card ─────────────────────────────────────────────────────────────
function KPICard({
  label, value, sub, icon, highlight,
}: {
  label: string; value: string; sub?: string; icon: React.ReactNode; highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/50 bg-primary/5" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Funnel Bar ───────────────────────────────────────────────────────────
function FunnelRow({
  label, value, total, pct, drop, warn,
}: {
  label: string; value: number; total: number; pct: number; drop?: number; warn?: boolean;
}) {
  const width = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-3">
          {drop !== undefined && (
            <span className={`text-xs ${warn ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
              {warn && <AlertTriangle className="inline h-3 w-3 mr-0.5" />}
              -{fmtPct(drop)} saem aqui
            </span>
          )}
          <span className="font-bold w-14 text-right">{fmtN(value)}</span>
          <span className="text-muted-foreground w-12 text-right text-xs">{fmtPct(pct)}</span>
        </div>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all ${warn ? "bg-red-400" : "bg-primary"}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function SiteConversao() {
  const { dateRange } = useDashboard();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [behavior, setBehavior] = useState<BehaviorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const startStr = dateRange ? format(dateRange.start, "yyyy-MM-dd") : format(subDays(new Date(), 30), "yyyy-MM-dd");
  const endStr = dateRange ? format(dateRange.end, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      supabase
        .from("ga4_sessions")
        .select("*")
        .gte("date", startStr)
        .lte("date", endStr),
      supabase
        .from("ga4_products")
        .select("*")
        .gte("date", startStr)
        .lte("date", endStr),
      supabase
        .from("ga4_behavior")
        .select("*")
        .gte("date", startStr)
        .lte("date", endStr),
    ]).then(([s, p, b]) => {
      if (cancelled) return;
      setSessions((s.data as SessionRow[]) ?? []);
      setProducts((p.data as ProductRow[]) ?? []);
      setBehavior((b.data as BehaviorRow[]) ?? []);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [startStr, endStr]);

  // ─── Aggregations ────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const totalSessions = sessions.reduce((s, r) => s + r.sessions, 0);
    const totalUsers = sessions.reduce((s, r) => s + r.users, 0);
    const totalNew = sessions.reduce((s, r) => s + r.new_users, 0);
    const totalCarts = sessions.reduce((s, r) => s + r.add_to_carts, 0);
    const totalCheckouts = sessions.reduce((s, r) => s + r.checkouts, 0);
    const totalTx = sessions.reduce((s, r) => s + r.transactions, 0);
    const totalRev = sessions.reduce((s, r) => s + r.purchase_revenue, 0);
    const totalViewed = products.reduce((s, r) => s + r.items_viewed, 0);
    const convRate = totalSessions > 0 ? (totalTx / totalSessions) * 100 : 0;
    const returningPct = totalUsers > 0 ? ((totalUsers - totalNew) / totalUsers) * 100 : 0;
    return { totalSessions, totalUsers, totalNew, totalCarts, totalCheckouts, totalTx, totalRev, totalViewed, convRate, returningPct };
  }, [sessions, products]);

  // Funil drops
  const funnelDrop = useMemo(() => {
    const { totalViewed, totalCarts, totalCheckouts, totalTx, totalSessions } = totals;
    const steps = [
      { from: totalSessions, to: totalViewed, label: "sessão→produto" },
      { from: totalViewed, to: totalCarts, label: "produto→carrinho" },
      { from: totalCarts, to: totalCheckouts, label: "carrinho→checkout" },
      { from: totalCheckouts, to: totalTx, label: "checkout→compra" },
    ];
    return steps.map((s) => ({
      ...s,
      drop: s.from > 0 ? ((s.from - s.to) / s.from) * 100 : 0,
    }));
  }, [totals]);

  const biggestDrop = useMemo(() =>
    [...funnelDrop].sort((a, b) => b.drop - a.drop)[0],
    [funnelDrop]
  );

  // Original product
  const original = useMemo(() => {
    const rows = products.filter(
      (p) =>
        p.item_name.toLowerCase().includes("original") ||
        p.item_name.toLowerCase().includes("dragã") ||
        p.item_name.toLowerCase().includes("draga")
    );
    return {
      viewed: rows.reduce((s, r) => s + r.items_viewed, 0),
      cart: rows.reduce((s, r) => s + r.items_added_to_cart, 0),
      purchased: rows.reduce((s, r) => s + r.items_purchased, 0),
      revenue: rows.reduce((s, r) => s + r.item_revenue, 0),
    };
  }, [products]);

  const remarketing = Math.max(0, original.viewed - original.purchased);

  // All products aggregated
  const allProducts = useMemo(() => {
    const map = new Map<string, { viewed: number; cart: number; purchased: number; revenue: number }>();
    products.forEach((r) => {
      const cur = map.get(r.item_name) ?? { viewed: 0, cart: 0, purchased: 0, revenue: 0 };
      cur.viewed += r.items_viewed;
      cur.cart += r.items_added_to_cart;
      cur.purchased += r.items_purchased;
      cur.revenue += r.item_revenue;
      map.set(r.item_name, cur);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({
        name,
        ...d,
        convPct: d.viewed > 0 ? (d.purchased / d.viewed) * 100 : 0,
      }))
      .sort((a, b) => b.purchased - a.purchased)
      .slice(0, 10);
  }, [products]);

  // Source/medium table
  const sources = useMemo(() => {
    const map = new Map<string, { sessions: number; tx: number; rev: number }>();
    sessions.forEach((r) => {
      const cur = map.get(r.source_medium) ?? { sessions: 0, tx: 0, rev: 0 };
      cur.sessions += r.sessions;
      cur.tx += r.transactions;
      cur.rev += r.purchase_revenue;
      map.set(r.source_medium, cur);
    });
    return Array.from(map.entries())
      .map(([sm, d]) => ({
        sm,
        ...d,
        conv: d.sessions > 0 ? (d.tx / d.sessions) * 100 : 0,
        revPerSession: d.sessions > 0 ? d.rev / d.sessions : 0,
      }))
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 8);
  }, [sessions]);

  const bestSource = sources.sort((a, b) => b.revPerSession - a.revPerSession)[0];

  // Device split
  const devices = useMemo(() => {
    const map = new Map<string, { sessions: number; tx: number; bounce: number; dur: number; count: number }>();
    behavior.filter((b) => b.dimension_type === "device").forEach((r) => {
      const cur = map.get(r.dimension_value) ?? { sessions: 0, tx: 0, bounce: 0, dur: 0, count: 0 };
      cur.sessions += r.sessions;
      cur.tx += r.transactions;
      cur.bounce += r.bounce_rate;
      cur.dur += r.avg_session_duration;
      cur.count += 1;
      map.set(r.dimension_value, cur);
    });
    const total = Array.from(map.values()).reduce((s, d) => s + d.sessions, 0) || 1;
    return Array.from(map.entries())
      .map(([dev, d]) => ({
        dev,
        sessions: d.sessions,
        pct: (d.sessions / total) * 100,
        tx: d.tx,
        bounce: d.count > 0 ? d.bounce / d.count : 0,
        dur: d.count > 0 ? d.dur / d.count : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [behavior]);

  // Top pages
  const topPages = useMemo(() => {
    const map = new Map<string, { sessions: number; tx: number }>();
    behavior.filter((b) => b.dimension_type === "landing_page").forEach((r) => {
      const cur = map.get(r.dimension_value) ?? { sessions: 0, tx: 0 };
      cur.sessions += r.sessions;
      cur.tx += r.transactions;
      map.set(r.dimension_value, cur);
    });
    return Array.from(map.entries())
      .map(([page, d]) => ({ page, ...d }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);
  }, [behavior]);

  // Top cities
  const topCities = useMemo(() => {
    const map = new Map<string, { sessions: number; tx: number }>();
    behavior.filter((b) => b.dimension_type === "city").forEach((r) => {
      const cur = map.get(r.dimension_value) ?? { sessions: 0, tx: 0 };
      cur.sessions += r.sessions;
      cur.tx += r.transactions;
      map.set(r.dimension_value, cur);
    });
    return Array.from(map.entries())
      .map(([city, d]) => ({ city, ...d }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);
  }, [behavior]);

  // Trend chart — sessões e compras por dia
  const trendData = useMemo(() => {
    if (!dateRange) return [];
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    const map = new Map<string, { sessions: number; tx: number; rev: number }>();
    sessions.forEach((r) => {
      const cur = map.get(r.date) ?? { sessions: 0, tx: 0, rev: 0 };
      cur.sessions += r.sessions;
      cur.tx += r.transactions;
      cur.rev += r.purchase_revenue;
      map.set(r.date, cur);
    });
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const row = map.get(key) ?? { sessions: 0, tx: 0, rev: 0 };
      return { day: format(d, "dd/MM"), ...row };
    });
  }, [sessions, dateRange]);

  const [trendMetric, setTrendMetric] = useState<"sessions" | "tx" | "rev">("sessions");

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-6 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const noData = sessions.length === 0 && products.length === 0;

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">📈 Site e Conversão</h1>
        <p className="text-muted-foreground">Comportamento do site e performance de conversão — Google Analytics 4</p>
        {noData && (
          <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Nenhum dado GA4 encontrado para o período. Execute o sync inicial: <code className="bg-amber-100 px-1 rounded">mode: full</code></span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KPICard label="Sessões" value={fmtN(totals.totalSessions)} icon={<Eye className="h-4 w-4" />} />
        <KPICard label="Usuários" value={fmtN(totals.totalUsers)} sub={`${fmtPct(totals.returningPct)} retornam`} icon={<Users className="h-4 w-4" />} />
        <KPICard label="Novos usuários" value={fmtPct(totals.totalSessions > 0 ? (totals.totalNew / totals.totalSessions) * 100 : 0)} icon={<Users className="h-4 w-4" />} />
        <KPICard label="Adições ao carrinho" value={fmtN(totals.totalCarts)} icon={<ShoppingCart className="h-4 w-4" />} />
        <KPICard label="Compras" value={fmtN(totals.totalTx)} icon={<Target className="h-4 w-4" />} highlight />
        <KPICard label="Conversão" value={fmtPct(totals.convRate)} sub="sessão → compra" icon={<TrendingUp className="h-4 w-4" />} highlight />
      </div>

      {/* Funil */}
      <Card>
        <CardHeader>
          <CardTitle>Funil de conversão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {biggestDrop && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <strong>Maior perda:</strong> etapa <strong>{biggestDrop.label}</strong> — {fmtPct(biggestDrop.drop)} dos visitantes saem aqui. É onde o funil mais vaza.
              </span>
            </div>
          )}
          <FunnelRow label="Sessões" value={totals.totalSessions} total={totals.totalSessions} pct={100} />
          <FunnelRow
            label="Visualizaram produto"
            value={totals.totalViewed}
            total={totals.totalSessions}
            pct={totals.totalSessions > 0 ? (totals.totalViewed / totals.totalSessions) * 100 : 0}
            drop={funnelDrop[0]?.drop}
            warn={funnelDrop[0]?.drop > 70}
          />
          <FunnelRow
            label="Adicionaram ao carrinho"
            value={totals.totalCarts}
            total={totals.totalSessions}
            pct={totals.totalSessions > 0 ? (totals.totalCarts / totals.totalSessions) * 100 : 0}
            drop={funnelDrop[1]?.drop}
            warn={funnelDrop[1]?.drop > 70}
          />
          <FunnelRow
            label="Iniciaram checkout"
            value={totals.totalCheckouts}
            total={totals.totalSessions}
            pct={totals.totalSessions > 0 ? (totals.totalCheckouts / totals.totalSessions) * 100 : 0}
            drop={funnelDrop[2]?.drop}
            warn={funnelDrop[2]?.drop > 40}
          />
          <FunnelRow
            label="Compraram"
            value={totals.totalTx}
            total={totals.totalSessions}
            pct={totals.convRate}
            drop={funnelDrop[3]?.drop}
            warn={funnelDrop[3]?.drop > 30}
          />
        </CardContent>
      </Card>

      {/* Produto Original + All Products */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Original */}
        <Card>
          <CardHeader>
            <CardTitle>Produto Original</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Visualizações", value: fmtN(original.viewed) },
                { label: "Carrinho", value: `${fmtN(original.cart)} (${fmtPct(original.viewed > 0 ? (original.cart / original.viewed) * 100 : 0)})` },
                { label: "Compras", value: fmtN(original.purchased) },
                { label: "Receita", value: fmtR(original.revenue) },
              ].map((k) => (
                <div key={k.label} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-lg font-bold">{k.value}</p>
                </div>
              ))}
            </div>
            {/* Remarketing */}
            <div className="border border-dashed border-primary/40 rounded-lg p-3 bg-primary/5">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-1">
                <Target className="h-4 w-4" />
                Base de remarketing
              </div>
              <p className="text-2xl font-bold">{fmtN(remarketing)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Pessoas que viram o Original e não compraram no período — público quente para campanha de remarketing no Meta Ads.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Todos os produtos */}
        <Card>
          <CardHeader>
            <CardTitle>Todos os produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-xs">
                  <th className="text-left py-1 pr-2">Produto</th>
                  <th className="text-right py-1 pr-2">Viu</th>
                  <th className="text-right py-1 pr-2">Carrinho</th>
                  <th className="text-right py-1 pr-2">Comprou</th>
                  <th className="text-right py-1">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {allProducts.map((p) => (
                  <tr key={p.name} className="border-b border-muted/50">
                    <td className="py-1.5 pr-2 max-w-[140px] truncate font-medium">{p.name}</td>
                    <td className="py-1.5 pr-2 text-right">{fmtN(p.viewed)}</td>
                    <td className="py-1.5 pr-2 text-right">{fmtN(p.cart)}</td>
                    <td className="py-1.5 pr-2 text-right font-semibold">{fmtN(p.purchased)}</td>
                    <td className="py-1.5 text-right">
                      <Badge variant="outline" className="text-xs">
                        {fmtPct(p.convPct)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Aquisição por fonte */}
      <Card>
        <CardHeader>
          <CardTitle>Aquisição por fonte</CardTitle>
        </CardHeader>
        <CardContent>
          {bestSource && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800 mb-4">
              <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <strong>{bestSource.sm}</strong> tem a maior receita por sessão ({fmtR(bestSource.revPerSession)}) — canal mais eficiente do período.
              </span>
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-xs">
                <th className="text-left py-1 pr-3">Fonte / Médio</th>
                <th className="text-right py-1 pr-3">Sessões</th>
                <th className="text-right py-1 pr-3">Compras</th>
                <th className="text-right py-1 pr-3">Receita</th>
                <th className="text-right py-1 pr-3">Conversão</th>
                <th className="text-right py-1">R$/sessão</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.sm} className="border-b border-muted/50">
                  <td className="py-1.5 pr-3 font-medium">{s.sm}</td>
                  <td className="py-1.5 pr-3 text-right">{fmtN(s.sessions)}</td>
                  <td className="py-1.5 pr-3 text-right">{fmtN(s.tx)}</td>
                  <td className="py-1.5 pr-3 text-right">{fmtR(s.rev)}</td>
                  <td className="py-1.5 pr-3 text-right">
                    <Badge variant="outline" className="text-xs">{fmtPct(s.conv)}</Badge>
                  </td>
                  <td className="py-1.5 text-right font-semibold">{fmtR(s.revPerSession)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Novos vs Recorrentes + Comportamento */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Novos vs Recorrentes */}
        <Card>
          <CardHeader>
            <CardTitle>Novos vs. recorrentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/40 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Novos</p>
                <p className="text-3xl font-bold text-primary">
                  {fmtPct(totals.totalUsers > 0 ? (totals.totalNew / totals.totalUsers) * 100 : 0)}
                </p>
                <p className="text-xs text-muted-foreground">{fmtN(totals.totalNew)} usuários</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Recorrentes</p>
                <p className="text-3xl font-bold">
                  {fmtPct(totals.returningPct)}
                </p>
                <p className="text-xs text-muted-foreground">{fmtN(totals.totalUsers - totals.totalNew)} usuários</p>
              </div>
            </div>
            {/* Dispositivos */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Dispositivo</p>
              <div className="space-y-2">
                {devices.map((d) => (
                  <div key={d.dev} className="flex items-center gap-2">
                    {d.dev === "mobile" ? <Smartphone className="h-4 w-4 text-muted-foreground" /> : <Monitor className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm w-20 capitalize">{d.dev}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${d.pct}%` }} />
                    </div>
                    <span className="text-xs font-medium w-10 text-right">{fmtPct(d.pct)}</span>
                    <span className="text-xs text-muted-foreground w-16 text-right">{fmtMin(d.dur)} média</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comportamento */}
        <Card>
          <CardHeader>
            <CardTitle>Comportamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Top páginas */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Top páginas de entrada</p>
              <div className="space-y-1">
                {topPages.map((p) => (
                  <div key={p.page} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs truncate max-w-[200px] text-muted-foreground">{p.page}</span>
                    <div className="flex gap-3">
                      <span>{fmtN(p.sessions)} sess.</span>
                      <span className="text-primary font-medium">{fmtN(p.tx)} compras</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Top cidades */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Top cidades</p>
              <div className="space-y-1">
                {topCities.map((c) => (
                  <div key={c.city} className="flex items-center justify-between text-sm">
                    <span>{c.city}</span>
                    <span>{fmtN(c.sessions)} sessões</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tendência diária */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tendência diária</CardTitle>
          <div className="flex gap-1">
            {(["sessions", "tx", "rev"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setTrendMetric(m)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  trendMetric === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {m === "sessions" ? "Sessões" : m === "tx" ? "Compras" : "Receita"}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={40} />
              <Tooltip
                formatter={(v: number) =>
                  trendMetric === "rev" ? fmtR(v) : fmtN(v)
                }
              />
              <Area
                type="monotone"
                dataKey={trendMetric}
                stroke="hsl(var(--primary))"
                fill="url(#grad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
