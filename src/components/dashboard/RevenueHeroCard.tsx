import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevenueHeroCardProps {
  totalRevenue: number;
  netRevenue: number;
  shippingTotal: number;
  variation?: number | null;
  revenueGoal?: number;
  profitMargin?: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatCurrencyCompact = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return formatCurrency(value);
};

export const RevenueHeroCard = ({
  totalRevenue,
  netRevenue,
  shippingTotal,
  variation,
  revenueGoal = 50000,
  profitMargin = 0.35,
}: RevenueHeroCardProps) => {
  const goalProgress = Math.min((totalRevenue / revenueGoal) * 100, 150);
  const estimatedProfit = netRevenue * profitMargin;
  const remainingToGoal = Math.max(revenueGoal - totalRevenue, 0);
  
  const getStatus = () => {
    if (goalProgress >= 100) return { label: "🎯 Meta Atingida", color: "bg-green-500" };
    if (goalProgress >= 80) return { label: "⚡ Em Progresso", color: "bg-yellow-500" };
    return { label: "📊 Em Construção", color: "bg-blue-500" };
  };
  
  const status = getStatus();
  
  const getCardStyle = () => {
    if (goalProgress >= 100) return "border-green-500/50 bg-green-500/5";
    if (goalProgress >= 80) return "border-yellow-500/50 bg-yellow-500/5";
    return "border-primary/50 bg-primary/5";
  };

  return (
    <Card className={cn("border-2 relative overflow-hidden", getCardStyle())}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
      
      <CardContent className="p-6 relative">
        <div className="space-y-4">
          {/* Header with icon and status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Receita vs Meta
              </span>
            </div>
            <Badge className={cn("text-xs", status.color)}>
              {status.label}
            </Badge>
          </div>

          {/* Main Value */}
          <div>
            <p className="text-4xl font-bold text-foreground">
              {formatCurrency(totalRevenue)}
            </p>
            
            {/* Variation trend */}
            {variation !== null && variation !== undefined && (
              <div className={cn(
                "flex items-center gap-1 mt-1 text-sm font-medium",
                variation >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {variation >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{variation >= 0 ? '+' : ''}{variation.toFixed(1)}% vs mês anterior</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                Meta: {formatCurrencyCompact(revenueGoal)}
              </span>
              <span className={cn(
                "font-semibold",
                goalProgress >= 100 ? "text-green-600" : 
                goalProgress >= 80 ? "text-yellow-600" : "text-foreground"
              )}>
                {goalProgress.toFixed(0)}%
              </span>
            </div>
            <Progress value={Math.min(goalProgress, 100)} className="h-2" />
            {remainingToGoal > 0 && (
              <p className="text-xs text-muted-foreground">
                Faltam {formatCurrencyCompact(remainingToGoal)} para a meta
              </p>
            )}
          </div>

          {/* Quick breakdown */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Receita Líquida</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrencyCompact(netRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">
                (-{formatCurrencyCompact(shippingTotal)} frete)
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Lucro Estimado</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrencyCompact(estimatedProfit)}
              </p>
              <p className="text-xs text-muted-foreground">
                (margem {(profitMargin * 100).toFixed(0)}%)
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
