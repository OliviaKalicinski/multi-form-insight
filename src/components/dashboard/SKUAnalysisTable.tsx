import { useMemo, useState } from "react";
import { SKUPerformance } from "@/types/marketing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/salesCalculator";
import { format } from "date-fns";
import { Search } from "lucide-react";

interface SKUAnalysisTableProps {
  skus: SKUPerformance[];
}

export const SKUAnalysisTable = ({ skus }: SKUAnalysisTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSkus = useMemo(() => {
    if (!searchTerm) return skus.slice(0, 50);
    
    const term = searchTerm.toLowerCase();
    return skus.filter(sku => 
      sku.sku.toLowerCase().includes(term) || 
      sku.descricaoAjustada.toLowerCase().includes(term)
    ).slice(0, 50);
  }, [skus, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por SKU ou produto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead className="text-right">Ticket Médio</TableHead>
              <TableHead className="text-right">Preço Médio</TableHead>
              <TableHead>Primeira Venda</TableHead>
              <TableHead>Última Venda</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSkus.map((sku, index) => (
              <TableRow key={`${sku.sku}-${index}`}>
                <TableCell className="font-mono text-sm">{sku.sku}</TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate" title={sku.descricaoAjustada}>
                    {sku.descricaoAjustada}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(sku.faturamentoTotal)}</TableCell>
                <TableCell className="text-right">{sku.quantidadeTotal}</TableCell>
                <TableCell className="text-right">{sku.numeroPedidos}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(sku.ticketMedio)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(sku.precoMedio)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(sku.primeiraVenda, "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(sku.ultimaVenda, "dd/MM/yyyy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {filteredSkus.length === 50 && (
        <p className="text-sm text-muted-foreground text-center">
          Mostrando os primeiros 50 resultados. Use a busca para refinar.
        </p>
      )}
    </div>
  );
};
