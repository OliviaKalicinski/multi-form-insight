import { useMemo } from "react";
import { AdsData } from "@/types/marketing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface Props {
  ads: AdsData[];
  objective: string;
}

const parseValue = (v: string | number | undefined | null): number => {
  if (!v) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const cleaned = String(v).replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtN = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const RANKING_LABEL: Record<string, { label: string; color: string }> = {
  ABOVE_AVERAGE: { label: "Acima da média", color: "bg-emerald-100 text-emerald-800" },
  AVERAGE: { label: "Na média", color: "bg-blue-100 text-blue-800" },
  BELOW_AVERAGE_10: { label: "Abaixo 10%", color: "bg-orange-100 text-orange-800" },
  BELOW_AVERAGE_20: { label: "Abaixo 20%", color: "bg-red-100 text-red-800" },
  BELOW_AVERAGE_35: { label: "Abaixo 35%", color: "bg-red-200 text-red-900" },
};

function RankingBadge({ value, label }: { value?: string; label: string }) {
  if (!value) return null;
  const info = RANKING_LABEL[value] || { label: value, color: "bg-gray-100 text-gray-700" };
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${info.color}`}>
        {info.label}
      </span>
    </div>
  );
}

interface AdRow {
  name: string;
  investment: number;
  revenue: number;
  roas: number;
  ctr: number;
  purchases: number;
  viewContent: number;
  addToCart: number;
  checkout: number;
  quality: string | undefined;
  engagement: string | undefined;
  conversion: string | undefined;
  hookRate: number | null;
  videoP100: number;
  impressions: number;
}

function FunnelMini({ row }: { row: AdRow }) {
  const steps = [
    { label: "View", value: row.viewContent },
    { label: "Cart", value: row.addToCart },
    { label: "Check", value: row.checkout },
    { label: "Compra", value: row.purchases },
  ].filter(s => s.value > 0);

  if (steps.length < 2) return null;

  const max = steps[0].value || 1;

  return (
    <div className="flex items-end gap-1 mt-2">
      {steps.map((s, i) => {
        const h = Math.max((s.value / max) * 100, 8);
        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className="w-6 bg-primary/20 rounded-sm"
              style={{ height: `${h * 0.4}px` }}
            />
            <span className="text-[9px] text-muted-foreground">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function AdCard({ row, rank, type }: { row: AdRow; rank: number; type: "top" | "bottom" }) {
  const isTop = type === "top";
  return (
    <div className={`p-3 rounded-lg border ${isTop ? "border-emerald-200 bg-emerald-50/50" : "border-orange-200 bg-orange-50/50"}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isTop ? "bg-emerald-200 text-emerald-800" : "bg-orange-200 text-orange-800"}`}>
            {rank}
          </span>
          <span className="text-sm font-medium truncate">
            {row.name}
          </span>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`text-lg font-bold ${isTop ? "text-emerald-700" : "text-orange-700"}`}>
            {row.roas > 0 ? `${row.roas.toFixed(2)}x` : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">ROAS</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground">Gasto</div>
          <div className="font-medium">{fmt(row.investment)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Receita</div>
          <div className="font-medium">{fmt(row.revenue)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">CTR</div>
          <div className="font-medium">{fmtPct(row.ctr)}</div>
        </div>
      </div>

      {/* Rankings Meta */}
      {(row.quality || row.engagement || row.conversion) && (
        <div className="flex flex-wrap gap-2 mt-2">
          <RankingBadge value={row.quality} label="Qualidade" />
          <RankingBadge value={row.engagement} label="Engajamento" />
          <RankingBadge value={row.conversion} label="Conversão" />
        </div>
      )}

      {/* Hook rate e retenção de vídeo */}
      {row.hookRate !== null && row.hookRate > 0 && (
        <div className="flex gap-3 mt-2 text-xs">
          <div>
            <span className="text-muted-foreground">Hook rate: </span>
            <span className="font-medium">{fmtPct(row.hookRate)}</span>
          </div>
          {row.videoP100 > 0 && row.impressions > 0 && (
            <div>
              <span className="text-muted-foreground">100% vídeo: </span>
              <span className="font-medium">{fmtPct((row.videoP100 / row.impressions) * 100)}</span>
            </div>
          )}
        </div>
      )}

      {/* Funil mini */}
      <FunnelMini row={row} />
    </div>
  );
}

export function AdPerformanceRanking({ ads, objective }: Props) {
  const isSales = objective === "OUTCOME_SALES" || !objective;

  const adRows: AdRow[] = useMemo(() => {
    return ads
      .map(ad => {
        const investment = parseValue(ad["Valor usado (BRL)"]);
        if (investment < 10) return null;
        const revenue = parseValue(ad["Valor de conversão da compra"]);
        const impressions = parseValue(ad["Impressões"]);
        const clicks = parseValue(ad["Cliques (todos)"]);
        const ctrCsv = parseValue(ad["CTR (todos)"]);
        const roasCsv = parseValue(ad["ROAS de resultados"]);

        const ctr = ctrCsv > 0 ? ctrCsv : impressions > 0 ? (clicks / impressions) * 100 : 0;
        const roas = roasCsv > 0 ? roasCsv : investment > 0 && revenue > 0 ? revenue / investment : 0;

        return {
          name: ad["Nome do anúncio"] || "—",
          investment,
          revenue,
          roas,
          ctr,
          purchases: (ad.purchases ?? parseValue(ad["Compras"])) || 0,
          viewContent: ad.view_content ?? 0,
          addToCart: (ad.add_to_cart ?? parseValue(ad["Adições ao carrinho"])) || 0,
          checkout: ad.initiate_checkout ?? 0,
          quality: ad.quality_ranking,
          engagement: ad.engagement_rate_ranking,
          conversion: ad.conversion_rate_ranking,
          hookRate: ad.hook_rate ?? null,
          videoP100: ad.video_p100_watched ?? 0,
          impressions,
        } as AdRow;
      })
      .filter(Boolean) as AdRow[];
  }, [ads]);

  const sorted = useMemo(() => {
    if (!isSales) return [...adRows].sort((a, b) => b.ctr - a.ctr);
    return [...adRows].sort((a, b) => b.roas - a.roas);
  }, [adRows, isSales]);

  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.filter(r => isSales ? r.roas > 0 : r.ctr > 0).slice(-3).reverse();

  // Insight textual
  const insight = useMemo(() => {
    if (!top3.length) return null;
    const total = adRows.reduce((s, r) => s + r.investment, 0);
    const top3spend = top3.reduce((s, r) => s + r.investment, 0);
    const pct = total > 0 ? (top3spend / total) * 100 : 0;
    const avgRoas = top3.reduce((s, r) => s + r.roas, 0) / top3.length;
    return {
      pct: pct.toFixed(0),
      avgRoas: avgRoas.toFixed(2),
      count: top3.length,
      total: adRows.length,
    };
  }, [top3, adRows]);

  if (!adRows.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base flex items-center gap-2">
            🏆 Performance por Anúncio
          </CardTitle>
          {insight && (
            <p className="text-xs text-muted-foreground">
              Top {insight.count} concentram {insight.pct}% do gasto · ROAS médio {insight.avgRoas}x
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top performers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">Melhores performers</span>
              <Badge variant="secondary" className="text-[10px]">Escalar</Badge>
            </div>
            {top3.map((row, i) => (
              <AdCard key={row.name} row={row} rank={i + 1} type="top" />
            ))}
          </div>

          {/* Bottom performers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-700">Precisam de atenção</span>
              <Badge variant="secondary" className="text-[10px]">Revisar / Pausar</Badge>
            </div>
            {bottom3.length > 0 ? (
              bottom3.map((row, i) => (
                <AdCard key={row.name} row={row} rank={i + 1} type="bottom" />
              ))
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                <AlertTriangle className="h-4 w-4" />
                Dados insuficientes para identificar underperformers
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
