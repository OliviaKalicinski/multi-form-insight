import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialBreakdownCardProps {
  grossRevenue: number;
  shippingCost: number;
  costPercentage?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }).format(value);
};

export const FinancialBreakdownCard = ({ 
  grossRevenue, 
  shippingCost,
  costPercentage = 0.65
}: FinancialBreakdownCardProps) => {
  const netRevenue = grossRevenue - shippingCost;
  const costOfGoods = netRevenue * costPercentage;
  const grossProfit = netRevenue - costOfGoods;
  const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  const shippingPercent = grossRevenue > 0 ? (shippingCost / grossRevenue) * 100 : 0;
  const costPercent = costPercentage * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Demonstrativo Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Receita Bruta */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Receita Bruta</span>
          <div className="text-right">
            <span className="font-semibold">{formatCurrency(grossRevenue)}</span>
            <span className="text-xs text-muted-foreground ml-2">[100%]</span>
          </div>
        </div>

        {/* Frete */}
        <div className="flex justify-between items-center text-muted-foreground">
          <span className="text-sm">(-) Frete</span>
          <div className="text-right">
            <span className="text-sm">{formatCurrency(shippingCost)}</span>
            <span className="text-xs ml-2">[-{shippingPercent.toFixed(1)}%]</span>
          </div>
        </div>

        <div className="border-t border-dashed pt-2" />

        {/* Receita Líquida */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Receita Líquida</span>
          <div className="text-right">
            <span className="font-semibold">{formatCurrency(netRevenue)}</span>
            <span className="text-xs text-muted-foreground ml-2">[{(100 - shippingPercent).toFixed(1)}%]</span>
          </div>
        </div>

        {/* Custo */}
        <div className="flex justify-between items-center text-muted-foreground">
          <span className="text-sm">(-) Custo ({costPercent.toFixed(0)}%)</span>
          <div className="text-right">
            <span className="text-sm">{formatCurrency(costOfGoods)}</span>
            <span className="text-xs ml-2">[-{(costPercent * (100 - shippingPercent) / 100).toFixed(1)}%]</span>
          </div>
        </div>

        <div className="border-t border-dashed pt-2" />

        {/* Lucro Bruto */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Lucro Bruto</span>
          <div className="text-right">
            <span className={cn(
              "font-semibold",
              grossProfit >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(grossProfit)}
            </span>
          </div>
        </div>

        {/* Margem */}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm font-medium">Margem de Contribuição</span>
          <span className={cn(
            "font-bold text-lg",
            profitMargin >= 30 ? "text-green-600" : profitMargin >= 20 ? "text-yellow-600" : "text-red-600"
          )}>
            {profitMargin.toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
};