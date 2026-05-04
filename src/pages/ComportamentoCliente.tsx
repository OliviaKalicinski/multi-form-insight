import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useCustomerData } from "@/hooks/useCustomerData";
import {
  Users, RefreshCcw, AlertTriangle, DollarSign, Calendar, TrendingUp,
  Info, UserMinus, TrendingDown, FileWarning, PieChart,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderVolumeChart } from "@/components/dashboard/OrderVolumeChart";
import { SalesPeaksChart } from "@/components/dashboard/SalesPeaksChart";
import { VolumeKPICards } from "@/components/dashboard/VolumeKPICards";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { StatusMetricCard, getStatusFromBenchmark } from "@/components/dashboard/StatusMetricCard";
import { analyzeOrderVolume, analyzeSalesPeaks } from "@/utils/customerBehaviorMetrics";
import { formatCurrency, filterOrdersByDateRange } from "@/utils/salesCalculator";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerSegmentationChart } from "@/components/dashboard/CustomerSegmentationChart";
import { SegmentRevenueChart } from "@/components/dashboard/SegmentRevenueChart";
import { SegmentDetailTable } from "@/components/dashboard/SegmentDetailTable";
import { ChurnFunnelChart } from "@/components/dashboard/ChurnFunnelChart";
import { ChurnRiskTable } from "@/components/dashboard/ChurnRiskTable";
import { KPITooltip } from "@/components/dashboard/KPITooltip";
import { EmptyState } from "@/components/EmptyState";
import {
  getB2COrders,
  getB2B2COrders,
  getB2BOrders,
  SEGMENT_LABELS,
  SEGMENT_COLORS,
  SEGMENT_ORDER,
} from "@/utils/revenue";
import { computeBehaviorMetrics } from "@/utils/computeBehaviorMetrics";
import { isSampleProduct, isOnlySampleOrder } from "@/utils/samplesAnalyzer";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProcessedOrder } from "@/types/marketing";

// ─── Journey Types ─────────────────────────────────────────────────────────────
type JourneyType = "amostra" | "produto" | "misto";

const JOURNEY_CONFIG: Record<
  JourneyType,
  { label: string; shortLabel: string; icon: string; color: string; bg: string; border: string; text: string }
