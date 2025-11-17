import { FreebieProduct } from "@/types/marketing";
import { Card, CardContent } from "@/components/ui/card";
import { Gift } from "lucide-react";

interface FreebieProductsListProps {
  products: FreebieProduct[];
}

export const FreebieProductsList = ({ products }: FreebieProductsListProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product, index) => (
        <Card key={index} className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm mb-2 truncate" title={product.descricao}>
                  {product.descricao}
                </h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>SKU:</span>
                    <span className="font-mono">{product.sku}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quantidade distribuída:</span>
                    <span className="font-semibold">{product.quantidadeTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pedidos com brinde:</span>
                    <span className="font-semibold">{product.numeroPedidos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>% de pedidos:</span>
                    <span className="font-semibold text-primary">
                      {product.percentualPedidosComBrinde.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
