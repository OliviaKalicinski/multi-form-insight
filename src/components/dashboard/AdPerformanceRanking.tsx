import { useMemo } from "react";
import { AdsData } from "@/types/marketing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  ads: AdsData[];
  objective: string;
}

const parseValue = (v: string | number | undefined | null): number => {
  if (!v) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const cleaned = String(v)
    .replace(/[^\d.,-]/g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const getAdScore = (ad: AdsData, isSales: boolean) => {
  const spend = parseValue(ad["Valor usado (BRL)"]);
  const revenue = parseValue(ad["Valor de conversão da compra"]);
  const clicks = parseValue(ad["Cliques (todos)"]) || parseValue(ad["Cliques no link"]);
  const impressions = parseValue(ad["Impressões"]);
  const results = parseValue(ad["Compras"]) || parseValue(ad["Resultados"]);

  if (spend < 50) return null;

  const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;

  return {
    name: ad["Nome do anúncio"] || "—",
    conjunto: ad.conjunto || ad["Nome do conjunto de anúncios"] || "",
    spend,
    revenue,
    roas,
    ctr,
    cpc,
    results,
    score: isSales ? roas : cpc > 0 ? 1 / cpc : 0,
  };
};

export const AdPerformanceRanking = ({ ads, objective }: Props) => {
  const isSales = objective === "OUTCOME_SALES" || !objective;

  const ranked = useMemo(() => {
    // Agrupa linhas diárias pelo ad_id (ou nome do anúncio como fallback)
    // para calcular ROAS com spend e revenue acumulados do período
    const aggregated = new Map<
      string,
      {
        spend: number;
        revenue: number;
        clicks: number;
        impressions: number;
        results: number;
        name: string;
        conjunto: string;
      }
    >();
    for (const ad of ads) {
      const key = ad.ad_id || ad["Nome do anúncio"] || "unknown";
      const spend = parseValue(ad["Valor usado (BRL)"]);
      const revenue = parseValue(ad["Valor de conversão da compra"]);
      const clicks = parseValue(ad["Cliques (todos)"]) || parseValue(ad["Cliques no link"]);
      const impressions = parseValue(ad["Impressões"]);
      const results = parseValue(ad["Compras"]) || parseValue(ad["Resultados"]);
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          spend: 0,
          revenue: 0,
          clicks: 0,
          impressions: 0,
          results: 0,
          name: ad["Nome do anúncio"] || "—",
          conjunto: ad.conjunto || ad["Nome do conjunto de anúncios"] || "",
        });
      }
      const entry = aggregated.get(key)!;
      entry.spend += spend;
      entry.revenue += revenue;
      entry.clicks += clicks;
      entry.impressions += impressions;
      entry.results += results;
    }

    const scored = Array.from(aggregated.values())
      .filter((a) => a.spend >= 50)
      .map((a) => {
        const roas = a.spend > 0 && a.revenue > 0 ? a.revenue / a.spend : 0;
        const ctr = a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0;
        const cpc = a.clicks > 0 ? a.spend / a.clicks : 0;
        return {
          name: a.name,
          conjunto: a.conjunto,
          spend: a.spend,
          revenue: a.revenue,
          roas,
          ctr,
          cpc,
          results: a.results,
          score: isSales ? roas : cpc > 0 ? 1 / cpc : 0,
        };
      })
      .filter((a) => a.score > 0);

    scored.sort((a, b) => b.score - a.score);

    const top = scored.slice(0, 3);
    const bottom = scored.length > 3 ? scored.slice(-3).reverse() : [];
    const totalSpend = scored.reduce((s, a) => s + a.spend, 0);
    const topSpend = top.reduce((s, a) => s + a.spend, 0);
    const topSpendPct = totalSpend > 0 ? (topSpend / totalSpend) * 100 : 0;
    const topRoasAvg = top.length > 0 ? top.reduce((s, a) => s + a.roas, 0) / top.length : 0;

    return { top, bottom, topSpendPct, topRoasAvg, total: scored.length };
  }, [ads, isSales]);

  if (ranked.total === 0) return null;

  const AdRow = ({
    ad,
    rank,
    variant,
  }: {
    ad: NonNullable<ReturnType<typeof getAdScore>>;
    rank: number;
    variant: "top" | "bottom";
  }) => {
    const isTop = variant === "top";
    return (
      <div
        className={cn("flex items-center gap-3 py-2.5 px-3 rounded-lg", isTop ? "bg-emerald-50/60" : "bg-red-50/40")}
      >
        {/* Rank */}
        <span className={cn("text-xs font-bold w-5 text-center shrink-0", isTop ? "text-emerald-600" : "text-red-400")}>
          {isTop ? rank : "↓"}
        </span>

        {/* Nome */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate leading-tight">{ad.name}</p>
          {ad.conjunto && <p className="text-[10px] text-muted-foreground truncate">{ad.conjunto}</p>}
        </div>

        {/* Métricas */}
        <div className="flex items-center gap-4 shrink-0 text-right">
          {isSales && (
            <div>
              <p className={cn("text-xs font-semibold", isTop ? "text-emerald-700" : "text-red-500")}>
                {ad.roas > 0 ? `${ad.roas.toFixed(2)}x` : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">ROAS</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium">{fmt(ad.spend)}</p>
            <p className="text-[10px] text-muted-foreground">gasto</p>
          </div>
          {isSales && ad.revenue > 0 && (
            <div>
              <p className="text-xs font-medium">{fmt(ad.revenue)}</p>
              <p className="text-[10px] text-muted-foreground">receita</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Medal className="h-4 w-4" />
            Performance por Criativo
          </CardTitle>
          {isSales && ranked.top.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Top {ranked.top.length} concentram{" "}
              <span className="font-semibold text-foreground">{ranked.topSpendPct.toFixed(0)}%</span> do gasto
              {ranked.topRoasAvg > 0 && (
                <>
                  {" "}
                  · ROAS médio <span className="font-semibold text-foreground">{ranked.topRoasAvg.toFixed(2)}x</span>
                </>
              )}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top performers */}
        <div>
          <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Escalar
          </p>
          <div className="space-y-1">
            {ranked.top.map((ad, i) => (
              <AdRow key={i} ad={ad} rank={i + 1} variant="top" />
            ))}
          </div>
        </div>

        {/* Bottom performers */}
        {ranked.bottom.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Revisar / Pausar
            </p>
            <div className="space-y-1">
              {ranked.bottom.map((ad, i) => (
                <AdRow key={i} ad={ad} rank={ranked.total - i} variant="bottom" />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
