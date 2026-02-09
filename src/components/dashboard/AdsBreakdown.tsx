import { useState, useMemo } from "react";
import { AdsData } from "@/types/marketing";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, DollarSign, MousePointer, ShoppingCart, Package, ArrowUpDown, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { classifyFunnelRole, getRoleMeta, type FunnelRole } from "@/utils/adFormatClassifier";

interface AdsBreakdownProps {
  ads: AdsData[];
  selectedMonth: string;
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatNumber = (value: number) => 
  new Intl.NumberFormat('pt-BR').format(value);

const parseValue = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const s = String(value).trim();
  if (s === "" || s === "-" || s.toLowerCase() === "n/a") return 0;

  let cleaned = s.replace(/[^\d.,-]/g, "");
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(".") > cleaned.lastIndexOf(",")) {
      cleaned = cleaned.replace(/,/g, "");      // US: 1,234.56
    } else {
      cleaned = cleaned.replace(/\./g, "").replace(",", "."); // BR: 1.234,56
    }
  } else if (hasComma) {
    cleaned = cleaned.replace(",", ".");
  }

  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const calculateRoas = (ad: AdsData): number => {
  // 1. Tentar pegar do export direto
  const roasExported = parseValue(ad["ROAS de resultados"]);
  if (roasExported > 0) return roasExported;

  // 2. Calcular manualmente se não veio
  const investment = parseValue(ad["Valor usado (BRL)"]);
  const revenue = parseValue(ad["Valor de conversão da compra"]);

  return investment > 0 && revenue > 0 ? revenue / investment : 0;
};

type SortColumn = 'investment' | 'impressions' | 'clicks' | 'ctr' | 'purchases' | 'roas' | 'classification' | null;

const CLASSIFICATION_WEIGHT: Record<FunnelRole, number> = {
  conversor: 0,
  conversor_silencioso: 1,
  isca_atencao: 2,
  ineficiente: 3,
};

const CLASSIFICATION_TOOLTIPS: Record<FunnelRole, string> = {
  conversor: "Criativo atrai e converte. Bom candidato para escala.",
  isca_atencao: "Chama atenção, mas não gera retorno financeiro.",
  conversor_silencioso: "Baixo CTR, mas alta eficiência. Tráfego qualificado.",
  ineficiente: "Baixa atenção e baixo retorno. Avaliar pausa.",
};

const CLASSIFICATION_COLORS: Record<FunnelRole, string> = {
  conversor: "bg-green-100 text-green-800",
  isca_atencao: "bg-yellow-100 text-yellow-800",
  conversor_silencioso: "bg-blue-100 text-blue-800",
  ineficiente: "bg-red-100 text-red-800",
};

const getAdClassification = (ad: AdsData) => {
  const investment = parseValue(ad["Valor usado (BRL)"]);
  const impressions = parseValue(ad["Impressões"]);
  const revenue = parseValue(ad["Valor de conversão da compra"]);
  const clicks = parseValue(ad["Cliques de saída"]) || parseValue(ad["Cliques no link"]) || parseValue(ad["Cliques (todos)"]);

  if (investment < 10) return null;

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const roas = investment > 0 ? revenue / investment : 0;

  return classifyFunnelRole(ctr, roas);
};
type SortDirection = 'asc' | 'desc' | null;

