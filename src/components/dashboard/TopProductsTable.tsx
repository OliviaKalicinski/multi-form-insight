import { ProductRanking } from "@/types/marketing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/salesCalculator";

interface TopProductsTableProps {
  products: ProductRanking[];
  sortBy: 'quantity' | 'revenue';
}

export const TopProductsTable = ({ products, sortBy }: TopProductsTableProps) => {
  const getPositionBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-yellow-500">🥇 1º</Badge>;
    if (index === 1) return <Badge className="bg-gray-400">🥈 2º</Badge>;
    if (index === 2) return <Badge className="bg-amber-600">🥉 3º</Badge>;
    return <span className="text-muted-foreground">{index + 1}º</span>;
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Ticket Médio</TableHead>
            <TableHead className="text-right">% {sortBy === 'quantity' ? 'Qtd' : 'Fat'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product, index) => (
            <TableRow key={`${product.sku}-${index}`}>
              <TableCell>{getPositionBadge(index)}</TableCell>
              <TableCell className="font-medium max-w-xs">
                <div className="truncate" title={product.descricaoAjustada}>
                  {product.descricaoAjustada}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{product.sku}</TableCell>
              <TableCell className="text-right font-mono">{product.quantidadeTotal}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(product.faturamentoTotal)}</TableCell>
              <TableCell className="text-right">{product.numeroPedidos}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(product.ticketMedio)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm font-medium">
                    {(sortBy === 'quantity' ? product.percentualQuantidade : product.percentualFaturamento).toFixed(1)}%
                  </span>
                  <div className="w-16 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${Math.min(100, (sortBy === 'quantity' ? product.percentualQuantidade : product.percentualFaturamento))}%` }}
                    />
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
