import { useMemo, useState, useEffect } from "react";
import { format, subDays, differenceInDays, startOfDay } from "date-fns";
import { useDashboard } from "@/contexts/DashboardContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle, TrendingUp, TrendingDown, Users, ShoppingCart,
  Lightbulb, Target, Zap, ArrowRight, Globe, MessageSquare,
  BarChart2, RefreshCw, Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Constants ────────────────────────────────────────────────────────────────

const ORIGINAL_KEYWORDS = ["original", "comida de dragão", "comida de dragao"];
const ROAS_TARGET = 2;
const CREATIVE_MAX_DAYS = 4;
const CHURN_MULTIPLIER = 2; // 2x o ciclo médio = churn

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtR = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtN = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));
const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const isOriginal = (name: string) =>
  ORIGINAL_KEYWORDS.some(k => name.toLowerCase().includes(k));

// ─── Sub-components ───────────────────────────────────────────────────────────
function KPICard({
  label, value, sub, badge, badgeVariant = "secondary", color, icon,
}: {
  label: string; value: string; sub?: string;
  badge?: string; badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  color?: "green" | "red" | "amber"; icon: React.ReactNode;
}) {
  const textColor = color === "green" ? "text-green-700" : color === "red" ? "text-red-600" : color === "amber" ? "text-amber-600" : "";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
        {badge && <Badge variant={badgeVariant} className="text-xs mt-1">{badge}</Badge>}
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Alert({
  severity, title, desc, action, onAction,
}: {
  severity: "danger" | "warn" | "good" | "info";
  title: string; desc: string; action?: string; onAction?: () => void;
}) {
  const cfg = {
    danger: { dot: "bg-red-500", bg: "bg-red-50 border-red-200", text: "text-red-800" },
    warn:   { dot: "bg-amber-400", bg: "bg-amber-50 border-amber-200", text: "text-amber-800" },
    good:   { dot: "bg-green-500", bg: "bg-green-50 border-green-200", text: "text-green-800" },
    info:   { dot: "bg-blue-400", bg: "bg-blue-50 border-blue-200", text: "text-blue-800" },
  }[severity];
  return (
    <div className={`flex items-start gap-3 border rounded-lg px-3 py-2.5 ${cfg.bg}`}>
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${cfg.text}`}>{title}</p>
        <p className={`text-xs mt-0.5 ${cfg.text} opacity-80`}>{desc}</p>
        {action && (
          <button onClick={onAction} className={`text-xs mt-1 underline ${cfg.text} hover:opacity-70`}>
            {action} →
          </button>
        )}
      </div>
    </div>
  );
}

function FunnelBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{fmtN(value)} <span className="text-muted-foreground">({fmtPct(pct)})</span></span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-2 rounded-full transition-all" style={{ width: `${Math.max(pct, 0.3)}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function PaginaInteligente() {
  const { salesData, adsData, dateRange, followersData, marketingData } = useDashboard();

  // GA4 state
  const [ga4Sessions, setGa4Sessions] = useState<any[]>([]);
  const [ga4Products, setGa4Products] = useState<any[]>([]);

  const startStr = dateRange ? format(dateRange.start, "yyyy-MM-dd") : format(subDays(new Date(), 30), "yyyy-MM-dd");
  const endStr   = dateRange ? format(dateRange.end,   "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from("ga4_sessions").select("*").gte("date", startStr).lte("date", endStr),
      supabase.from("ga4_products").select("*").gte("date", startStr).lte("date", endStr),
    ]).then(([s, p]) => {
      if (cancelled) return;
      setGa4Sessions((s.data as any[]) ?? []);
      setGa4Products((p.data as any[]) ?? []);
    });
    return () => { cancelled = true; };
  }, [startStr, endStr]);

  // ─── Sales computations ────────────────────────────────────────────────────
  const filteredSales = useMemo(() => {
    if (!dateRange) return salesData;
    return salesData.filter(o =>
      o.dataVenda >= dateRange.start && o.dataVenda <= dateRange.end &&
      o.tipoMovimento !== "devolucao" && o.tipoMovimento !== "ajuste"
    );
  }, [salesData, dateRange]);

  // Units & revenue of Original
  const originalStats = useMemo(() => {
    let units = 0, revenue = 0;
    filteredSales.forEach(o => {
      o.produtos.forEach(p => {
        if (isOriginal(p.descricaoAjustada || p.descricao)) {
          units += p.quantidade;
          revenue += p.preco * p.quantidade;
        }
      });
    });
    return { units, revenue };
  }, [filteredSales]);

  // Revenue by channel
  const channelRevenue = useMemo(() => {
    const map = { b2c: 0, b2b: 0, b2b2c: 0, unknown: 0 };
    filteredSales.forEach(o => {
      const seg = o.segmentoCliente || "unknown";
      if (seg in map) (map as any)[seg] += o.valorTotal;
      else map.unknown += o.valorTotal;
    });
    return map;
  }, [filteredSales]);

  const totalRevenue = channelRevenue.b2c + channelRevenue.b2b + channelRevenue.b2b2c + channelRevenue.unknown;

  // New customers (first purchase ever in this period)
  const newCustomers = useMemo(() => {
    const allPurchases = new Map<string, Date>();
    salesData.forEach(o => {
      const existing = allPurchases.get(o.cpfCnpj);
      if (!existing || o.dataVenda < existing) allPurchases.set(o.cpfCnpj, o.dataVenda);
    });
    let count = 0;
    filteredSales.forEach(o => {
      const first = allPurchases.get(o.cpfCnpj);
      if (first && dateRange && first >= dateRange.start && first <= dateRange.end) count++;
    });
    return count;
  }, [filteredSales, salesData, dateRange]);

  // Churn & recompra
  const churnStats = useMemo(() => {
    // Group all sales by customer
    const byCustomer = new Map<string, Date[]>();
    salesData.forEach(o => {
      if (!o.cpfCnpj) return;
      const dates = byCustomer.get(o.cpfCnpj) ?? [];
      dates.push(o.dataVenda);
      byCustomer.set(o.cpfCnpj, dates);
    });

    // Compute avg recompra cycle
    let totalIntervals = 0, intervalCount = 0;
    byCustomer.forEach(dates => {
      if (dates.length < 2) return;
      const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < sorted.length; i++) {
        totalIntervals += differenceInDays(sorted[i], sorted[i - 1]);
        intervalCount++;
      }
    });
    const avgCycle = intervalCount > 0 ? Math.round(totalIntervals / intervalCount) : 45;

    // Classify customers: only B2C, only those who bought at least once
    const refDate = dateRange ? dateRange.end : new Date();
    let churn1x = 0, churnOverdue = 0, returning = 0;
    byCustomer.forEach((dates, cpf) => {
      const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
      const lastBuy = sorted[sorted.length - 1];
      const daysSince = differenceInDays(refDate, lastBuy);
      if (sorted.length === 1 && daysSince > avgCycle * CHURN_MULTIPLIER) churn1x++;
      else if (sorted.length >= 2 && daysSince > avgCycle * CHURN_MULTIPLIER) churnOverdue++;
      else if (sorted.length >= 2) returning++;
    });

    return { avgCycle, churn1x, churnOverdue, returning, total: churn1x + churnOverdue };
  }, [salesData, dateRange]);

  // ─── Ads computations ────────────────────────────────────────────────────
  const filteredAds = useMemo(() => {
    if (!dateRange) return adsData;
    return adsData.filter(a => {
      const d = a["Início dos relatórios"];
      if (!d) return false;
      const date = new Date(d);
      return date >= dateRange.start && date <= dateRange.end;
    });
  }, [adsData, dateRange]);

  const adsStats = useMemo(() => {
    const spend   = filteredAds.reduce((s, a) => s + parseFloat(a["Valor usado (BRL)"] || "0"), 0);
    const revenue = filteredAds.reduce((s, a) => s + parseFloat(a["Valor de conversão da compra"] || "0"), 0);
    const roas    = spend > 0 ? revenue / spend : 0;
    return { spend, revenue, roas };
  }, [filteredAds]);

  // Creative aging: find unique active ads and days since first appearance
  const agingCreatives = useMemo(() => {
    const map = new Map<string, { firstDate: Date; lastDate: Date; spend: number }>();
    filteredAds.forEach(a => {
      const name = a["Nome do anúncio"];
      if (!name) return;
      const d = new Date(a["Início dos relatórios"] || "");
      if (isNaN(d.getTime())) return;
      const cur = map.get(name) ?? { firstDate: d, lastDate: d, spend: 0 };
      if (d < cur.firstDate) cur.firstDate = d;
      if (d > cur.lastDate)  cur.lastDate  = d;
      cur.spend += parseFloat(a["Valor usado (BRL)"] || "0");
      map.set(name, cur);
    });
    const refDate = dateRange ? dateRange.end : new Date();
    return Array.from(map.entries())
      .map(([name, d]) => ({
        name,
        daysRunning: differenceInDays(d.lastDate, d.firstDate) + 1,
        daysOld: differenceInDays(refDate, d.firstDate),
        spend: d.spend,
      }))
      .filter(c => c.daysOld >= CREATIVE_MAX_DAYS)
      .sort((a, b) => b.daysOld - a.daysOld)
      .slice(0, 3);
  }, [filteredAds, dateRange]);

  // ROAS daily trend: consecutive days below target
  const roasBelowTargetDays = useMemo(() => {
    const byDate = new Map<string, { spend: number; rev: number }>();
    filteredAds.forEach(a => {
      const d = a["Início dos relatórios"];
      if (!d) return;
      const cur = byDate.get(d) ?? { spend: 0, rev: 0 };
      cur.spend += parseFloat(a["Valor usado (BRL)"] || "0");
      cur.rev   += parseFloat(a["Valor de conversão da compra"] || "0");
      byDate.set(d, cur);
    });
    const sorted = Array.from(byDate.entries())
      .sort(([a], [b]) => b.localeCompare(a)); // newest first
    let consecutive = 0;
    for (const [, v] of sorted) {
      const roas = v.spend > 0 ? v.rev / v.spend : 0;
      if (roas < ROAS_TARGET) consecutive++;
      else break;
    }
    return consecutive;
  }, [filteredAds]);

  // ─── GA4 computations ──────────────────────────────────────────────────────
  const ga4Totals = useMemo(() => {
    return ga4Sessions.reduce((acc, r) => ({
      sessions: acc.sessions + r.sessions,
      carts:    acc.carts    + r.add_to_carts,
      checkouts:acc.checkouts+ r.checkouts,
      tx:       acc.tx       + r.transactions,
      rev:      acc.rev      + r.purchase_revenue,
    }), { sessions: 0, carts: 0, checkouts: 0, tx: 0, rev: 0 });
  }, [ga4Sessions]);

  // Original viewed / remarketing
  const originalGA4 = useMemo(() => {
    const rows = ga4Products.filter(p => isOriginal(p.item_name));
    return {
      viewed:    rows.reduce((s, r) => s + r.items_viewed, 0),
      carted:    rows.reduce((s, r) => s + r.items_added_to_cart, 0),
      purchased: rows.reduce((s, r) => s + r.items_purchased, 0),
    };
  }, [ga4Products]);
  const remarketingBase = Math.max(0, originalGA4.viewed - originalGA4.purchased);

  // Source breakdown
  const sourceSummary = useMemo(() => {
    const map = new Map<string, { sessions: number; tx: number; rev: number }>();
    ga4Sessions.forEach(r => {
      const cur = map.get(r.source_medium) ?? { sessions: 0, tx: 0, rev: 0 };
      cur.sessions += r.sessions; cur.tx += r.transactions; cur.rev += r.purchase_revenue;
      map.set(r.source_medium, cur);
    });
    return Array.from(map.entries())
      .map(([sm, d]) => ({ sm, ...d, revPerSession: d.sessions > 0 ? d.rev / d.sessions : 0, conv: d.sessions > 0 ? (d.tx / d.sessions) * 100 : 0 }))
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 6);
  }, [ga4Sessions]);

  const bestSource = [...sourceSummary].sort((a, b) => b.revPerSession - a.revPerSession)[0];
  const whatsappSource = sourceSummary.find(s => s.sm.toLowerCase().includes("whatsapp"));

  // Funil biggest drop
  const funnelDrop = useMemo(() => {
    const steps = [
      { label: "sessão → produto", drop: ga4Totals.sessions > 0 ? (ga4Totals.sessions - (originalGA4.viewed || ga4Totals.sessions)) / ga4Totals.sessions * 100 : 0 },
      { label: "produto → carrinho", drop: originalGA4.viewed > 0 ? (1 - originalGA4.carted / originalGA4.viewed) * 100 : 0 },
      { label: "carrinho → checkout", drop: ga4Totals.carts > 0 ? (1 - ga4Totals.checkouts / ga4Totals.carts) * 100 : 0 },
      { label: "checkout → compra", drop: ga4Totals.checkouts > 0 ? (1 - ga4Totals.tx / ga4Totals.checkouts) * 100 : 0 },
    ].filter(s => s.drop > 0);
    return steps.sort((a, b) => b.drop - a.drop)[0];
  }, [ga4Totals, originalGA4]);

  // Instagram pulse
  const igStats = useMemo(() => {
    const filtered = marketingData.filter(m => {
      if (!dateRange) return true;
      const d = new Date(m.Data);
      return d >= dateRange.start && d <= dateRange.end;
    });
    const followers = followersData.length > 0 ? parseInt(followersData[followersData.length - 1]?.TotalSeguidores || "0") : 0;
    return {
      followers,
      reach:        filtered.reduce((s, m) => s + (parseFloat(m.Alcance || "0") || 0), 0),
      interactions: filtered.reduce((s, m) => s + (parseFloat(m["Interações"] || m.Interações || "0") || 0), 0),
    };
  }, [marketingData, followersData, dateRange]);

  // ─── Alerts list ───────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const list: { severity: "danger" | "warn" | "good" | "info"; title: string; desc: string; action?: string }[] = [];

    if (agingCreatives.length > 0) {
      list.push({
        severity: "danger",
        title: `Criativo "${agingCreatives[0].name.slice(0, 40)}..." precisa ser trocado`,
        desc: `Ativo há ${agingCreatives[0].daysOld} dias — limite recomendado é ${CREATIVE_MAX_DAYS} dias. Performance tende a cair após esse ponto.`,
        action: "Ver Anúncios Meta",
      });
    }

    if (roasBelowTargetDays >= 2) {
      list.push({
        severity: roasBelowTargetDays >= 4 ? "danger" : "warn",
        title: `ROAS abaixo de ${ROAS_TARGET} há ${roasBelowTargetDays} dias consecutivos`,
        desc: `ROAS atual: ${adsStats.roas.toFixed(2)}. Não aumentar budget agora. Avaliar criativos e público.`,
        action: "Ver Anúncios",
      });
    } else if (adsStats.roas >= ROAS_TARGET && adsStats.spend > 0) {
      list.push({
        severity: "good",
        title: `ROAS ${adsStats.roas.toFixed(2)} — acima da meta`,
        desc: `Meta Ads está performando. Budget pode ser aumentado com segurança.`,
      });
    }

    if (funnelDrop && funnelDrop.drop > 50) {
      list.push({
        severity: "warn",
        title: `Funil vaza em "${funnelDrop.label}" (${funnelDrop.drop.toFixed(0)}% perdem aqui)`,
        desc: "Maior gargalo de conversão do site no período. Priorizar otimização nessa etapa.",
        action: "Ver Site e Conversão",
      });
    }

    if (remarketingBase > 100) {
      list.push({
        severity: "info",
        title: `${fmtN(remarketingBase)} pessoas viram o Original mas não compraram`,
        desc: "Público quente disponível para campanha de remarketing no Meta Ads.",
      });
    }

    if (bestSource && bestSource.sm !== "meta" && !bestSource.sm.toLowerCase().includes("meta")) {
      list.push({
        severity: "good",
        title: `"${bestSource.sm}" é o canal mais eficiente: ${fmtR(bestSource.revPerSession)}/visita`,
        desc: `Conversão de ${fmtPct(bestSource.conv)} — melhor do período. Merece atenção e investimento.`,
      });
    }

    if (churnStats.churn1x > 50) {
      list.push({
        severity: "warn",
        title: `${churnStats.churn1x} clientes compraram uma vez e não voltaram`,
        desc: `Ciclo médio de recompra: ${churnStats.avgCycle} dias. Esses clientes passaram ${CHURN_MULTIPLIER}x o ciclo sem retornar.`,
        action: "Ver Comportamento",
      });
    }

    return list;
  }, [agingCreatives, roasBelowTargetDays, adsStats, funnelDrop, remarketingBase, bestSource, churnStats]);

  const hasData = salesData.length > 0;

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-3xl font-bold">🧠 Inteligência</h1>
        <span className="text-sm text-muted-foreground">Resumo executivo + alertas de ação · {startStr} → {endStr}</span>
      </div>

      {!hasData && (
        <div className="border rounded-lg p-6 text-center text-muted-foreground">
          Nenhum dado de vendas carregado. Faça upload das NFs para ver a inteligência do negócio.
        </div>
      )}

      {/* BLOCO 1 — Termômetro */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">1 · termômetro do negócio</p>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Original vendido</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{fmtN(originalStats.units)} <span className="text-sm font-normal text-muted-foreground">un.</span></p>
              <p className="text-xs text-muted-foreground mt-2">{fmtR(originalStats.revenue)} no período</p>
            </CardContent>
          </Card>

          <KPICard
            label="Receita total"
            value={fmtR(totalRevenue)}
            sub={`B2C ${fmtR(channelRevenue.b2c)} · B2B ${fmtR(channelRevenue.b2b + channelRevenue.b2b2c)}`}
            icon={<TrendingUp className="h-4 w-4" />}
          />

          <KPICard
            label="Meta Ads · ROAS"
            value={adsStats.roas > 0 ? adsStats.roas.toFixed(2) : "—"}
            sub={`Gasto ${fmtR(adsStats.spend)} · Retorno ${fmtR(adsStats.revenue)}`}
            badge={adsStats.roas >= ROAS_TARGET ? `✓ acima de ${ROAS_TARGET}` : adsStats.roas > 0 ? `abaixo de ${ROAS_TARGET}` : "sem dados"}
            badgeVariant={adsStats.roas >= ROAS_TARGET ? "default" : adsStats.roas > 0 ? "destructive" : "secondary"}
            color={adsStats.roas >= ROAS_TARGET ? "green" : adsStats.roas > 0 ? "red" : undefined}
            icon={<Activity className="h-4 w-4" />}
          />

          <KPICard
            label="Novos clientes B2C"
            value={String(newCustomers)}
            sub={`${churnStats.total} em risco de churn · ciclo médio ${churnStats.avgCycle}d`}
            icon={<Users className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* BLOCO 2 — Alertas + Funil */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">2 · alertas de ação</p>
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Alertas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-primary" />
                O que fazer agora
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum alerta ativo no período.</p>
              )}
              {alerts.map((a, i) => (
                <Alert key={i} {...a} />
              ))}
            </CardContent>
          </Card>

          {/* Funil */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart2 className="h-4 w-4 text-primary" />
                Funil completo B2C · {startStr} → {endStr}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ga4Totals.sessions > 0 ? (
                <>
                  <FunnelBar label="Sessões no site"       value={ga4Totals.sessions}     total={ga4Totals.sessions} color="#378ADD" />
                  {originalGA4.viewed > 0 && (
                    <FunnelBar label="Viram o Original"    value={originalGA4.viewed}     total={ga4Totals.sessions} color="#5DCAA5" />
                  )}
                  <FunnelBar label="Adicionaram ao carrinho" value={ga4Totals.carts}      total={ga4Totals.sessions} color="#EF9F27" />
                  <FunnelBar label="Iniciaram checkout"    value={ga4Totals.checkouts}    total={ga4Totals.sessions} color="#EF9F27" />
                  <FunnelBar label="Compraram"             value={ga4Totals.tx}           total={ga4Totals.sessions} color="#1D9E75" />
                  <div className="border-t pt-3 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">origem das compras</p>
                    {sourceSummary.slice(0, 5).map(s => (
                      <div key={s.sm} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[180px]">{s.sm}</span>
                        <div className="flex gap-3 shrink-0">
                          <span>{fmtN(s.sessions)} sess.</span>
                          <span className="font-semibold text-green-700">{s.tx} compras</span>
                          <Badge variant="outline" className="text-xs py-0">{fmtPct(s.conv)}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados GA4 para o período selecionado.</p>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* BLOCO 3 — Original + Churn */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">3 · comida de dragão original® · produto principal</p>
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Produto */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-primary" />
                Performance do produto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Unidades vendidas", value: fmtN(originalStats.units) },
                  { label: "Receita",            value: fmtR(originalStats.revenue) },
                  { label: "Ticket médio",        value: originalStats.units > 0 ? fmtR(originalStats.revenue / originalStats.units) : "—" },
                  { label: "% da receita total",  value: totalRevenue > 0 ? fmtPct((originalStats.revenue / totalRevenue) * 100) : "—" },
                ].map(k => (
                  <div key={k.label} className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <p className="text-base font-bold mt-0.5">{k.value}</p>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground border-t pt-3">
                Receita do Original: <span className="font-semibold">{fmtR(originalStats.revenue)}</span> · ticket médio <span className="font-semibold">{originalStats.units > 0 ? fmtR(originalStats.revenue / originalStats.units) : "—"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Remarketing */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-blue-600" />
                Base de remarketing
                <Badge className="text-xs bg-blue-100 text-blue-700 ml-auto">público quente</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {originalGA4.viewed > 0 ? (
                <>
                  <div>
                    <p className="text-3xl font-bold text-blue-700">{fmtN(remarketingBase)}</p>
                    <p className="text-xs text-muted-foreground mt-1">pessoas viram o Original mas não compraram</p>
                  </div>
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Viram + carregaram carrinho</span>
                      <span className="font-semibold text-amber-700">{fmtN(originalGA4.carted)} pessoas</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Viram mas não clicaram em comprar</span>
                      <span className="font-semibold">{fmtN(Math.max(0, originalGA4.viewed - originalGA4.carted))} pessoas</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground border-t pt-2">
                    Ativar campanha de remarketing no Meta Ads com esse público. São os visitantes mais quentes do período.
                  </p>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-blue-700">{fmtN(remarketingBase)}</p>
                  <p className="text-xs text-muted-foreground">
                    Dados de "visualização de produto" requerem Enhanced Ecommerce ativo no GA4/Shopify para aparecer aqui.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Churn */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-4 w-4 text-primary" />
                Retenção de clientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm">Compraram 1x, desapareceram</span>
                <Badge variant="destructive" className="text-xs">{churnStats.churn1x} clientes</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm">Ciclo de recompra vencido</span>
                <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">{churnStats.churnOverdue} clientes</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Compraram 2x+, retornando</span>
                <Badge variant="outline" className="text-xs border-green-400 text-green-700">{churnStats.returning} clientes</Badge>
              </div>
              <div className="border-t pt-3 text-xs text-muted-foreground space-y-1">
                <p>Ciclo médio de recompra: <span className="font-semibold">{churnStats.avgCycle} dias</span></p>
                <p>Alerta de churn: &gt; {churnStats.avgCycle * CHURN_MULTIPLIER} dias sem comprar</p>
                <p className="text-amber-700">{churnStats.total} clientes inativos = lista de remarketing secundária</p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* BLOCO 4 — Canais + Instagram */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">4 · canais e pulso orgânico</p>
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Canais — NF */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Performance por canal · receita e eficiência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-3">Canal</th>
                    <th className="text-right py-2 pr-3">Receita (NF)</th>
                    <th className="text-right py-2 pr-3">Sessões GA4</th>
                    <th className="text-right py-2 pr-3">Compras GA4</th>
                    <th className="text-right py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "Meta Ads",
                      revenue: adsStats.revenue,
                      sessions: sourceSummary.find(s => s.sm.toLowerCase().includes("meta") || s.sm.toLowerCase().includes("facebook"))?.sessions ?? 0,
                      tx: sourceSummary.find(s => s.sm.toLowerCase().includes("meta") || s.sm.toLowerCase().includes("facebook"))?.tx ?? 0,
                      badge: adsStats.roas >= ROAS_TARGET ? "ROAS " + adsStats.roas.toFixed(1) + " ✓" : "ROAS " + adsStats.roas.toFixed(1),
                      badgeOk: adsStats.roas >= ROAS_TARGET,
                    },
                    {
                      label: "B2B (Let's Fly)",
                      revenue: channelRevenue.b2b,
                      sessions: null, tx: null, badge: channelRevenue.b2b > 0 ? "ativo" : "sem dados", badgeOk: channelRevenue.b2b > 0,
                    },
                    {
                      label: "B2B2C (Distribuidores)",
                      revenue: channelRevenue.b2b2c,
                      sessions: null, tx: null, badge: channelRevenue.b2b2c > 0 ? "ativo" : "sem dados", badgeOk: channelRevenue.b2b2c > 0,
                    },
                    ...(whatsappSource ? [{
                      label: "WhatsApp",
                      revenue: whatsappSource.rev,
                      sessions: whatsappSource.sessions, tx: whatsappSource.tx,
                      badge: fmtPct(whatsappSource.conv) + " conv.", badgeOk: true,
                    }] : []),
                    {
                      label: "Google orgânico",
                      revenue: sourceSummary.find(s => s.sm.toLowerCase().includes("google") && s.sm.toLowerCase().includes("organic"))?.rev ?? 0,
                      sessions: sourceSummary.find(s => s.sm.toLowerCase().includes("google") && s.sm.toLowerCase().includes("organic"))?.sessions ?? 0,
                      tx: sourceSummary.find(s => s.sm.toLowerCase().includes("google") && s.sm.toLowerCase().includes("organic"))?.tx ?? 0,
                      badge: "orgânico", badgeOk: true,
                    },
                  ].filter(c => c.revenue > 0 || (c.sessions ?? 0) > 0).map((c, i) => (
                    <tr key={i} className="border-b border-muted/40 hover:bg-muted/20">
                      <td className="py-2 pr-3 font-medium">{c.label}</td>
                      <td className="py-2 pr-3 text-right">{c.revenue > 0 ? fmtR(c.revenue) : "—"}</td>
                      <td className="py-2 pr-3 text-right text-muted-foreground">{c.sessions != null ? fmtN(c.sessions) : "—"}</td>
                      <td className="py-2 pr-3 text-right text-muted-foreground">{c.tx != null ? c.tx : "—"}</td>
                      <td className="py-2 text-right">
                        <Badge variant="outline" className={`text-xs ${c.badgeOk ? "border-green-400 text-green-700" : "border-red-300 text-red-600"}`}>
                          {c.badge}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sourceSummary.length === 0 && adsStats.spend === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sem dados de canais para o período.</p>
              )}
            </CardContent>
          </Card>

          {/* Instagram */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" />
                Pulso orgânico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Seguidores totais",   value: igStats.followers > 0 ? fmtN(igStats.followers) : "—" },
                { label: "Alcance no período",  value: igStats.reach > 0 ? fmtN(igStats.reach) : "—" },
                { label: "Interações",          value: igStats.interactions > 0 ? fmtN(igStats.interactions) : "—" },
              ].map(k => (
                <div key={k.label} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-lg font-bold mt-0.5">{k.value}</p>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">
                Orgânico é contexto — não entra na conta de CAC ou ROAS.
              </p>
            </CardContent>
          </Card>

        </div>
      </div>

    </div>
  );
}
