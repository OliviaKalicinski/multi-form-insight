import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Monitor,
  Smartphone,
  Users,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Eye,
  Target,
  MapPin,
  Globe,
  ArrowDown,
  MousePointerClick,
  CreditCard,
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
const fmtN = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)));
const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const fmtR = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtMin = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
};

// ─── KPI Card ─────────────────────────────────────────────────────────────
function KPICard({
  label,
  value,
  sub,
  icon,
  color = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color?: "default" | "primary" | "green" | "amber" | "red";
}) {
  const colors = {
    default: "border-border",
    primary: "border-primary/40 bg-primary/5",
    green: "border-green-300 bg-green-50",
    amber: "border-amber-300 bg-amber-50",
    red: "border-red-300 bg-red-50",
  };
  const textColors = {
    default: "",
    primary: "text-primary",
    green: "text-green-700",
    amber: "text-amber-700",
    red: "text-red-700",
  };
  return (
    <Card className={`border-2 ${colors[color]}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
        <span className={`${color !== "default" ? textColors[color] : "text-muted-foreground"}`}>{icon}</span>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={`text-2xl font-bold ${textColors[color]}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Insight Box ─────────────────────────────────────────────────────────
function InsightBox({ type, children }: { type: "warn" | "info" | "good"; children: React.ReactNode }) {
  const styles = {
    warn: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    good: "bg-green-50 border-green-200 text-green-800",
  };
  const icons = {
    warn: <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />,
    info: <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />,
    good: <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />,
  };
  return (
    <div className={`flex items-start gap-2 border rounded-lg px-3 py-2.5 text-sm ${styles[type]}`}>
      {icons[type]}
      <span>{children}</span>
    </div>
  );
}

// ─── Funil Row ────────────────────────────────────────────────────────────
function FunnelStep({
  step,
  label,
  sublabel,
  value,
  pct,
  dropPct,
  isWorst,
}: {
  step: number;
  label: string;
  sublabel: string;
  value: number;
  pct: number;
  dropPct?: number;
  isWorst?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
            ${isWorst ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`}
          >
            {step}
          </span>
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground">{sublabel}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">{fmtN(value)}</p>
          <p className="text-xs text-muted-foreground">{fmtPct(pct)} do total</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all ${isWorst ? "bg-red-400" : "bg-primary"}`}
            style={{ width: `${Math.max(pct, 0.5)}%` }}
          />
        </div>
        {dropPct !== undefined && (
          <div
            className={`flex items-center gap-0.5 text-xs font-medium w-24 justify-end
            ${isWorst ? "text-red-600" : "text-muted-foreground"}`}
          >
            <ArrowDown className="h-3 w-3" />
            <span>{fmtPct(dropPct)} saem aqui</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────
export default function SiteConversao() {
  const { dateRange } = useDashboard();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [behavior, setBehavior] = useState<BehaviorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendMetric, setTrendMetric] = useState<"sessions" | "tx" | "rev">("sessions");

  const startStr = dateRange ? format(dateRange.start, "yyyy-MM-dd") : format(subDays(new Date(), 30), "yyyy-MM-dd");
  const endStr = dateRange ? format(dateRange.end, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase.from("ga4_sessions").select("*").gte("date", startStr).lte("date", endStr),
      supabase.from("ga4_products").select("*").gte("date", startStr).lte("date", endStr),
      supabase.from("ga4_behavior").select("*").gte("date", startStr).lte("date", endStr),
    ]).then(([s, p, b]) => {
      if (cancelled) return;
      setSessions((s.data as SessionRow[]) ?? []);
      setProducts((p.data as ProductRow[]) ?? []);
      setBehavior((b.data as BehaviorRow[]) ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [startStr, endStr]);

  // ─── Totals ──────────────────────────────────────────────────────────
  const t = useMemo(() => {
    const s = sessions.reduce(
      (acc, r) => ({
        sessions: acc.sessions + r.sessions,
        users: acc.users + r.users,
        newUsers: acc.newUsers + r.new_users,
        carts: acc.carts + r.add_to_carts,
        checkouts: acc.checkouts + r.checkouts,
        tx: acc.tx + r.transactions,
        rev: acc.rev + r.purchase_revenue,
      }),
      { sessions: 0, users: 0, newUsers: 0, carts: 0, checkouts: 0, tx: 0, rev: 0 },
    );
    const viewed = products.reduce((acc, r) => acc + r.items_viewed, 0);
    const convRate = s.sessions > 0 ? (s.tx / s.sessions) * 100 : 0;
    const returningPct = s.users > 0 ? ((s.users - s.newUsers) / s.users) * 100 : 0;
    const newPct = s.users > 0 ? (s.newUsers / s.users) * 100 : 0;
    return { ...s, viewed, convRate, returningPct, newPct };
  }, [sessions, products]);

  // Funil drops
  const funnelSteps = useMemo(() => {
    const base = t.sessions || 1;
    const steps = [
      { label: "Sessões no site", sublabel: "Visitantes que chegaram", value: t.sessions, pct: 100 },
      {
        label: "Viram um produto",
        sublabel: "Abriram a página de algum produto",
        value: t.viewed,
        pct: (t.viewed / base) * 100,
      },
      {
        label: "Adicionaram ao carrinho",
        sublabel: "Clicaram em 'Comprar'",
        value: t.carts,
        pct: (t.carts / base) * 100,
      },
      {
        label: "Iniciaram o checkout",
        sublabel: "Foram para o pagamento",
        value: t.checkouts,
        pct: (t.checkouts / base) * 100,
      },
      { label: "Compraram", sublabel: "Finalizaram o pedido", value: t.tx, pct: (t.tx / base) * 100 },
    ];
    const withDrop = steps.map((s, i) => {
      if (i === 0) return { ...s, dropPct: undefined };
      const prev = steps[i - 1].value || 1;
      return { ...s, dropPct: ((prev - s.value) / prev) * 100 };
    });
    const maxDropIdx =
      withDrop.slice(1).reduce((maxI, s, i) => (s.dropPct! > withDrop.slice(1)[maxI].dropPct! ? i : maxI), 0) + 1;
    return withDrop.map((s, i) => ({ ...s, isWorst: i === maxDropIdx }));
  }, [t]);

  const worstStep = funnelSteps.find((s) => s.isWorst);

  // Original
  const original = useMemo(() => {
    const rows = products.filter(
      (p) =>
        p.item_name.toLowerCase().includes("original") ||
        p.item_name.toLowerCase().includes("dragã") ||
        p.item_name.toLowerCase().includes("draga"),
    );
    return {
      viewed: rows.reduce((s, r) => s + r.items_viewed, 0),
      cart: rows.reduce((s, r) => s + r.items_added_to_cart, 0),
      purchased: rows.reduce((s, r) => s + r.items_purchased, 0),
      revenue: rows.reduce((s, r) => s + r.item_revenue, 0),
    };
  }, [products]);
  const remarketing = Math.max(0, original.viewed - original.purchased);

  // All products
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
      .map(([name, d]) => ({ name, ...d, convPct: d.viewed > 0 ? (d.purchased / d.viewed) * 100 : 0 }))
      .sort((a, b) => b.purchased - a.purchased)
      .slice(0, 10);
  }, [products]);

  // Sources
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
  const bestSource = [...sources].sort((a, b) => b.revPerSession - a.revPerSession)[0];
  const whatsappSource = sources.find((s) => s.sm.toLowerCase().includes("whatsapp"));

  // Devices
  const devices = useMemo(() => {
    const map = new Map<string, { sessions: number; tx: number; bounce: number; dur: number; count: number }>();
    behavior
      .filter((b) => b.dimension_type === "device")
      .forEach((r) => {
        const cur = map.get(r.dimension_value) ?? { sessions: 0, tx: 0, bounce: 0, dur: 0, count: 0 };
        cur.sessions += r.sessions;
        cur.tx += r.transactions;
        cur.bounce += r.bounce_rate;
        cur.dur += r.avg_session_duration;
        cur.count++;
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

  // Pages
  const topPages = useMemo(() => {
    const map = new Map<string, { sessions: number; tx: number }>();
    behavior
      .filter((b) => b.dimension_type === "landing_page")
      .forEach((r) => {
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

  // Cities
  const topCities = useMemo(() => {
    const map = new Map<string, { sessions: number; tx: number }>();
    behavior
      .filter((b) => b.dimension_type === "city")
      .forEach((r) => {
        const cur = map.get(r.dimension_value) ?? { sessions: 0, tx: 0 };
        cur.sessions += r.sessions;
        cur.tx += r.transactions;
        map.set(r.dimension_value, cur);
      });
    return Array.from(map.entries())
      .map(([city, d]) => ({ city, ...d }))
      .filter((c) => c.city !== "(not set)")
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);
  }, [behavior]);

  // Trend
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

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const noData = sessions.length === 0;

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">📈 Site e Conversão</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Comportamento do site • Google Analytics 4 • {startStr} → {endStr}
        </p>
        {noData && (
          <InsightBox type="warn">
            Nenhum dado GA4 encontrado para o período selecionado. Tente ampliar o filtro de datas.
          </InsightBox>
        )}
      </div>

      {/* KPIs principais */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resumo do período</p>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <KPICard
            label="Visitantes"
            value={fmtN(t.sessions)}
            sub="sessões no site"
            icon={<Globe className="h-4 w-4" />}
          />
          <KPICard
            label="Usuários únicos"
            value={fmtN(t.users)}
            sub={`${fmtPct(t.newPct)} são novos`}
            icon={<Users className="h-4 w-4" />}
          />
          <KPICard
            label="Carrinhos"
            value={fmtN(t.carts)}
            sub="adicionaram produtos"
            icon={<ShoppingCart className="h-4 w-4" />}
            color="amber"
          />
          <KPICard
            label="Compras realizadas"
            value={fmtN(t.tx)}
            sub="pedidos finalizados"
            icon={<CreditCard className="h-4 w-4" />}
            color="green"
          />
          <KPICard
            label="Taxa de conversão"
            value={fmtPct(t.convRate)}
            sub="visitantes que compraram"
            icon={<TrendingUp className="h-4 w-4" />}
            color={t.convRate > 2 ? "green" : t.convRate > 1 ? "amber" : "red"}
          />
          <KPICard
            label="Receita total"
            value={fmtR(t.rev)}
            sub="via site"
            icon={<Target className="h-4 w-4" />}
            color="primary"
          />
        </div>
      </div>

      {/* Funil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-primary" />
            Funil de conversão
            <span className="text-sm font-normal text-muted-foreground ml-1">
              — onde os visitantes chegam e onde saem
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {worstStep && (
            <InsightBox type="warn">
              <strong>Maior perda no funil:</strong> etapa <strong>"{worstStep.label}"</strong> —{" "}
              {fmtPct(worstStep.dropPct!)} dos visitantes saem nessa etapa. É onde o funil mais vaza no período.
            </InsightBox>
          )}
          <div className="space-y-5">
            {funnelSteps.map((s, i) => (
              <FunnelStep key={i} step={i + 1} {...s} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Original + Todos os produtos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Original */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Comida de Dragão Original®
              <span className="text-sm font-normal text-muted-foreground">— produto principal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "👁 Viram o produto", value: fmtN(original.viewed), sub: "visitantes que abriram a página" },
                {
                  label: "🛒 Adicionaram ao carrinho",
                  value:
                    original.viewed > 0
                      ? `${fmtN(original.cart)} (${fmtPct((original.cart / original.viewed) * 100)})`
                      : `${fmtN(original.cart)}`,
                  sub: "dos que viram",
                },
                { label: "✅ Compraram", value: fmtN(original.purchased), sub: "pedidos do Original" },
                { label: "💰 Receita gerada", value: fmtR(original.revenue), sub: "pelo produto Original" },
              ].map((k) => (
                <div key={k.label} className="bg-muted/40 rounded-lg p-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-lg font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Remarketing */}
            <div className="border-2 border-dashed border-primary/40 rounded-lg p-4 bg-primary/5">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-primary">Base de remarketing</p>
              </div>
              <p className="text-3xl font-bold">
                {fmtN(remarketing)} <span className="text-sm font-normal text-muted-foreground">pessoas</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Visitaram a página do Original mas <strong>não compraram</strong> no período. Esse é o público mais
                quente para campanhas de remarketing no Meta Ads.
              </p>
            </div>

            {original.viewed === 0 && (
              <InsightBox type="info">
                Dados de "visualização de produto" ainda não chegam do Shopify. Ative o Enhanced Ecommerce no Google
                Analytics dentro do Shopify para ver esse dado.
              </InsightBox>
            )}
          </CardContent>
        </Card>

        {/* Todos os produtos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Todos os produtos
              <span className="text-sm font-normal text-muted-foreground">— ranking por compras</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 pr-2">Produto</th>
                  <th className="text-right py-2 pr-2" title="Pessoas que viram a página do produto">
                    👁 Viu
                  </th>
                  <th className="text-right py-2 pr-2" title="Adicionou ao carrinho">
                    🛒 Carrinho
                  </th>
                  <th className="text-right py-2 pr-2" title="Finalizou a compra">
                    ✅ Comprou
                  </th>
                  <th className="text-right py-2">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {allProducts.map((p) => (
                  <tr key={p.name} className="border-b border-muted/40 hover:bg-muted/20">
                    <td className="py-2 pr-2 max-w-[140px] truncate font-medium">{p.name}</td>
                    <td className="py-2 pr-2 text-right text-muted-foreground">{fmtN(p.viewed)}</td>
                    <td className="py-2 pr-2 text-right text-muted-foreground">{fmtN(p.cart)}</td>
                    <td className="py-2 pr-2 text-right font-bold">{fmtN(p.purchased)}</td>
                    <td className="py-2 text-right">
                      <Badge
                        variant="outline"
                        className={`text-xs ${p.convPct > 3 ? "border-green-400 text-green-700" : p.convPct > 1 ? "border-amber-400 text-amber-700" : ""}`}
                      >
                        {fmtPct(p.convPct)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3">
              Conv. = % de quem viu e comprou. Colunas com 0 indicam que o GA4 ainda não recebe esses eventos do
              Shopify.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Aquisição por fonte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            De onde vêm os clientes
            <span className="text-sm font-normal text-muted-foreground">— fonte de tráfego e performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {bestSource && (
              <InsightBox type="good">
                <strong>{bestSource.sm}</strong> é o canal mais eficiente: {fmtR(bestSource.revPerSession)} de receita
                por visitante.
              </InsightBox>
            )}
            {whatsappSource && (
              <InsightBox type="good">
                <strong>WhatsApp</strong> converte {fmtPct(whatsappSource.conv)} — acima da média. Vale investir nesse
                canal.
              </InsightBox>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 pr-3">Canal</th>
                  <th className="text-right py-2 pr-3">
                    <span title="Número de visitas ao site">Visitas</span>
                  </th>
                  <th className="text-right py-2 pr-3">
                    <span title="Pedidos finalizados">Compras</span>
                  </th>
                  <th className="text-right py-2 pr-3">
                    <span title="Receita total gerada por esse canal">Receita</span>
                  </th>
                  <th className="text-right py-2 pr-3">
                    <span title="% de visitas que viraram compra">Conversão</span>
                  </th>
                  <th className="text-right py-2">
                    <span title="Receita média por visita — mede eficiência real do canal">R$/visita ⭐</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.sm} className="border-b border-muted/40 hover:bg-muted/20">
                    <td className="py-2 pr-3 font-medium max-w-[200px] truncate">{s.sm}</td>
                    <td className="py-2 pr-3 text-right">{fmtN(s.sessions)}</td>
                    <td className="py-2 pr-3 text-right">{fmtN(s.tx)}</td>
                    <td className="py-2 pr-3 text-right">{fmtR(s.rev)}</td>
                    <td className="py-2 pr-3 text-right">
                      <Badge
                        variant="outline"
                        className={`text-xs ${s.conv > 3 ? "border-green-400 text-green-700" : s.conv > 1 ? "border-amber-400 text-amber-700" : "border-red-300 text-red-600"}`}
                      >
                        {fmtPct(s.conv)}
                      </Badge>
                    </td>
                    <td className={`py-2 text-right font-bold ${s === bestSource ? "text-green-700" : ""}`}>
                      {fmtR(s.revPerSession)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            ⭐ R$/visita = receita ÷ visitas. Melhor métrica de eficiência real do canal — ignora volume e foca em
            qualidade.
          </p>
        </CardContent>
      </Card>

      {/* Novos vs Recorrentes + Comportamento */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Perfil dos visitantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Novos vs recorrentes */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Novos vs. que já visitaram antes
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">🆕 Novos visitantes</p>
                  <p className="text-2xl font-bold text-blue-700">{fmtPct(t.newPct)}</p>
                  <p className="text-xs text-blue-500">{fmtN(t.newUsers)} pessoas</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-purple-600 font-medium">🔁 Voltaram ao site</p>
                  <p className="text-2xl font-bold text-purple-700">{fmtPct(t.returningPct)}</p>
                  <p className="text-xs text-purple-500">{fmtN(t.users - t.newUsers)} pessoas</p>
                </div>
              </div>
            </div>

            {/* Dispositivo */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Dispositivo usado
              </p>
              <div className="space-y-2.5">
                {devices.map((d) => (
                  <div key={d.dev} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {d.dev === "mobile" ? (
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="capitalize font-medium">
                          {d.dev === "mobile" ? "📱 Celular" : d.dev === "desktop" ? "💻 Computador" : `📟 ${d.dev}`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{fmtPct(d.pct)}</span>
                        <span className="text-muted-foreground text-xs ml-2">{fmtN(d.sessions)} visitas</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${d.pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">Tempo médio no site: {fmtMin(d.dur)}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comportamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Onde estão e como chegam
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Páginas de entrada — por onde chegam no site
              </p>
              <div className="space-y-2">
                {topPages.map((p) => (
                  <div key={p.page} className="flex items-center justify-between text-sm py-1 border-b border-muted/40">
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">{p.page}</span>
                    <div className="flex gap-3 text-right shrink-0">
                      <span className="text-muted-foreground">{fmtN(p.sessions)} visitas</span>
                      <span className="text-green-700 font-semibold">{fmtN(p.tx)} compras</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Cidades com mais visitas
              </p>
              <div className="space-y-1.5">
                {topCities.map((c, i) => {
                  const maxS = topCities[0]?.sessions || 1;
                  return (
                    <div key={c.city} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-4 text-xs">{i + 1}.</span>
                      <span className="w-28 font-medium">{c.city}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full">
                        <div
                          className="h-2 rounded-full bg-primary/60"
                          style={{ width: `${(c.sessions / maxS) * 100}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground text-xs w-16 text-right">{fmtN(c.sessions)} visitas</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tendência diária */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução diária
          </CardTitle>
          <div className="flex gap-1">
            {(
              [
                { key: "sessions", label: "👁 Visitas" },
                { key: "tx", label: "✅ Compras" },
                { key: "rev", label: "💰 Receita" },
              ] as const
            ).map((m) => (
              <button
                key={m.key}
                onClick={() => setTrendMetric(m.key)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  trendMetric === m.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {m.label}
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
              <YAxis tick={{ fontSize: 11 }} width={45} />
              <Tooltip formatter={(v: number) => (trendMetric === "rev" ? fmtR(v) : fmtN(v))} />
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