export const AdsBreakdown = ({ ads, selectedMonth }: AdsBreakdownProps) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('investment');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterResultType, setFilterResultType] = useState<string>("all");

  // Extrair tipos únicos de resultado
  const uniqueResultTypes = useMemo(() => {
    const types = new Set(ads.map(ad => ad["Tipo de resultado"]).filter(Boolean));
    return Array.from(types).sort();
  }, [ads]);

  // Função de ordenação
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Ciclar: desc -> asc -> null (padrão)
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Filtrar e ordenar anúncios
  const processedAds = useMemo(() => {
    let filtered = [...ads];

    // Aplicar filtro de tipo de resultado
    if (filterResultType !== "all") {
      filtered = filtered.filter(ad => ad["Tipo de resultado"] === filterResultType);
    }

    // Aplicar ordenação
    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        let valueA = 0;
        let valueB = 0;

        switch (sortColumn) {
          case 'investment':
            valueA = parseValue(a["Valor usado (BRL)"]);
            valueB = parseValue(b["Valor usado (BRL)"]);
            break;
          case 'impressions':
            valueA = parseValue(a["Impressões"]);
            valueB = parseValue(b["Impressões"]);
            break;
          case 'clicks':
            valueA = parseValue(a["Cliques (todos)"]);
            valueB = parseValue(b["Cliques (todos)"]);
            break;
          case 'ctr':
            valueA = parseValue(a["CTR (todos)"]);
            valueB = parseValue(b["CTR (todos)"]);
            break;
          case 'purchases':
            valueA = parseValue(a["Compras"]);
            valueB = parseValue(b["Compras"]);
            break;
          case 'roas':
            valueA = calculateRoas(a);
            valueB = calculateRoas(b);
            break;
          case 'classification':
            const classA = getAdClassification(a);
            const classB = getAdClassification(b);
            valueA = classA ? CLASSIFICATION_WEIGHT[classA] : 99;
            valueB = classB ? CLASSIFICATION_WEIGHT[classB] : 99;
            break;
        }

        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      });
    } else {
      // Ordenação padrão por investimento
      filtered.sort((a, b) => {
        const investA = parseValue(a["Valor usado (BRL)"]);
        const investB = parseValue(b["Valor usado (BRL)"]);
        return investB - investA;
      });
    }

    return filtered;
  }, [ads, sortColumn, sortDirection, filterResultType]);

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  if (ads.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalhamento por Anúncio
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              <span>
                {processedAds.length} {processedAds.length !== ads.length && `de ${ads.length}`} anúncios
              </span>
              {filterResultType !== "all" && (
                <Badge variant="secondary" className="ml-2">
                  Filtrado
                </Badge>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterResultType} onValueChange={setFilterResultType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {uniqueResultTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anúncio</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => handleSort('investment')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <DollarSign className="h-4 w-4" />
                      Investimento
                      {getSortIcon('investment')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => handleSort('impressions')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Impressões
                      {getSortIcon('impressions')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => handleSort('clicks')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <MousePointer className="h-4 w-4" />
                      Cliques
                      {getSortIcon('clicks')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => handleSort('ctr')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      CTR
                      {getSortIcon('ctr')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => handleSort('purchases')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <ShoppingCart className="h-4 w-4" />
                      Compras
                      {getSortIcon('purchases')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => handleSort('roas')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      ROAS
                      {getSortIcon('roas')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => handleSort('classification')}
                  >
                    <div className="flex items-center gap-1">
                      Classificação
                      {getSortIcon('classification')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>Tipo de Resultado</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedAds.map((ad, index) => {
                const investment = parseValue(ad["Valor usado (BRL)"]);
                const impressions = parseValue(ad["Impressões"]);
                const clicks = parseValue(ad["Cliques (todos)"]);
                const ctr = parseValue(ad["CTR (todos)"]);
                const purchases = parseValue(ad["Compras"]);
                const roas = calculateRoas(ad);
                const status = ad["Veiculação da campanha"];
                const classification = getAdClassification(ad);

                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {ad["Nome do anúncio"]}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(investment)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(impressions)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(clicks)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={ctr >= 1.5 ? "text-green-600 font-medium" : ""}>
                        {ctr.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {purchases > 0 ? (
                        <span className="flex items-center justify-end gap-1 text-green-600 font-medium">
                          <TrendingUp className="h-3 w-3" />
                          {formatNumber(purchases)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {roas > 0 ? (
                        <span className={roas >= 1 ? "text-green-600 font-semibold" : "text-yellow-600"}>
                          {roas.toFixed(2)}x
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {classification ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-default ${CLASSIFICATION_COLORS[classification]}`}>
                                {getRoleMeta(classification).label}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] text-center">
                              <p className="text-xs">{CLASSIFICATION_TOOLTIPS[classification]}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500">
                          Sem dados
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {ad["Tipo de resultado"] || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status === "active" ? "default" : "secondary"}>
                        {status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
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
