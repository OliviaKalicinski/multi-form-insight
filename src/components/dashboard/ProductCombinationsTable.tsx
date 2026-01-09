import { useState, useMemo } from "react";
import { ProductCombination } from "@/types/marketing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatCurrency } from "@/utils/salesCalculator";

interface ProductCombinationsTableProps {
  combinations: ProductCombination[];
}

export const ProductCombinationsTable = ({ combinations }: ProductCombinationsTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCombinations = useMemo(() => {
    if (!searchTerm.trim()) return combinations;
    
    const term = searchTerm.toLowerCase();
    return combinations.filter(combo => 
      combo.produto1.toLowerCase().includes(term) ||
      combo.produto2.toLowerCase().includes(term) ||
      combo.sku1.toLowerCase().includes(term) ||
      combo.sku2.toLowerCase().includes(term)
    );
  }, [combinations, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar combinação..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

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
            {filteredCombinations.slice(0, 30).map((combo, index) => (
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
        
        {filteredCombinations.length === 0 && searchTerm && (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma combinação encontrada para "{searchTerm}"
          </p>
        )}
      </div>
    </div>
  );
};
