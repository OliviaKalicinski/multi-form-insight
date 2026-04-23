import { useState, useMemo } from "react";
import { AdsData } from "@/types/marketing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  MousePointer,
  ShoppingCart,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Info,
  HelpCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  classifyFunnelRole,
  classifyByObjective,
  calcMedian,
  getRoleMeta,
  CTR_REFERENCE,
  ROAS_REFERENCE,
  getEfficiencyAxisInfo,
  type FunnelRole,
  type AdObjectiveType,
} from "@/utils/adFormatClassifier";
import { parseAdsValue } from "@/utils/adsCalculator";

interface AdsBreakdownProps {
  ads: AdsData[];
  selectedMonth: string;
  objective?: AdObjectiveType;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(value);

// R06-2: parser consolidado em adsCalculator.parseAdsValue (evita 4 implementações diferentes).
// Aceita number direto; delega strings ao parser BR/US robusto.
const parseValue = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return parseAdsValue(String(value));
};

type SortColumn =
  | "investment"
  | "impressions"
  | "clicks"
  | "ctr"
  | "purchases"
  | "roas"
  | "cpc"
  | "classification"
  | null;
type SortDirection = "asc" | "desc" | null;

const CLASSIFICATION_WEIGHT: Record<FunnelRole, number> = {
  conversor: 0,
  conversor_silencioso: 1,
  isca_atencao: 2,
  ineficiente: 3,
};

const CLASSIFICATION_TOOLTIPS: Record<FunnelRole, string> = {
  conversor: "Criativo atrai cliques e gera retorno. Bom candidato para escala.",
  isca_atencao: "CTR alto mas ROAS baixo. Cliques não convertem — investigar oferta ou página.",
  conversor_silencioso: "Poucos cliques mas altamente qualificados. CTR baixo não é problema aqui.",
  ineficiente: "Baixa atenção e baixo retorno. Avaliar pausa ou reformulação.",
};

const CLASSIFICATION_COLORS: Record<FunnelRole, string> = {
  conversor: "bg-emerald-100 text-emerald-800",
  isca_atencao: "bg-amber-100 text-amber-800",
  conversor_silencioso: "bg-blue-100 text-blue-800",
  ineficiente: "bg-red-100 text-red-800",
};

const CLASSIFICATION_FILTER_OPTIONS = [
  { value: "all", label: "Todas classificações" },
  { value: "conversor", label: "Conversor" },
  { value: "isca_atencao", label: "Isca de Atenção" },
  { value: "conversor_silencioso", label: "Conversor Silencioso" },
  { value: "ineficiente", label: "Ineficiente" },
];

const getEffectiveStatus = (ad: AdsData): string => {
  // Prioridade: effective_status (da API) > status_veiculacao (do CSV)
  const es = (ad as any).effective_status || ad["Veiculação da campanha"] || "";
  return es.toUpperCase();
};

const isActiveAd = (ad: AdsData): boolean => {
  const status = getEffectiveStatus(ad);
  return status === "ACTIVE" || status === "WITH_ISSUES" || status === "";
  // status vazio = dados históricos sem status — mostra por padrão
};

const getStatusBadge = (ad: AdsData) => {
  const status = getEffectiveStatus(ad);
  if (status === "ACTIVE") return <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Ativo</Badge>;
  if (status === "WITH_ISSUES")
    return <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">Com problemas</Badge>;
  if (status === "PAUSED")
    return (
      <Badge variant="secondary" className="text-[10px]">
        Pausado
      </Badge>
    );
  if (status === "ARCHIVED")
    return (
      <Badge variant="secondary" className="text-[10px] opacity-60">
        Arquivado
      </Badge>
    );
  if (status === "DELETED")
    return (
      <Badge variant="secondary" className="text-[10px] opacity-40">
        Excluído
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-[10px]">
      —
    </Badge>
  );
};