> = {
  amostra: {
    label: "Iniciou com Amostra",
    shortLabel: "Só Amostra",
    icon: "🎁",
    color: "#8b5cf6",
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
  },
  produto: {
    label: "Iniciou com Produto",
    shortLabel: "Só Produto",
    icon: "📦",
    color: "#3b82f6",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  misto: {
    label: "Produto + Amostra",
    shortLabel: "Misto",
    icon: "🎁📦",
    color: "#10b981",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
};

const JOURNEY_TYPES: JourneyType[] = ["amostra", "produto", "misto"];

// ─── Journey Analysis Logic ────────────────────────────────────────────────────
function isValidCustomer(cpf: string | null | undefined): cpf is string {
  return !!cpf && !cpf.startsWith("nf-") && cpf.trim().length > 3;
}

function classifyFirstPurchase(firstOrder: ProcessedOrder): JourneyType {
  const hasSample = firstOrder.produtos.some((p) => isSampleProduct(p));
  const hasRegular = firstOrder.produtos.some((p) => !isSampleProduct(p));
  if (hasSample && hasRegular) return "misto";
  if (hasSample) return "amostra";
  return "produto";
}

interface JourneyMetrics {
  count: number;
  repurchaseRate: number;
  avgDaysToRepurchase: number;
  ticketMedio: number;
  ltv: number;
  conv30: number;
  conv60: number;
  conv90: number;
  conv180: number;
}

interface JourneyAnalysis {
  amostra: JourneyMetrics;
  produto: JourneyMetrics;
  misto: JourneyMetrics;
  total: number;
}

function emptyMetrics(): JourneyMetrics {
  return { count: 0, repurchaseRate: 0, avgDaysToRepurchase: 0, ticketMedio: 0, ltv: 0, conv30: 0, conv60: 0, conv90: 0, conv180: 0 };
}

function computeJourneyAnalysis(
  allB2cOrders: ProcessedOrder[],
  dateStart?: Date | null,
  dateEnd?: Date | null,
): JourneyAnalysis {
  if (allB2cOrders.length === 0) {
    return { amostra: emptyMetrics(), produto: emptyMetrics(), misto: emptyMetrics(), total: 0 };
  }

  // 1. Group ALL B2C orders by customer (for lifetime history)
  const customerMap = new Map<string, ProcessedOrder[]>();
  for (const o of allB2cOrders) {
    if (!isValidCustomer(o.cpfCnpj)) continue;
    const list = customerMap.get(o.cpfCnpj) ?? [];
    list.push(o);
    customerMap.set(o.cpfCnpj, list);
  }

  // 2. Per-type buckets
  type CustomerRow = {
    hasRepurchased: boolean;
    daysToRepurchase: number | null;
    totalRevenue: number;
    orderCount: number;
  };
  const buckets: Record<JourneyType, CustomerRow[]> = { amostra: [], produto: [], misto: [] };

  for (const [, orders] of customerMap) {
    const sorted = [...orders].sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime());
    const first = sorted[0];

    // Filter: first purchase must fall inside the selected date window
    if (dateStart && first.dataVenda < dateStart) continue;
    if (dateEnd && first.dataVenda > dateEnd) continue;

    const type = classifyFirstPurchase(first);

    // Subsequent orders that contain at least one regular (non-sample) product
    const repurchaseOrders = sorted
      .slice(1)
      .filter((o) => o.produtos.some((p) => !isSampleProduct(p)));

    const hasRepurchased = repurchaseOrders.length > 0;
    const daysToRepurchase = hasRepurchased
      ? (repurchaseOrders[0].dataVenda.getTime() - first.dataVenda.getTime()) / 86_400_000
      : null;

    const totalRevenue = sorted.reduce((s, o) => s + o.valorTotal, 0);

    buckets[type].push({ hasRepurchased, daysToRepurchase, totalRevenue, orderCount: sorted.length });
  }

  // 3. Aggregate metrics per bucket
  function aggregate(rows: CustomerRow[]): JourneyMetrics {
    const n = rows.length;
    if (n === 0) return emptyMetrics();

    const repurchased = rows.filter((r) => r.hasRepurchased).length;
    const withDays = rows.filter((r) => r.daysToRepurchase !== null);
    const avgDays =
      withDays.length > 0
        ? withDays.reduce((s, r) => s + r.daysToRepurchase!, 0) / withDays.length
        : 0;

    const totalRev = rows.reduce((s, r) => s + r.totalRevenue, 0);
    const totalOrd = rows.reduce((s, r) => s + r.orderCount, 0);

    const convRate = (maxDays: number) =>
      (rows.filter((r) => r.daysToRepurchase !== null && r.daysToRepurchase <= maxDays).length / n) * 100;

    return {
      count: n,
      repurchaseRate: (repurchased / n) * 100,
      avgDaysToRepurchase: avgDays,
      ticketMedio: totalOrd > 0 ? totalRev / totalOrd : 0,
      ltv: totalRev / n,
      conv30: convRate(30),
      conv60: convRate(60),
      conv90: convRate(90),
      conv180: convRate(180),
    };
  }

  const result = {
    amostra: aggregate(buckets.amostra),
    produto: aggregate(buckets.produto),
    misto: aggregate(buckets.misto),
    total: buckets.amostra.length + buckets.produto.length + buckets.misto.length,
  };

  return result;
}

// ─── Journey Tab ───────────────────────────────────────────────────────────────
function JourneyTab({ analysis }: { analysis: JourneyAnalysis }) {
  if (analysis.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhum cliente encontrado no período</CardTitle>
          <CardDescription>
            Ajuste o filtro de datas ou carregue dados na página "Upload".
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Chart: repurchase rate (horizontal bars)
  const repurchaseData = JOURNEY_TYPES.map((t) => ({
    name: JOURNEY_CONFIG[t].shortLabel,
    "Recompra %": +analysis[t].repurchaseRate.toFixed(1),
    fill: JOURNEY_CONFIG[t].color,
  }));

  // Chart: LTV + ticket
  const ltvData = JOURNEY_TYPES.map((t) => ({
    name: JOURNEY_CONFIG[t].shortLabel,
    LTV: +analysis[t].ltv.toFixed(2),
    "Ticket Médio": +analysis[t].ticketMedio.toFixed(2),
    fill: JOURNEY_CONFIG[t].color,
  }));

  // Chart: conversion funnel
  const funnelData = [30, 60, 90, 180].map((days) => ({
    days: `${days}d`,
    ...Object.fromEntries(
      JOURNEY_TYPES.map((t) => [
        JOURNEY_CONFIG[t].shortLabel,
        +analysis[t][`conv${days}` as "conv30" | "conv60" | "conv90" | "conv180"].toFixed(1),
      ])
    ),
  }));

  // Chart: avg days to repurchase
  const daysData = JOURNEY_TYPES.filter((t) => analysis[t].avgDaysToRepurchase > 0).map((t) => ({
    name: JOURNEY_CONFIG[t].shortLabel,
    "Dias até recomprar": +analysis[t].avgDaysToRepurchase.toFixed(0),
    fill: JOURNEY_CONFIG[t].color,
  }));

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-3">
          <p className="text-sm text-blue-800">
            💡 Clientes classificados pelo tipo do <strong>primeiro pedido</strong>. O filtro de datas
            controla <strong>quando esse primeiro pedido aconteceu</strong>. O histórico completo de cada
            cliente é usado para calcular recompra e LTV.
          </p>
        </CardContent>
      </Card>

      {/* ── 3 Profile Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {JOURNEY_TYPES.map((type) => {
          const cfg = JOURNEY_CONFIG[type];
          const m = analysis[type];
          const pct = analysis.total > 0 ? ((m.count / analysis.total) * 100).toFixed(0) : "0";
          return (
            <Card key={type} className={cn("border-2", cfg.border)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className={cn("text-base leading-snug", cfg.text)}>
                    {cfg.icon} {cfg.label}
                  </CardTitle>
                  <Badge variant="outline" className={cn("shrink-0 text-xs", cfg.bg, cfg.text, cfg.border)}>
                    {pct}% da base
                  </Badge>
                </div>
                <p className={cn("text-4xl font-bold mt-1", cfg.text)}>{m.count.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">clientes</p>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm pt-0">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <RefreshCcw className="h-3.5 w-3.5" /> Taxa de recompra
                  </span>
                  <span className="font-bold text-base">{m.repurchaseRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dias até recomprar</span>
                  <span className="font-semibold">
                    {m.avgDaysToRepurchase > 0 ? `${m.avgDaysToRepurchase.toFixed(0)}d` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ticket médio</span>
                  <span className="font-semibold">{formatCurrency(m.ticketMedio)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">LTV</span>
                  <span className="font-semibold">{formatCurrency(m.ltv)}</span>
                </div>
                <div className="pt-1 grid grid-cols-4 gap-1 text-center text-[10px] text-muted-foreground">
                  {([30, 60, 90, 180] as const).map((d) => {
                    const key = `conv${d}` as "conv30" | "conv60" | "conv90" | "conv180";
                    return (
                      <div key={d} className={cn("rounded p-1", cfg.bg)}>
                        <div className={cn("font-bold text-sm", cfg.text)}>{m[key].toFixed(0)}%</div>
                        <div>{d}d</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Comparison Charts Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Repurchase Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Taxa de Recompra por Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={repurchaseData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <RechartsTooltip formatter={(v) => [`${v}%`, "Recompra"]} />
                  <Bar dataKey="Recompra %" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11, formatter: (v: number) => `${v}%` }}>
                    {JOURNEY_TYPES.map((t) => (
                      <Cell key={t} fill={JOURNEY_CONFIG[t].color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* LTV + Ticket */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">LTV e Ticket Médio por Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ltvData} margin={{ right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 10 }} />
                  <RechartsTooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="LTV" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ticket Médio" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Conversion Funnel by Time Window ── */}
      <Card>
        <CardHeader>
          <CardTitle>Funil de Conversão — Recompra por Janela de Tempo</CardTitle>
          <CardDescription>
            % de clientes de cada perfil que fez ao menos 1 recompra (produto regular) dentro do prazo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="days" />
                <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <RechartsTooltip formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {JOURNEY_TYPES.map((t) => (
                  <Bar
                    key={t}
                    dataKey={JOURNEY_CONFIG[t].shortLabel}
                    fill={JOURNEY_CONFIG[t].color}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Perfil</th>
                  <th className="text-center py-2 px-3 font-medium">Clientes</th>
                  <th className="text-center py-2 px-3 font-medium">30d</th>
                  <th className="text-center py-2 px-3 font-medium">60d</th>
                  <th className="text-center py-2 px-3 font-medium">90d</th>
                  <th className="text-center py-2 px-3 font-medium">180d</th>
                  <th className="text-center py-2 px-3 font-medium">Recompra total</th>
                </tr>
              </thead>
              <tbody>
                {JOURNEY_TYPES.map((t) => {
                  const m = analysis[t];
                  const cfg = JOURNEY_CONFIG[t];
                  return (
                    <tr key={t} className="border-t">
                      <td className="py-2.5 px-3">
                        <span className={cn("font-semibold", cfg.text)}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="text-center py-2.5 px-3 text-muted-foreground">
                        {m.count.toLocaleString("pt-BR")}
                      </td>
                      <td className="text-center py-2.5 px-3 font-medium">{m.conv30.toFixed(1)}%</td>
                      <td className="text-center py-2.5 px-3 font-medium">{m.conv60.toFixed(1)}%</td>
                      <td className="text-center py-2.5 px-3 font-medium">{m.conv90.toFixed(1)}%</td>
                      <td className="text-center py-2.5 px-3 font-medium">{m.conv180.toFixed(1)}%</td>
                      <td className="text-center py-2.5 px-3 font-bold">{m.repurchaseRate.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Avg Days to Repurchase ── */}
      {daysData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tempo Médio até a Primeira Recompra</CardTitle>
            <CardDescription>
              Calculado apenas entre clientes que efetivamente recompraram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daysData} layout="vertical" margin={{ left: 8, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" unit="d" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <RechartsTooltip formatter={(v) => [`${v} dias`, "Média"]} />
                  <Bar
                    dataKey="Dias até recomprar"
                    radius={[0, 4, 4, 0]}
                    label={{ position: "right", fontSize: 11, formatter: (v: number) => `${v}d` }}
                  >
                    {daysData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ComportamentoCliente() {
  const { salesData, dateRange, comparisonDateRange, comparisonMode } = useDashboard();

  // R42: toggle "Excluir clientes só-amostra" (default ON — comportamento mais
  // honesto: cliente que só pegou amostra de R$1 não distorce métricas).
  const [excludeSampleOnly, setExcludeSampleOnly] = useState(true);

  // R43: multi-select de segmentos (B2C/B2B2C/B2B). Default = todos selecionados
  // (visão consolidada). Filtro vale pra TODAS as abas: Jornada, Comportamento,
  // Segmentos, Risco de Churn — coerência entre o que aparece em cada aba.
  type Seg = (typeof SEGMENT_ORDER)[number];
  const [selectedSegments, setSelectedSegments] = useState<Set<Seg>>(
    () => new Set(SEGMENT_ORDER),
  );
  const toggleSegment = (s: Seg) => {
    setSelectedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        if (next.size === 1) return prev; // mínimo 1 segmento
        next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });
  };

  // R42: Set de CPFs cuja vida inteira de pedidos é 100% amostra. Usa
  // isOnlySampleOrder como detector (price-based + keyword + tipo_movimento).
  // Mesma lógica do filtro em /clientes (Clientes.tsx).
  const sampleOnlyCpfSet = useMemo(() => {
    if (!excludeSampleOnly) return undefined;
    const byCpf = new Map<string, { total: number; samples: number }>();
    for (const o of salesData ?? []) {
      const cpfRaw = (o as any).cpfCnpj ?? "";
      const cpf = String(cpfRaw).replace(/\D/g, "");
      if (!cpf) continue;
      const cur = byCpf.get(cpf) ?? { total: 0, samples: 0 };
      cur.total++;
      if (isOnlySampleOrder(o)) cur.samples++;
      byCpf.set(cpf, cur);
    }
    const out = new Set<string>();
    byCpf.forEach((v, cpf) => {
      if (v.total > 0 && v.total === v.samples) out.add(cpf);
    });
    return out;
  }, [salesData, excludeSampleOnly]);

  // R43: bucket de segmento por CPF. Cliente é classificado pelo segmentoCliente
  // do PRIMEIRO pedido (ou "b2c" como fallback se vier null). Assim CPFs com
  // segmento não-selecionado ficam fora das métricas via excludedCpfs.
  const cpfSegmentMap = useMemo(() => {
    const map = new Map<string, Seg>();
    for (const o of salesData ?? []) {
      const cpf = String((o as any).cpfCnpj ?? "").replace(/\D/g, "");
      if (!cpf || map.has(cpf)) continue;
      const segRaw = String((o as any).segmentoCliente ?? "").toLowerCase().trim();
      const bucket: Seg = segRaw === "b2b" ? "b2b" : segRaw === "b2b2c" ? "b2b2c" : "b2c";
      map.set(cpf, bucket);
    }
    return map;
  }, [salesData]);

  // R43: CPFs cujo segmento NÃO está selecionado — entram no exclude para useCustomerData.
  const excludedSegmentCpfSet = useMemo(() => {
    const out = new Set<string>();
    if (selectedSegments.size === SEGMENT_ORDER.length) return out; // todos = nada a excluir
    cpfSegmentMap.forEach((seg, cpf) => {
      if (!selectedSegments.has(seg)) out.add(cpf);
    });
    return out;
  }, [cpfSegmentMap, selectedSegments]);

  // R43: combina exclude de só-amostra + segmento não-selecionado pro hook de churn.
  const combinedExcludedCpfs = useMemo(() => {
    const out = new Set<string>();
    if (sampleOnlyCpfSet) sampleOnlyCpfSet.forEach((c) => out.add(c));
    excludedSegmentCpfSet.forEach((c) => out.add(c));
    return out.size > 0 ? out : undefined;
  }, [sampleOnlyCpfSet, excludedSegmentCpfSet]);

  // useCustomerData → aba Churn (lifecycle, histórico completo). Respeita
  // tanto o toggle só-amostra quanto o multi-select de segmentos (R43).
  const { churnMetrics, churnRiskCustomers, isLoading: customerLoading } = useCustomerData(combinedExcludedCpfs);
  const { sectorBenchmarks } = useAppSettings();

  // R42-fix → R43: filtra pedidos pelos segmentos selecionados (union) e
  // exclui CPFs só-amostra quando o toggle está ON. Propaga pra filteredOrders,
  // journeyAnalysis, behaviorMetrics, volumeAnalysis, peaksData — toda métrica
  // derivada respeita ambos os filtros.
  const segmentSalesData = useMemo(() => {
    if (!salesData) return [];
    const buckets: Record<Seg, ReturnType<typeof getB2COrders>> = {
      b2c: selectedSegments.has("b2c") ? getB2COrders(salesData) : [],
      b2b2c: selectedSegments.has("b2b2c") ? getB2B2COrders(salesData) : [],
      b2b: selectedSegments.has("b2b") ? getB2BOrders(salesData) : [],
    };
    let orders = [...buckets.b2c, ...buckets.b2b2c, ...buckets.b2b];
    if (sampleOnlyCpfSet && sampleOnlyCpfSet.size > 0) {
      orders = orders.filter((o) => {
        const cpf = String((o as any).cpfCnpj ?? "").replace(/\D/g, "");
        return cpf && !sampleOnlyCpfSet.has(cpf);
      });
    }
    return orders;
  }, [salesData, selectedSegments, sampleOnlyCpfSet]);

  const [volumeView, setVolumeView] = useState<"daily" | "weekly" | "monthly" | "quarterly">("daily");

  const filteredOrders = useMemo(() => {
    if (segmentSalesData.length === 0) return [];
    return dateRange ? filterOrdersByDateRange(segmentSalesData, dateRange.start, dateRange.end) : segmentSalesData;
  }, [segmentSalesData, dateRange]);

  // ── Journey Analysis (new) ──────────────────────────────────────────────────
  // Uses ALL b2c orders for full customer history; dateRange filters first-purchase date
  const journeyAnalysis = useMemo(
    () =>
      computeJourneyAnalysis(
        segmentSalesData,
        dateRange?.start ?? null,
        dateRange?.end ?? null,
      ),
    [segmentSalesData, dateRange],
  );

  // ── Behaviour metrics (period-filtered) ────────────────────────────────────
  const behaviorMetrics = useMemo(() => computeBehaviorMetrics(filteredOrders), [filteredOrders]);
  const { summary: summaryMetrics, segments } = behaviorMetrics;

  const volumeAnalysisData = useMemo(() => {
    if (filteredOrders.length === 0) return null;
    return analyzeOrderVolume(filteredOrders);
  }, [filteredOrders]);

  const peaksData = useMemo(() => {
    if (filteredOrders.length === 0) return [];
    return analyzeSalesPeaks(filteredOrders).filter((p) => p.isPeak);
  }, [filteredOrders]);

  const volumeTrend = useMemo(() => {
    if (!dateRange || !comparisonDateRange || segmentSalesData.length === 0) return undefined;
    const curr = filterOrdersByDateRange(segmentSalesData, dateRange.start, dateRange.end);
    const prev = filterOrdersByDateRange(segmentSalesData, comparisonDateRange.start, comparisonDateRange.end);
    if (prev.length === 0) return undefined;
    return ((curr.length - prev.length) / prev.length) * 100;
  }, [segmentSalesData, dateRange, comparisonDateRange]);

  const volumeAnalysis = useMemo(() => {
    if (!volumeAnalysisData?.daily?.length)
      return { peakDay: { date: "", orders: 0 }, lowDay: { date: "", orders: 0 }, averageDaily: 0 };
    const days = volumeAnalysisData.daily;
    const peakDay = days.reduce((max, c) => (c.orders > max.orders ? c : max), days[0]);
    const lowDay = days.reduce((min, c) => (c.orders < min.orders ? c : min), days[0]);
    return { peakDay, lowDay, averageDaily: days.reduce((s, d) => s + d.orders, 0) / days.length };
  }, [volumeAnalysisData]);

  const clienteBreakdown = useMemo(
    () => ({ novos: summaryMetrics.clientesNovos, recorrentes: summaryMetrics.clientesRecorrentes }),
    [summaryMetrics],
  );

  const comparisonMetrics = useMemo(() => {
    if (!comparisonMode || !comparisonDateRange || segmentSalesData.length === 0) return null;
    const COLORS = ["#8b5cf6", "#3b82f6"];
    const periods = [
      { range: dateRange, label: "Período A", color: COLORS[0] },
      { range: comparisonDateRange, label: "Período B", color: COLORS[1] },
    ].filter((p) => p.range);
    const volumePorMes = periods.map(({ range, label, color }) => {
      const orders = filterOrdersByDateRange(segmentSalesData, range!.start, range!.end);
      return { month: label.toLowerCase().replace(" ", "-"), monthLabel: label, value: orders.length, color };
    });
    if (volumePorMes.length > 1) {
      const base = volumePorMes[0].value;
      volumePorMes.forEach((item, idx) => {
        if (idx > 0 && base > 0)
          (item as any).percentageChange = ((item.value - base) / base) * 100;
      });
    }
    return { volumePorMes };
  }, [comparisonMode, comparisonDateRange, dateRange, segmentSalesData]);

  if (segmentSalesData.length === 0 && !customerLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6" />
              👥 Comportamento do Cliente
            </CardTitle>
            <CardDescription>
              Carregue os dados de vendas na página "Upload" para visualizar as análises de comportamento.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const totalClientes = summaryMetrics.totalClientes;
  const totalClientesHistorico = churnMetrics.totalClientes;
  const { clientesAtivos, clientesEmRisco, clientesInativos, clientesChurn, taxaChurn } = churnMetrics;
  const valorEmRisco = churnRiskCustomers.reduce((sum, c) => sum + c.valorTotal, 0);

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">👥 Comportamento do Cliente</h1>
            <p className="text-muted-foreground">
              Jornada de entrada, recompra, churn, volume e segmentação
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* R43: multi-select de segmentos. Default = todos (consolidado).
               Vale pra TODAS as abas: Jornada, Comportamento, Segmentos, Churn. */}
          <div className="flex items-center gap-1 bg-card border rounded-md p-1">
            {SEGMENT_ORDER.map((seg) => {
              const active = selectedSegments.has(seg);
              return (
                <button
                  key={seg}
                  onClick={() => toggleSegment(seg)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    active
                      ? "text-white"
                      : "text-muted-foreground hover:bg-muted/50",
                  )}
                  style={active ? { backgroundColor: SEGMENT_COLORS[seg] } : undefined}
                  title={active ? `Clique pra ocultar ${SEGMENT_LABELS[seg]}` : `Clique pra incluir ${SEGMENT_LABELS[seg]}`}
                >
                  {SEGMENT_LABELS[seg]}
                </button>
              );
            })}
            <span className="text-[11px] text-muted-foreground px-2 select-none">
              {selectedSegments.size === SEGMENT_ORDER.length
                ? "Consolidado"
                : `${selectedSegments.size}/${SEGMENT_ORDER.length}`}
            </span>
          </div>

          {/* R42: toggle "Excluir clientes só-amostra" — afeta Comportamento,
               Segmentos e Risco de Churn (todas as métricas via useCustomerData). */}
          <label className="flex items-center gap-2 text-sm bg-card border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={excludeSampleOnly}
              onChange={(e) => setExcludeSampleOnly(e.target.checked)}
              className="h-4 w-4"
            />
            <span>
              Excluir clientes só-amostra
              {sampleOnlyCpfSet && (
                <span className="text-muted-foreground ml-1.5 text-xs">
                  ({sampleOnlyCpfSet.size} CPFs)
                </span>
              )}
            </span>
          </label>
        </div>
      </div>

      <Tabs defaultValue="jornada">
        <TabsList>
          <TabsTrigger value="jornada">🗺️ Jornada de Entrada</TabsTrigger>
          <TabsTrigger value="comportamento">Comportamento</TabsTrigger>
          <TabsTrigger value="segmentos">Segmentos</TabsTrigger>
          <TabsTrigger value="churn">Risco de Churn</TabsTrigger>
        </TabsList>

        {/* ── ABA 0: Jornada de Entrada (nova) ── */}
        <TabsContent value="jornada" className="space-y-6">
          <JourneyTab analysis={journeyAnalysis} />
        </TabsContent>

        {/* ── ABA 1: Comportamento ── */}
        <TabsContent value="comportamento" className="space-y-8">
          {!comparisonMode && (
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="py-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 Todas as métricas nesta aba respeitam o <strong>período selecionado no filtro</strong>.
                  Churn e risco de perda estão na aba dedicada (histórico completo).
                </p>
              </CardContent>
            </Card>
          )}

          {!comparisonMode && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <Card className="md:col-span-3 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Clientes no Período
                      </p>
                      <p className="text-5xl font-bold mt-2">{totalClientes.toLocaleString("pt-BR")}</p>
                      <div className="flex gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          <span className="text-muted-foreground">
                            Novos: <strong>{clienteBreakdown.novos}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-muted-foreground">
                            Recorrentes: <strong>{clienteBreakdown.recorrentes}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Receita/Cliente</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(summaryMetrics.customerLifetimeValue)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        ~{summaryMetrics.averageDaysBetweenPurchases.toFixed(0)} dias entre compras
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatusMetricCard
                  title="Taxa Recompra"
                  value={`${summaryMetrics.taxaRecompra.toFixed(1)}%`}
                  icon={<RefreshCcw className="h-3.5 w-3.5" />}
                  status={getStatusFromBenchmark(summaryMetrics.taxaRecompra, sectorBenchmarks.taxaRecompra)}
                  interpretation={summaryMetrics.taxaRecompra >= sectorBenchmarks.taxaRecompra ? "Acima benchmark" : "Abaixo benchmark"}
                  size="compact"
                  tooltipKey="taxa_recompra"
                />
                <StatusMetricCard
                  title="Ticket Médio"
                  value={formatCurrency(summaryMetrics.ticketMedio)}
                  icon={<DollarSign className="h-3.5 w-3.5" />}
                  status="neutral"
                  interpretation="Receita / pedido"
                  size="compact"
                  tooltipKey="ticket_medio"
                />
                <StatusMetricCard
                  title="Receita/Cliente"
                  value={formatCurrency(summaryMetrics.customerLifetimeValue)}
                  icon={<DollarSign className="h-3.5 w-3.5" />}
                  status="success"
                  interpretation="No período"
                  size="compact"
                  tooltipKey="clv"
                />
                <StatusMetricCard
                  title="Total Pedidos"
                  value={summaryMetrics.totalOrders.toLocaleString("pt-BR")}
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  status="neutral"
                  interpretation="No período"
                  size="compact"
                  tooltipKey="total_pedidos"
                />
                <StatusMetricCard
                  title="Receita Total"
                  value={formatCurrency(summaryMetrics.totalRevenue)}
                  icon={<DollarSign className="h-3.5 w-3.5" />}
                  status="success"
                  interpretation="No período"
                  size="compact"
                  tooltipKey="receita_total"
                />
                <StatusMetricCard
                  title="Dias entre Compras"
                  value={summaryMetrics.averageDaysBetweenPurchases > 0 ? `${summaryMetrics.averageDaysBetweenPurchases.toFixed(0)}d` : "—"}
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  status="neutral"
                  interpretation="Média geral"
                  size="compact"
                  tooltipKey="dias_entre_compras"
                />
              </div>
            </div>
          )}

          {comparisonMode && comparisonMetrics && (
            <div className="space-y-4">
              <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <CardContent className="py-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Métricas de cliente (recompra, churn, segmentação) são históricas e não variam por mês. Apenas volume de pedidos é comparado.
                  </p>
                </CardContent>
              </Card>
              <div className="grid gap-6 md:grid-cols-2">
                <ComparisonMetricCard title="Volume de Pedidos" icon={TrendingUp} metrics={comparisonMetrics.volumePorMes} />
              </div>
            </div>
          )}

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <h2 className="text-xl font-semibold">Volume e Padrões</h2>
                <p className="text-sm text-muted-foreground">Evolução de pedidos e identificação de picos</p>
              </div>
            </div>

            <VolumeKPICards
              averageDaily={volumeAnalysis.averageDaily}
              peakDay={volumeAnalysis.peakDay}
              lowDay={volumeAnalysis.lowDay}
              trend={volumeTrend}
            />

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Evolução de Pedidos</CardTitle>
                    <CardDescription>Volume de pedidos ao longo do tempo</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {(["daily", "weekly", "monthly", "quarterly"] as const).map((view) => (
                      <button
                        key={view}
                        className={`px-4 py-2 rounded text-sm ${volumeView === view ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                        onClick={() => setVolumeView(view)}
                      >
                        {view === "daily" ? "Diário" : view === "weekly" ? "Semanal" : view === "monthly" ? "Mensal" : "Trimestre"}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <OrderVolumeChart
                  data={
                    volumeView === "daily" ? volumeAnalysisData?.daily || [] :
                    volumeView === "weekly" ? volumeAnalysisData?.weekly.map((w) => ({ date: w.week, orders: w.orders })) || [] :
                    volumeView === "quarterly" ? volumeAnalysisData?.quarterly.map((q) => ({ date: q.quarter, orders: q.orders })) || [] :
                    volumeAnalysisData?.monthly.map((m) => ({ date: m.month, orders: m.orders })) || []
                  }
                  viewMode={volumeView}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>⚡ Dias de Pico</CardTitle>
                <CardDescription>Top 20 dias com maior volume — destaque para picos acima da média + 2σ</CardDescription>
              </CardHeader>
              <CardContent>
                <SalesPeaksChart peaks={peaksData} />
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        {/* ── ABA 2: Segmentos ── */}
        <TabsContent value="segmentos" className="space-y-8">
          {segments.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-6 h-6" />
                  Segmentação de Clientes
                </CardTitle>
                <CardDescription>
                  Nenhum dado no período selecionado. Ajuste o filtro de datas ou carregue dados na página "Upload".
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="py-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 Segmentação calculada a partir dos <strong>pedidos no período selecionado</strong>.
                  </p>
                </CardContent>
              </Card>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição de Clientes</CardTitle>
                    <CardDescription>Segmentação por comportamento de compra</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CustomerSegmentationChart segments={segments} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Receita por Segmento</CardTitle>
                    <CardDescription>Contribuição de cada perfil para o faturamento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SegmentRevenueChart segments={segments} />
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Análise Detalhada por Segmento</CardTitle>
                  <CardDescription>Métricas completas de cada perfil de cliente</CardDescription>
                </CardHeader>
                <CardContent>
                  <SegmentDetailTable segments={segments} />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── ABA 3: Risco de Churn ── */}
        <TabsContent value="churn" className="space-y-6">
          {customerLoading ? (
            <div className="space-y-6">
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
              </div>
              <Skeleton className="h-80" />
            </div>
          ) : churnMetrics.totalClientes === 0 ? (
            <EmptyState
              icon={<FileWarning className="h-8 w-8 text-muted-foreground" />}
              title="Sem dados de clientes"
              description="Faça upload de dados de vendas para visualizar a análise de churn."
            />
          ) : (
            <>
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  📅 <strong>Período:</strong> Todo o histórico (fonte: banco de dados)
                </p>
              </div>

              <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                <KPITooltip metricKey="taxa_churn">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" /> Taxa de Churn
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">{taxaChurn.toFixed(1)}%</div>
                      <p className="text-xs text-muted-foreground mt-1">Clientes que pararam de comprar</p>
                    </CardContent>
                  </Card>
                </KPITooltip>

                <KPITooltip metricKey="clientes_ativos">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <Users className="h-4 w-4" /> Clientes Ativos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{clientesAtivos.toLocaleString("pt-BR")}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {totalClientesHistorico > 0 ? ((clientesAtivos / totalClientesHistorico) * 100).toFixed(1) : 0}% da base
                      </p>
                    </CardContent>
                  </Card>
                </KPITooltip>

                <KPITooltip metricKey="clientes_em_risco">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Em Risco
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-600">{clientesEmRisco.toLocaleString("pt-BR")}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {totalClientesHistorico > 0 ? ((clientesEmRisco / totalClientesHistorico) * 100).toFixed(1) : 0}% da base
                      </p>
                    </CardContent>
                  </Card>
                </KPITooltip>

                <KPITooltip metricKey="clientes_inativos">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <UserMinus className="h-4 w-4" /> Inativos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">{clientesInativos.toLocaleString("pt-BR")}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {totalClientesHistorico > 0 ? ((clientesInativos / totalClientesHistorico) * 100).toFixed(1) : 0}% da base
                      </p>
                    </CardContent>
                  </Card>
                </KPITooltip>

                <KPITooltip metricKey="valor_em_risco">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" /> Valor em Risco
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        R$ {valorEmRisco.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Receita potencial perdida</p>
                    </CardContent>
                  </Card>
                </KPITooltip>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Funil de Retenção
                  </CardTitle>
                  <CardDescription>Distribuição de clientes por status de atividade</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ChurnFunnelChart
                    ativos={clientesAtivos}
                    emRisco={clientesEmRisco}
                    inativos={clientesInativos}
                    churn={clientesChurn}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" /> Clientes em Risco de Churn
                  </CardTitle>
                  <CardDescription>Lista de clientes que podem abandonar a marca</CardDescription>
                </CardHeader>
                <CardContent>
                  {churnRiskCustomers.length > 0 ? (
                    <ChurnRiskTable customers={churnRiskCustomers} />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum cliente em risco identificado.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
