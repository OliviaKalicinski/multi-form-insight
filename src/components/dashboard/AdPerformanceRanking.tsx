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
  const cleaned = String(v).replace(/[^\d.,-]/g, "").replace(",", ".");
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

  if (spend < 5) return null;

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
    score: isSales ? roas : (cpc > 0 ? 1 / cpc : 0),
  };
};

export const AdPerformanceRanking = ({ ads, objective }: Props) => {
  const isSales = objective === "OUTCOME_SALES" || !objective;

  const ranked = useMemo(() => {
    const scored = ads
      .map((ad) => getAdScore(ad, isSales))
      .filter(Boolean)
      .filter((a) => a!.score > 0) as NonNullable<ReturnType<typeof getAdScore>>[];

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
      <div className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        isTop ? "bg-emerald-50/50 border-emerald-100" : "bg-orange-50/50 border-orange-100"
      )}>
        {/* Rank */}
        <div className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
          isTop ? "bg-emerald-200 text-emerald-800" : "bg-orange-200 text-orange-800"
        )}>
          {isTop ? rank : "↓"}
        </div>

        {/* Nome */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {ad.name}
          </p>
          {ad.conjunto && (
            <p className="text-xs text-muted-foreground truncate">
              {ad.conjunto}
            </p>
          )}
        </div>

        {/* Métricas */}
        <div className="flex-shrink-0 text-right space-y-1">
          {isSales && (
            <div>
              <p className={cn("text-sm font-bold", ad.roas > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                {ad.roas > 0 ? `${ad.roas.toFixed(2)}x` : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">ROAS</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{fmt(ad.spend)}</p>
            <p className="text-[10px] text-muted-foreground">gasto</p>
          </div>
          {isSales && ad.revenue > 0 && (
            <div>
              <p className="text-sm font-medium">{fmt(ad.revenue)}</p>
              <p className="text-[10px] text-muted-foreground">receita</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Medal className="h-4 w-4 text-muted-foreground" />
            Performance por Criativo
          </CardTitle>
          {isSales && ranked.top.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Top {ranked.top.length} concentram{" "}
              {ranked.topSpendPct.toFixed(0)}% do gasto
              {ranked.topRoasAvg > 0 && (
                <> · ROAS médio {ranked.topRoasAvg.toFixed(2)}x</>
              )}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top performers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">Escalar</span>
          </div>
          <div className="space-y-2">
            {ranked.top.map((ad, i) => (
              <AdRow key={`top-${i}`} ad={ad} rank={i + 1} variant="top" />
            ))}
          </div>
        </div>

        {/* Bottom performers */}
        {ranked.bottom.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-700">Revisar / Pausar</span>
            </div>
            <div className="space-y-2">
              {ranked.bottom.map((ad, i) => (
                <AdRow key={`bottom-${i}`} ad={ad} rank={ranked.bottom.length - i} variant="bottom" />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
