import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Medal, TrendingUp, AlertTriangle, Wrench, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdsData } from "@/types/marketing";
import { parseAdsValue } from "@/utils/adsCalculator";
import { getAdObjective } from "@/utils/adsParserV2";

interface Props {
  ads: AdsData[];
  objective: string;
}

// Thresholds operacionais alinhados ao CLAUDE.md (meta ROAS 3x).
const CTR_HIGH = 1.5; // Mediana saudável Meta Ads.
const ROAS_HIGH = 3.0;
const MIN_SPEND = 50; // Filtro inicial (estatística mínima).
const MIN_SPEND_PAUSE = 200; // Spend mínimo pra recomendar pausa.
const MAX_PER_QUADRANT = 5;

type Quadrant = "ESCALAR" | "OTIMIZAR" | "REFINAR" | "REVISAR";

const QUADRANT_META: Record<
  Quadrant,
  { label: string; emoji: string; icon: typeof TrendingUp; color: string; bg: string; border: string; text: string; advice: string }
> = {
  ESCALAR: {
    label: "Escalar",
    emoji: "🚀",
    icon: TrendingUp,
    color: "emerald",
    bg: "bg-emerald-50/60",
    border: "border-emerald-200",
    text: "text-emerald-700",
    advice: "Performance comprovada. Aumente verba, expanda público, teste novos formatos.",
  },
  OTIMIZAR: {
    label: "Otimizar Funil",
    emoji: "⚙️",
    icon: Wrench,
    color: "amber",
    bg: "bg-amber-50/60",
    border: "border-amber-200",
    text: "text-amber-700",
    advice: "Tráfego barato, mas conversão fraca. Atacar oferta, landing page, checkout, ticket médio.",
  },
  REFINAR: {
    label: "Refinar Criativos",
    emoji: "🎨",
    icon: Palette,
    color: "blue",
    bg: "bg-blue-50/60",
    border: "border-blue-200",
    text: "text-blue-700",
    advice: "Tráfego qualificado mas escasso. Reforçar copy, headline, hook, gancho visual.",
  },
  REVISAR: {
    label: "Revisar / Pausar",
    emoji: "⛔",
    icon: AlertTriangle,
    color: "red",
    bg: "bg-red-50/40",
    border: "border-red-200",
    text: "text-red-600",
    advice: "Subperformance dupla. Pausar, repensar oferta + público, testar nova hipótese.",
  },
};

