import { ProductCombination } from "@/types/marketing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/salesCalculator";

interface ProductCombinationsTableProps {
  combinations: ProductCombination[];
}

export const ProductCombinationsTable = ({ combinations }: ProductCombinationsTableProps) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto 1</TableHead>
            <TableHead>Produto 2</TableHead>
            <TableHead className="text-right">Frequência</TableHead>
            <TableHead className="text-right">% Pedidos</TableHead>
            <TableHead className="text-right">Faturamento Médio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {combinations.slice(0, 30).map((combo, index) => (
            <TableRow key={index}>
              <TableCell className="max-w-xs">
                <div className="truncate font-medium" title={combo.produto1}>
                  {combo.produto1}
                </div>
                <div className="text-xs text-muted-foreground">SKU: {combo.sku1}</div>
              </TableCell>
              <TableCell className="max-w-xs">
                <div className="truncate font-medium" title={combo.produto2}>
                  {combo.produto2}
                </div>
                <div className="text-xs text-muted-foreground">SKU: {combo.sku2}</div>
              </TableCell>
              <TableCell className="text-right">
                {combo.frequencia > 10 ? (
                  <Badge variant="default">{combo.frequencia}x</Badge>
                ) : (
                  <span className="font-mono">{combo.frequencia}x</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className={combo.percentualPedidos >= 5 ? "font-bold text-primary" : ""}>
                    {combo.percentualPedidos.toFixed(1)}%
                  </span>
                  {combo.percentualPedidos >= 5 && (
                    <Badge variant="secondary" className="text-xs">Alta</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(combo.faturamentoMedio)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
