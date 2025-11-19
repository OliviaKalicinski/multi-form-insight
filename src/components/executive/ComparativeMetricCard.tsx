import { Card, CardContent } from "@/components/ui/card";
import { MonthComparison } from "@/types/executive";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparativeMetricCardProps {
  comparison: MonthComparison;
}

export const ComparativeMetricCard = ({ comparison }: ComparativeMetricCardProps) => {
  const getTrendIcon = () => {
    if (comparison.status === 'up') return <TrendingUp className="h-4 w-4" />;
    if (comparison.status === 'down') return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };
  
  const isPositive = comparison.isGood 
    ? comparison.status === 'up' 
    : comparison.status === 'down';
  
  const formatValue = (value: number) => {
    if (comparison.metric.includes('R$') || comparison.metric.includes('Receita')) {
      return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    if (comparison.metric.includes('%') || comparison.metric.includes('Taxa')) {
      return `${value.toFixed(1)}%`;
    }
    if (comparison.metric === 'ROAS') {
      return `${value.toFixed(2)}x`;
    }
    return value.toLocaleString('pt-BR');
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground mb-2">{comparison.metric}</div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">{formatValue(comparison.atual)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Anterior: {formatValue(comparison.anterior)}
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-sm font-semibold",
            isPositive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          )}>
            {getTrendIcon()}
            <span>
              {comparison.variacao > 0 ? '+' : ''}{comparison.variacao.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