// Cores hex p/ scatter chart (não pode usar Tailwind dinâmico).
const QUADRANT_HEX: Record<Quadrant, string> = {
  ESCALAR: "#10b981",
  OTIMIZAR: "#f59e0b",
  REFINAR: "#3b82f6",
  REVISAR: "#ef4444",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const parseValue = (v: string | number | undefined | null): number => {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  return parseAdsValue(String(v));
};

interface AggregatedAd {
  key: string;
  name: string;
  conjunto: string;
  spend: number;
  revenue: number;
  clicks: number;
  impressions: number;
  ctr: number;
  roas: number;
  isVendas: boolean;
  quadrant: Quadrant;
}

function classifyQuadrant(ad: { ctr: number; roas: number; isVendas: boolean }): Quadrant {
  const ctrHigh = ad.ctr >= CTR_HIGH;
  if (ad.isVendas) {
    const roasHigh = ad.roas >= ROAS_HIGH;
    if (ctrHigh && roasHigh) return "ESCALAR";
    if (ctrHigh && !roasHigh) return "OTIMIZAR";
    if (!ctrHigh && roasHigh) return "REFINAR";
    return "REVISAR";
  }
  // Opção C: ads non-Sales (sem ROAS válido). CTR alto = Refinar; senão = Revisar.
  return ctrHigh ? "REFINAR" : "REVISAR";
}

export const AdStrategicMatrix = ({ ads }: Props) => {
  const { aggregated, byQuadrant, totals } = useMemo(() => {
    // 1. Agregar por ad_id (linhas do banco são ad×dia).
    const buckets = new Map<
      string,
      {
        spend: number;
        revenue: number;
        clicks: number;
        impressions: number;
        name: string;
        conjunto: string;
        isVendas: boolean;
      }
    >();
    for (const ad of ads) {
      const key = (ad as any).ad_id || `${ad["Nome do anúncio"] || ""}::${ad.conjunto || ""}`;
      const spend = parseValue(ad["Valor usado (BRL)"]);
      const revenue = parseValue(ad["Valor de conversão da compra"]);
      const clicks = parseValue(ad["Cliques (todos)"]) || parseValue(ad["Cliques no link"]);
      const impressions = parseValue(ad["Impressões"]);
      const isVendas = getAdObjective(ad) === "VENDAS";
      if (!buckets.has(key)) {
        buckets.set(key, {
          spend: 0,
          revenue: 0,
          clicks: 0,
          impressions: 0,
          name: ad["Nome do anúncio"] || "—",
          conjunto: ad.conjunto || ad["Nome do conjunto de anúncios"] || "",
          isVendas,
        });
      }
      const e = buckets.get(key)!;
      e.spend += spend;
      e.revenue += revenue;
      e.clicks += clicks;
      e.impressions += impressions;
    }

    const aggregated: AggregatedAd[] = [];
    for (const [key, b] of buckets) {
      if (b.spend < MIN_SPEND) continue;
      const ctr = b.impressions > 0 ? (b.clicks / b.impressions) * 100 : 0;
      const roas = b.spend > 0 && b.revenue > 0 ? b.revenue / b.spend : 0;
      const meta = { ctr, roas, isVendas: b.isVendas };
      const quadrant = classifyQuadrant(meta);
      aggregated.push({
        key,
        name: b.name,
        conjunto: b.conjunto,
        spend: b.spend,
        revenue: b.revenue,
        clicks: b.clicks,
        impressions: b.impressions,
        ctr,
        roas,
        isVendas: b.isVendas,
        quadrant,
      });
    }

    // 2. Agrupar por quadrante (ordenado por gasto desc dentro de cada).
    const byQuadrant: Record<Quadrant, AggregatedAd[]> = {
      ESCALAR: [],
      OTIMIZAR: [],
      REFINAR: [],
      REVISAR: [],
    };
    for (const a of aggregated) byQuadrant[a.quadrant].push(a);
    for (const q of Object.keys(byQuadrant) as Quadrant[]) {
      byQuadrant[q].sort((x, y) => y.spend - x.spend);
    }
    // Bottom (REVISAR) exige spend mínimo maior pra evitar pausar criativo de teste.
    byQuadrant.REVISAR = byQuadrant.REVISAR.filter((a) => a.spend >= MIN_SPEND_PAUSE);

    // 3. Totais agregados.
    const totalSpend = aggregated.reduce((s, a) => s + a.spend, 0);
    const totals = {
      count: aggregated.length,
      spend: totalSpend,
      vendasCount: aggregated.filter((a) => a.isVendas).length,
      outrosCount: aggregated.filter((a) => !a.isVendas).length,
      pctByQuadrant: Object.fromEntries(
        (Object.keys(byQuadrant) as Quadrant[]).map((q) => {
          const sum = byQuadrant[q].reduce((s, a) => s + a.spend, 0);
          return [q, totalSpend > 0 ? (sum / totalSpend) * 100 : 0];
        }),
      ) as Record<Quadrant, number>,
    };

    return { aggregated, byQuadrant, totals };
  }, [ads]);

  if (aggregated.length === 0) return null;

  // Pontos do scatter — só ads Vendas (que tem ROAS real).
  // Ads non-Sales aparecem apenas na listagem.
  const scatterData = aggregated.filter((a) => a.isVendas);

  // Y-axis dinâmico: até max(roas máximo, 6) pra dar espaço acima da linha 3x.
  const maxRoas = Math.max(...scatterData.map((a) => a.roas), 6);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Medal className="h-4 w-4" />
              Performance por Criativo
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totals.count} anúncios analisados · {fmt(totals.spend)} investidos · {totals.vendasCount} Vendas + {totals.outrosCount} Outros
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] flex-wrap">
            {(["ESCALAR", "OTIMIZAR", "REFINAR", "REVISAR"] as Quadrant[]).map((q) => (
              <div key={q} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: QUADRANT_HEX[q] }}
                />
                <span className="text-muted-foreground">
                  {QUADRANT_META[q].label}{" "}
                  <span className="font-semibold text-foreground">
                    {totals.pctByQuadrant[q].toFixed(0)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* SCATTER 2x2 — só Vendas */}
        {scatterData.length > 0 && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-2">
              Cada ponto é um anúncio Vendas. Tamanho = investimento. Linhas tracejadas = thresholds (CTR 1,5% · ROAS 3x).
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted) / 0.3)" />
                <XAxis
                  type="number"
                  dataKey="ctr"
                  name="CTR"
                  unit="%"
                  domain={[0, "auto"]}
                  tick={{ fontSize: 11 }}
                  label={{ value: "CTR (%)", position: "insideBottom", offset: -10, fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="roas"
                  name="ROAS"
                  unit="x"
                  domain={[0, Math.ceil(maxRoas)]}
                  tick={{ fontSize: 11 }}
                  label={{ value: "ROAS (x)", angle: -90, position: "insideLeft", fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="spend" range={[40, 400]} name="Gasto" />
                <ReferenceLine x={CTR_HIGH} stroke="hsl(var(--muted-foreground) / 0.5)" strokeDasharray="4 4" />
                <ReferenceLine y={ROAS_HIGH} stroke="hsl(var(--muted-foreground) / 0.5)" strokeDasharray="4 4" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as AggregatedAd;
                    return (
                      <div className="bg-background border rounded-md p-2 shadow-sm text-xs">
                        <p className="font-semibold leading-tight">{d.name}</p>
                        {d.conjunto && <p className="text-[10px] text-muted-foreground">{d.conjunto}</p>}
                        <div className="mt-1.5 space-y-0.5">
                          <p>
                            <span className="text-muted-foreground">CTR:</span> {d.ctr.toFixed(2)}%
                          </p>
                          <p>
                            <span className="text-muted-foreground">ROAS:</span> {d.roas.toFixed(2)}x
                          </p>
                          <p>
                            <span className="text-muted-foreground">Gasto:</span> {fmt(d.spend)}
                          </p>
                          <p
                            className="font-semibold mt-1"
                            style={{ color: QUADRANT_HEX[d.quadrant] }}
                          >
                            {QUADRANT_META[d.quadrant].emoji} {QUADRANT_META[d.quadrant].label}
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData}>
                  {scatterData.map((entry, i) => (
                    <Cell key={i} fill={QUADRANT_HEX[entry.quadrant]} fillOpacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* LISTAGENS por quadrante */}
        <div className="space-y-3">
          {(["ESCALAR", "OTIMIZAR", "REFINAR", "REVISAR"] as Quadrant[]).map((q) => {
            const items = byQuadrant[q].slice(0, MAX_PER_QUADRANT);
            if (items.length === 0) return null;
            const meta = QUADRANT_META[q];
            const Icon = meta.icon;
            return (
              <div key={q} className="space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-[11px] font-bold uppercase tracking-wide flex items-center gap-1", meta.text)}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {byQuadrant[q].length} {byQuadrant[q].length === 1 ? "anúncio" : "anúncios"} ·{" "}
                    {totals.pctByQuadrant[q].toFixed(0)}% do gasto
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground italic">{meta.advice}</p>
                <div className="space-y-1">
                  {items.map((ad, i) => (
                    <div
                      key={ad.key}
                      className={cn("flex items-center gap-3 py-2 px-3 rounded-lg border", meta.bg, meta.border)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate leading-tight">{ad.name}</p>
                        {ad.conjunto && <p className="text-[10px] text-muted-foreground truncate">{ad.conjunto}</p>}
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          <p className={cn("text-xs font-medium", ad.ctr >= CTR_HIGH ? "text-emerald-700" : "text-muted-foreground")}>
                            {ad.ctr > 0 ? `${ad.ctr.toFixed(2)}%` : "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">CTR</p>
                        </div>
                        <div>
                          <p
                            className={cn(
                              "text-xs font-semibold",
                              ad.roas >= ROAS_HIGH
                                ? "text-emerald-700"
                                : ad.roas > 0
                                  ? "text-red-500"
                                  : "text-muted-foreground",
                            )}
                          >
                            {ad.roas > 0 ? `${ad.roas.toFixed(2)}x` : "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">ROAS</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">{fmt(ad.spend)}</p>
                          <p className="text-[10px] text-muted-foreground">gasto</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {byQuadrant[q].length > MAX_PER_QUADRANT && (
                    <p className="text-[10px] text-muted-foreground italic px-3">
                      + {byQuadrant[q].length - MAX_PER_QUADRANT} outros — veja "Detalhamento por Anúncio" abaixo
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
