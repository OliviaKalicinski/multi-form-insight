import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductData {
  product: string;
  revenue: number;
  percentage: number;
}

interface TopProductsCompactProps {
  data: ProductData[];
  limit?: number;
}

const formatCurrency = (value: number) => {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const getRankIcon = (index: number) => {
  if (index === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (index === 1) return <Medal className="h-4 w-4 text-gray-400" />;
  if (index === 2) return <Medal className="h-4 w-4 text-amber-600" />;
  return <span className="text-xs text-muted-foreground w-4 text-center">{index + 1}</span>;
};

const getBarColor = (index: number) => {
  if (index === 0) return "bg-yellow-500";
  if (index === 1) return "bg-gray-400";
  if (index === 2) return "bg-amber-600";
  return "bg-primary";
};

export const TopProductsCompact = ({ data, limit = 8 }: TopProductsCompactProps) => {
  const topProducts = data.slice(0, limit);
  const maxRevenue = topProducts[0]?.revenue || 1;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4 text-primary" />
          Top Produtos
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {topProducts.map((item, index) => {
            const barWidth = (item.revenue / maxRevenue) * 100;
            return (
              <div key={index} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  {getRankIcon(index)}
                  <span className="text-xs truncate flex-1" title={item.product}>
                    {item.product.length > 22 ? item.product.substring(0, 22) + '...' : item.product}
                  </span>
                  <span className="text-xs font-medium text-right">
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 ml-6">
                  <div
                    className={cn("h-1.5 rounded-full transition-all", getBarColor(index))}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Ver todos link */}
        {data.length > limit && (
          <div className="pt-3 mt-3 border-t text-center">
            <span className="text-xs text-muted-foreground">
              +{data.length - limit} produtos
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