const getAdMetrics = (ad: AdsData) => {
  const investment = parseValue(ad["Valor usado (BRL)"]);
  const impressions = parseValue(ad["Impressões"]);
  const revenue = parseValue(ad["Valor de conversão da compra"]);
  const clicks = parseValue(ad["Cliques (todos)"]);
  const results = parseValue(ad["Resultados"]);
  const ctrFromCsv = parseValue(ad["CTR (todos)"]);
  const roasFromCsv = parseValue(ad["ROAS de resultados"]);
  const cpcFromCsv = parseValue(ad["CPC (custo por clique no link)"]);
  const ctr = ctrFromCsv > 0 ? ctrFromCsv : impressions > 0 ? (clicks / impressions) * 100 : 0;
  const roas = roasFromCsv > 0 ? roasFromCsv : investment > 0 ? revenue / investment : 0;
  const cpr = results > 0 && investment > 0 ? investment / results : 0;
  const cpc = cpcFromCsv > 0 ? cpcFromCsv : clicks > 0 && investment > 0 ? investment / clicks : 0;
  return { ctr, roas, clicks, cpr, cpc, results };
};

export const AdsBreakdown = ({ ads, selectedMonth, objective = "OUTCOME_SALES" }: AdsBreakdownProps) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>("investment");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterClassification, setFilterClassification] = useState<string>("all");
  const [onlyActive, setOnlyActive] = useState<boolean>(true);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "desc") setSortDirection("asc");
      else {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const axisInfo = useMemo(() => getEfficiencyAxisInfo(objective), [objective]);
  const isSales = objective === "OUTCOME_SALES" || !objective;

  const { medianCpr, medianCpc } = useMemo(() => {
    const all = ads.filter((a) => parseValue(a["Valor usado (BRL)"]) >= 10).map(getAdMetrics);
    return {
      medianCpr: calcMedian(all.map((m) => m.cpr).filter((v) => v > 0)),
      medianCpc: calcMedian(all.map((m) => m.cpc).filter((v) => v > 0)),
    };
  }, [ads]);

  const classifyAd = (m: ReturnType<typeof getAdMetrics>, investment: number): FunnelRole | null => {
    if (investment < 10) return null;
    return classifyByObjective(objective, m.ctr, { roas: m.roas, cpr: m.cpr, cpc: m.cpc, medianCpr, medianCpc });
  };

  // Contagem para o toggle
  const activeCount = useMemo(() => ads.filter(isActiveAd).length, [ads]);
  const hasStatusData = useMemo(() => ads.some((a) => (a as any).effective_status), [ads]);

  // Agrupar por campanha (para separadores visuais)
  const processedAds = useMemo(() => {
    let filtered = [...ads];

    if (onlyActive) filtered = filtered.filter(isActiveAd);
    if (filterClassification !== "all") {
      filtered = filtered.filter((ad) => {
        const m = getAdMetrics(ad);
        const inv = parseValue(ad["Valor usado (BRL)"]);
        return classifyAd(m, inv) === filterClassification;
      });
    }

    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        let vA = 0,
          vB = 0;
        switch (sortColumn) {
          case "investment":
            vA = parseValue(a["Valor usado (BRL)"]);
            vB = parseValue(b["Valor usado (BRL)"]);
            break;
          case "impressions":
            vA = parseValue(a["Impressões"]);
            vB = parseValue(b["Impressões"]);
            break;
          case "clicks":
            vA = getAdMetrics(a).clicks;
            vB = getAdMetrics(b).clicks;
            break;
          case "ctr":
            vA = getAdMetrics(a).ctr;
            vB = getAdMetrics(b).ctr;
            break;
          case "purchases":
            vA = parseValue(a["Compras"]);
            vB = parseValue(b["Compras"]);
            break;
          case "cpc":
            vA = getAdMetrics(a).cpc;
            vB = getAdMetrics(b).cpc;
            break;
          case "roas": {
            const mA = getAdMetrics(a),
              mB = getAdMetrics(b);
            vA = isSales ? mA.roas : objective === "OUTCOME_ENGAGEMENT" ? mA.cpr : mA.cpc;
            vB = isSales ? mB.roas : objective === "OUTCOME_ENGAGEMENT" ? mB.cpr : mB.cpc;
            if (!isSales) {
              const tmp = vA;
              vA = vB;
              vB = tmp;
            }
            break;
          }
          case "classification": {
            const cA = classifyAd(getAdMetrics(a), parseValue(a["Valor usado (BRL)"]));
            const cB = classifyAd(getAdMetrics(b), parseValue(b["Valor usado (BRL)"]));
            vA = cA ? CLASSIFICATION_WEIGHT[cA] : 99;
            vB = cB ? CLASSIFICATION_WEIGHT[cB] : 99;
            break;
          }
        }
        return sortDirection === "asc" ? vA - vB : vB - vA;
      });
    } else {
      filtered.sort((a, b) => parseValue(b["Valor usado (BRL)"]) - parseValue(a["Valor usado (BRL)"]));
    }

    return filtered;
  }, [ads, sortColumn, sortDirection, filterClassification, onlyActive]);

  // Agrupar por campanha para cabeçalhos de grupo
  const groupedRows = useMemo(() => {
    const result: Array<{ type: "group"; campanha: string } | { type: "ad"; ad: AdsData; index: number }> = [];
    let lastCampanha = "";
    processedAds.forEach((ad, i) => {
      const campanha = ad.campanha || ad["Nome do conjunto de anúncios"] || "";
      if (campanha && campanha !== lastCampanha) {
        result.push({ type: "group", campanha });
        lastCampanha = campanha;
      }
      result.push({ type: "ad", ad, index: i });
    });
    return result;
  }, [processedAds]);

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  if (ads.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalhamento por Anúncio
            </CardTitle>
            <CardDescription className="mt-1">
              {processedAds.length}
              {processedAds.length !== ads.length && ` de ${ads.length}`} anúncios
              {onlyActive && activeCount < ads.length && ` · ${ads.length - activeCount} pausados/arquivados ocultos`}
            </CardDescription>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Toggle só ativos */}
            <div className="flex items-center gap-2">
              <Switch id="only-active" checked={onlyActive} onCheckedChange={setOnlyActive} />
              <Label htmlFor="only-active" className="text-sm text-muted-foreground cursor-pointer">
                Só ativos
              </Label>
              {!hasStatusData && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Status ainda não sincronizado via API. Execute "Sincronizar Meta Ads" para atualizar.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Filtro classificação */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterClassification} onValueChange={setFilterClassification}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="Classificação" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSIFICATION_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Legenda — popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <HelpCircle className="h-4 w-4" />
                  Classificações
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <p className="text-xs font-semibold mb-3 text-foreground">Regra de classificação</p>
                <div className="space-y-2.5">
                  {isSales ? (
                    <>
                      {[
                        { cls: "conversor", rule: `CTR ≥ ${CTR_REFERENCE}% + ROAS ≥ ${ROAS_REFERENCE}x` },
                        { cls: "isca_atencao", rule: `CTR ≥ ${CTR_REFERENCE}% + ROAS < ${ROAS_REFERENCE}x` },
                        { cls: "conversor_silencioso", rule: `CTR < ${CTR_REFERENCE}% + ROAS ≥ ${ROAS_REFERENCE}x` },
                        { cls: "ineficiente", rule: `CTR < ${CTR_REFERENCE}% + ROAS < ${ROAS_REFERENCE}x` },
                      ].map(({ cls, rule }) => (
                        <div key={cls} className="flex items-start gap-2">
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${CLASSIFICATION_COLORS[cls as FunnelRole]}`}
                          >
                            {getRoleMeta(cls as FunnelRole).label}
                          </span>
                          <span className="text-xs text-muted-foreground">{rule}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {[
                        { cls: "conversor", rule: `CTR ≥ ${CTR_REFERENCE}% + ${axisInfo.key.toUpperCase()} ≤ mediana` },
                        {
                          cls: "isca_atencao",
                          rule: `CTR ≥ ${CTR_REFERENCE}% + ${axisInfo.key.toUpperCase()} > mediana`,
                        },
                        {
                          cls: "conversor_silencioso",
                          rule: `CTR < ${CTR_REFERENCE}% + ${axisInfo.key.toUpperCase()} ≤ mediana`,
                        },
                        {
                          cls: "ineficiente",
                          rule: `CTR < ${CTR_REFERENCE}% + ${axisInfo.key.toUpperCase()} > mediana`,
                        },
                      ].map(({ cls, rule }) => (
                        <div key={cls} className="flex items-start gap-2">
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${CLASSIFICATION_COLORS[cls as FunnelRole]}`}
                          >
                            {getRoleMeta(cls as FunnelRole).label}
                          </span>
                          <span className="text-xs text-muted-foreground">{rule}</span>
                        </div>
                      ))}
                    </>
                  )}
                  <div className="space-y-1.5 pt-2 border-t">
                    {(Object.keys(CLASSIFICATION_TOOLTIPS) as FunnelRole[]).map((cls) => (
                      <p key={cls} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{getRoleMeta(cls).label}:</span>{" "}
                        {CLASSIFICATION_TOOLTIPS[cls]}
                      </p>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[28%]">Anúncio / Conjunto</TableHead>
                <TableHead className="text-right w-[9%]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent w-full justify-end"
                    onClick={() => handleSort("investment")}
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    Invest.{getSortIcon("investment")}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[8%]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent w-full justify-end"
                    onClick={() => handleSort("impressions")}
                  >
                    Impressões{getSortIcon("impressions")}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[7%]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent w-full justify-end"
                    onClick={() => handleSort("clicks")}
                  >
                    <MousePointer className="h-3.5 w-3.5" />
                    Cliques{getSortIcon("clicks")}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[7%]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent w-full justify-end"
                    onClick={() => handleSort("ctr")}
                  >
                    CTR{getSortIcon("ctr")}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[7%]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent w-full justify-end"
                    onClick={() => handleSort("cpc")}
                  >
                    CPC{getSortIcon("cpc")}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[7%]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent w-full justify-end"
                    onClick={() => handleSort("purchases")}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    {isSales ? "Compras" : "Result."}
                    {getSortIcon("purchases")}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[7%]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent w-full justify-end"
                    onClick={() => handleSort("roas")}
                  >
                    {isSales ? "ROAS" : axisInfo.key.toUpperCase()}
                    {getSortIcon("roas")}
                  </Button>
                </TableHead>
                <TableHead className="text-center w-[12%]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => handleSort("classification")}
                  >
                    Classificação{getSortIcon("classification")}
                  </Button>
                </TableHead>
                <TableHead className="w-[8%] text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedRows.map((row, i) => {
                if (row.type === "group") {
                  return (
                    <TableRow key={`group-${i}`} className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={10} className="py-1.5 px-4">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                          {row.campanha}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                }

                const { ad, index } = row;
                const investment = parseValue(ad["Valor usado (BRL)"]);
                const impressions = parseValue(ad["Impressões"]);
                const purchases = parseValue(ad["Compras"]);
                const results = parseValue(ad["Resultados"]);
                const adMetrics = getAdMetrics(ad);
                const { ctr, roas, clicks, cpr, cpc } = adMetrics;
                const classification = classifyAd(adMetrics, investment);
                const effValue = isSales ? roas : objective === "OUTCOME_ENGAGEMENT" ? cpr : cpc;
                const effDisplay = isSales
                  ? roas > 0
                    ? `${roas.toFixed(2)}x`
                    : "-"
                  : effValue > 0
                    ? formatCurrency(effValue)
                    : "-";
                const effGood = isSales
                  ? roas >= ROAS_REFERENCE
                  : objective === "OUTCOME_ENGAGEMENT"
                    ? medianCpr > 0 && cpr <= medianCpr && cpr > 0
                    : medianCpc > 0 && cpc <= medianCpc && cpc > 0;
                const countValue = isSales ? purchases : results;
                const conjunto = ad.conjunto || ad["Nome do conjunto de anúncios"] || "";
                const isActive = isActiveAd(ad);

                return (
                  <TableRow key={index} className={!isActive && !onlyActive ? "opacity-50" : ""}>
                    <TableCell className="font-medium">
                      <div className="space-y-0.5">
                        <p className="text-sm leading-snug whitespace-normal break-words">{ad["Nome do anúncio"]}</p>
                        {conjunto && <p className="text-[11px] text-muted-foreground truncate">{conjunto}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatCurrency(investment)}</TableCell>
                    <TableCell className="text-right text-sm">{formatNumber(impressions)}</TableCell>
                    <TableCell className="text-right text-sm">{formatNumber(clicks)}</TableCell>
                    <TableCell className="text-right text-sm">
                      <span className={ctr >= CTR_REFERENCE ? "text-emerald-600 font-medium" : "text-red-500"}>
                        {ctr.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {cpc > 0 ? formatCurrency(cpc) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {countValue > 0 ? (
                        <span className="flex items-center justify-end gap-1 text-emerald-600 font-medium">
                          <TrendingUp className="h-3 w-3" />
                          {formatNumber(countValue)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {effDisplay !== "-" ? (
                        <span className={effGood ? "text-emerald-600 font-semibold" : "text-red-500"}>
                          {effDisplay}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {classification ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold cursor-default ${CLASSIFICATION_COLORS[classification]}`}
                              >
                                {getRoleMeta(classification).label}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] text-center">
                              <p className="text-xs">{CLASSIFICATION_TOOLTIPS[classification]}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-400">
                          Sem dados
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(ad)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
