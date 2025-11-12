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
import { TrendingUp, TrendingDown, DollarSign, MousePointer, ShoppingCart, Package } from "lucide-react";

interface AdsBreakdownProps {
  ads: AdsData[];
  selectedMonth: string;
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatNumber = (value: number) => 
  new Intl.NumberFormat('pt-BR').format(value);

const parseValue = (value: string): number => {
  if (!value || value === "") return 0;
  const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

export const AdsBreakdown = ({ ads, selectedMonth }: AdsBreakdownProps) => {
  if (ads.length === 0) {
    return null;
  }

  // Ordenar por investimento (maior primeiro)
  const sortedAds = [...ads].sort((a, b) => {
    const investA = parseValue(a["Valor usado (BRL)"]);
    const investB = parseValue(b["Valor usado (BRL)"]);
    return investB - investA;
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Detalhamento por Anúncio
        </CardTitle>
        <CardDescription>
          {ads.length} anúncios ativos no mês selecionado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anúncio</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <DollarSign className="h-4 w-4" />
                    Investimento
                  </div>
                </TableHead>
                <TableHead className="text-right">Impressões</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <MousePointer className="h-4 w-4" />
                    Cliques
                  </div>
                </TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ShoppingCart className="h-4 w-4" />
                    Compras
                  </div>
                </TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAds.map((ad, index) => {
                const investment = parseValue(ad["Valor usado (BRL)"]);
                const impressions = parseValue(ad["Impressões"]);
                const clicks = parseValue(ad["Cliques (todos)"]);
                const ctr = parseValue(ad["CTR (todos)"]);
                const purchases = parseValue(ad["Compras"]);
                const roas = parseValue(ad["ROAS de resultados"]);
                const status = ad["Veiculação da campanha"];

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
