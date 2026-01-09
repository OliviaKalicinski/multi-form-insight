import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialBreakdownCardProps {
  grossRevenue: number;
  shippingCost: number;
  costPercentage?: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);

export const FinancialBreakdownCard = ({
  grossRevenue,
  shippingCost,
  costPercentage = 0.65,
}: FinancialBreakdownCardProps) => {
  const netRevenue = grossRevenue - shippingCost;
  const costOfGoods = netRevenue * costPercentage;
  const grossProfit = netRevenue - costOfGoods;
  const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  const shippingPercentage = grossRevenue > 0 ? (shippingCost / grossRevenue) * 100 : 0;
  const costPercentageDisplay = costPercentage * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          Demonstrativo Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Receita Bruta */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Receita Bruta</span>
          <div className="text-right">
            <span className="text-sm font-semibold">{formatCurrency(grossRevenue)}</span>
            <span className="text-xs text-muted-foreground ml-2">[100%]</span>
          </div>
        </div>

        {/* Frete */}
        <div className="flex items-center justify-between text-red-600/80">
          <span className="text-sm">(-) Frete</span>
          <div className="text-right">
            <span className="text-sm font-medium">{formatCurrency(shippingCost)}</span>
            <span className="text-xs ml-2">[-{shippingPercentage.toFixed(1)}%]</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-border" />

        {/* Receita Líquida */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Receita Líquida</span>
          <div className="text-right">
            <span className="text-sm font-semibold">{formatCurrency(netRevenue)}</span>
            <span className="text-xs text-muted-foreground ml-2">
              [{((netRevenue / grossRevenue) * 100 || 0).toFixed(1)}%]
            </span>
          </div>
        </div>

        {/* Custo dos Produtos */}
        <div className="flex items-center justify-between text-red-600/80">
          <span className="text-sm">(-) Custo ({costPercentageDisplay.toFixed(0)}%)</span>
          <div className="text-right">
            <span className="text-sm font-medium">{formatCurrency(costOfGoods)}</span>
            <span className="text-xs ml-2">
              [-{(grossRevenue > 0 ? (costOfGoods / grossRevenue) * 100 : 0).toFixed(1)}%]
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-border" />

        {/* Lucro Bruto */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Lucro Bruto</span>
          <span className={cn(
            "text-sm font-bold",
            grossProfit >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(grossProfit)}
          </span>
        </div>

        {/* Margem */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm font-semibold">Margem de Contribuição</span>
          <span className={cn(
            "text-lg font-bold",
            profitMargin >= 30 ? "text-green-600" : 
            profitMargin >= 20 ? "text-yellow-600" : "text-red-600"
          )}>
            {profitMargin.toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
