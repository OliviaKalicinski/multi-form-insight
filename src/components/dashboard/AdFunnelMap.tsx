import { useMemo } from "react";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdsData } from "@/types/marketing";
import {
  buildAdFunnelMap,
  FUNNEL_ROLE_ORDER,
  getRoleMeta,
  type AdFunnelEntry,
  type FunnelRole,
  type FunnelMapResult,
} from "@/utils/adFormatClassifier";
import { cn } from "@/lib/utils";

interface AdFunnelMapProps {
  adsData: AdsData[];
}

const ROLE_BG: Record<FunnelRole, string> = {
  conversor: "bg-green-50 border-green-200",
  isca_atencao: "bg-yellow-50 border-yellow-200",
  conversor_silencioso: "bg-blue-50 border-blue-200",
  ineficiente: "bg-red-50 border-red-200",
};

const ROLE_TEXT: Record<FunnelRole, string> = {
  conversor: "text-green-700",
  isca_atencao: "text-yellow-700",
  conversor_silencioso: "text-blue-700",
  ineficiente: "text-red-700",
};

const ROLE_BADGE_VARIANT: Record<FunnelRole, "default" | "secondary" | "destructive" | "outline"> = {
  conversor: "default",
  isca_atencao: "secondary",
  conversor_silencioso: "outline",
  ineficiente: "destructive",
};

const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPercent = (v: number) => `${v.toFixed(2)}%`;
const formatRoas = (v: number) => `${v.toFixed(2)}x`;

export const AdFunnelMap = ({ adsData }: AdFunnelMapProps) => {
  const result = useMemo(() => buildAdFunnelMap(adsData), [adsData]);
  const { entries, diagnostics } = result;

  const grouped = useMemo(() => {
    const map = new Map<FunnelRole, AdFunnelEntry[]>();
    for (const role of FUNNEL_ROLE_ORDER) {
      map.set(role, entries.filter((e) => e.funnelRole === role));
    }
    return map;
  }, [entries]);

  const totalSpend = useMemo(() => entries.reduce((s, e) => s + e.spend, 0), [entries]);

  if (entries.length === 0) return null;

  const showDiagBanner = diagnostics.excludedBySpend > 0 || diagnostics.uniqueAds < diagnostics.totalRows;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Mapa CTR × ROAS × Intenção de Criativo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contrato semântico */}
        <div className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p className="text-sm text-slate-600">
            Este mapa classifica anúncios por função estratégica no funil, não por qualidade,
            sucesso ou fracasso. Um anúncio classificado como "Isca de Atenção" pode ser
            essencial para o desempenho geral, mesmo com ROAS baixo.
          </p>
        </div>

        {/* Banner de transparência */}
        {showDiagBanner && (
          <p className="text-xs text-slate-500">
            Exibindo {entries.length} anúncio{entries.length !== 1 ? "s" : ""}
            {diagnostics.uniqueAds < diagnostics.totalRows && (
              <span> ({diagnostics.totalRows} linhas agrupadas por nome)</span>
            )}
            {diagnostics.excludedBySpend > 0 && (
              <span>
                . {diagnostics.excludedBySpend} não exibido{diagnostics.excludedBySpend > 1 ? "s" : ""} por gasto {"<"} R$10
                {" "}(total: {formatCurrency(diagnostics.excludedSpendTotal)})
              </span>
            )}
          </p>
        )}

        {/* Resumo por quadrante */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FUNNEL_ROLE_ORDER.map((role) => {
            const items = grouped.get(role) || [];
            const spend = items.reduce((s, e) => s + e.spend, 0);
            const pct = totalSpend > 0 ? (spend / totalSpend) * 100 : 0;
            const meta = getRoleMeta(role);
            return (
              <div
                key={role}
                className={cn("rounded-md border p-3 space-y-1", ROLE_BG[role])}
              >
                <p className={cn("text-sm font-semibold", ROLE_TEXT[role])}>
                  {meta.label}
                </p>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-lg font-bold">{items.length}</span>
                  <span className="text-xs text-muted-foreground">anúncios</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(spend)} · {pct.toFixed(0)}% do orçamento
                </p>
              </div>
            );
          })}
        </div>

        {/* Tabela detalhada agrupada */}
        {FUNNEL_ROLE_ORDER.map((role) => {
          const items = grouped.get(role) || [];
          if (items.length === 0) return null;
          const meta = getRoleMeta(role);

          // Insight de formato
          const videos = items.filter((i) => i.format === "video");
          const statics = items.filter((i) => i.format === "static");
          const unknowns = items.filter((i) => i.format === "unknown");

          return (
            <div key={role} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={ROLE_BADGE_VARIANT[role]}>{meta.label}</Badge>
                <span className="text-xs text-muted-foreground">
                  {items.length} anúncio{items.length > 1 ? "s" : ""}
                </span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anúncio</TableHead>
                    <TableHead className="w-24">Formato</TableHead>
                    <TableHead className="w-20 text-right">CTR</TableHead>
                    <TableHead className="w-20 text-right">ROAS</TableHead>
                    <TableHead className="w-28 text-right">Gasto</TableHead>
                    <TableHead className="w-20 text-right">Compras</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((entry) => (
                    <TableRow key={entry.adName}>
                      <TableCell className="font-medium text-sm max-w-[280px] truncate">
                        {entry.adName}
                      </TableCell>
                      <TableCell className="text-xs">{entry.formatLabel}</TableCell>
                      <TableCell className="text-right text-sm">
                        {formatPercent(entry.ctr)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatRoas(entry.roas)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(entry.spend)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {entry.purchases.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Insight de formato por quadrante */}
              {(videos.length > 0 || statics.length > 0) && (
                <p className="text-xs text-muted-foreground pl-1">
                  {videos.length > 0 && (
                    <span>
                      {videos.length} vídeo{videos.length > 1 ? "s" : ""} ({formatCurrency(videos.reduce((s, v) => s + v.spend, 0))})
                    </span>
                  )}
                  {videos.length > 0 && statics.length > 0 && <span> · </span>}
                  {statics.length > 0 && (
                    <span>
                      {statics.length} estático{statics.length > 1 ? "s" : ""} ({formatCurrency(statics.reduce((s, v) => s + v.spend, 0))})
                    </span>
                  )}
                  {unknowns.length > 0 && (
                    <span>
                      {" "}· {unknowns.length} indefinido{unknowns.length > 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              )}
            </div>
          );
        })}

        {/* Disclaimer de inferência */}
        <Separator />
        <p className="text-xs text-slate-400">
          A classificação de formato (vídeo/estático) é baseada apenas no nome do anúncio e pode
          conter imprecisões.
        </p>
      </CardContent>
    </Card>
  );
};
