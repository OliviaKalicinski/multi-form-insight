import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/utils/salesCalculator";

interface ProductData {
  product: string;
  count: number;
  avgOrderValue?: number;
}

interface SampleProductsTableProps {
  title: string;
  products: ProductData[];
  showAvgOrderValue?: boolean;
}

export const SampleProductsTable = ({
  title,
  products,
  showAvgOrderValue = false,
}: SampleProductsTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum produto encontrado
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                {showAvgOrderValue && (
                  <TableHead className="text-right">Ticket Médio</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{product.product}</TableCell>
                  <TableCell className="text-right">
                    {product.count.toLocaleString('pt-BR')}
                  </TableCell>
                  {showAvgOrderValue && (
                    <TableCell className="text-right">
                      {formatCurrency(product.avgOrderValue || 0)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
