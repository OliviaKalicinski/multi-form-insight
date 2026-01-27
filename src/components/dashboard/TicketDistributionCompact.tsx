import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, FlaskConical } from "lucide-react";
import { OrderValueDistribution, ProcessedOrder } from "@/types/marketing";
import { filterRealOrders, getOrderValueDistribution } from "@/utils/financialMetrics";
import { cn } from "@/lib/utils";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TicketDistributionCompactProps {
  data: OrderValueDistribution[];
  averageTicket: number;
  medianTicket?: number;
  rawOrders?: ProcessedOrder[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);

export const TicketDistributionCompact = ({ 
  data, 
  averageTicket,
  medianTicket,
  rawOrders
}: TicketDistributionCompactProps) => {
  const [includeSamples, setIncludeSamples] = useState(true);

  // Recalcular dados quando toggle está desativado
  const { displayData, displayAvgTicket } = useMemo(() => {
    if (includeSamples || !rawOrders) {
      return { displayData: data, displayAvgTicket: averageTicket };
    }
    
    // Filtrar pedidos e recalcular distribuição
    const realOrders = filterRealOrders(rawOrders);
    const newDistribution = getOrderValueDistribution(realOrders);
    const totalRevenue = realOrders.reduce((sum, o) => sum + o.valorTotal, 0);
    const newAvgTicket = realOrders.length > 0 ? totalRevenue / realOrders.length : 0;
    
    return { displayData: newDistribution, displayAvgTicket: newAvgTicket };
  }, [data, averageTicket, rawOrders, includeSamples]);

  const maxPercentage = Math.max(...displayData.map(d => d.percentage));
  
  // Identificar faixa ideal (R$ 100-200)
  const idealRange = displayData.find(d => d.range.includes('101-200'));
  const idealPercentage = idealRange?.percentage || 0;

  const canToggle = !!rawOrders;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" />
            Distribuição de Ticket
          </CardTitle>
          
          {canToggle && (
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={includeSamples ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIncludeSamples(!includeSamples)}
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{includeSamples ? "Incluindo amostras" : "Apenas produtos reais"}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
        </div>
        
        {!includeSamples && canToggle && (
          <p className="text-xs text-amber-600 mt-1">Sem amostras</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {/* Histogram bars */}
        <div className="space-y-2">
          {displayData.map((item, index) => {
            const barWidth = (item.percentage / maxPercentage) * 100;
            const isIdealRange = item.range.includes('101-200') || item.range.includes('100');
            
            return (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-[70px] text-right">
                  {item.range}
                </span>
                <div className="flex-1 bg-muted rounded h-4 relative overflow-hidden">
                  <div
                    className={cn(
                      "h-4 rounded transition-all flex items-center justify-end pr-1",
                      isIdealRange ? "bg-green-500" : "bg-primary"
                    )}
                    style={{ width: `${barWidth}%` }}
                  >
                    {item.percentage >= 10 && (
                      <span className="text-[10px] text-white font-medium">
                        {item.percentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-[35px]">
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Média</p>
            <p className="text-sm font-semibold">{formatCurrency(displayAvgTicket)}</p>
          </div>
          {medianTicket && includeSamples && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Mediana</p>
              <p className="text-sm font-semibold">{formatCurrency(medianTicket)}</p>
            </div>
          )}
        </div>

        {/* Insight */}
        {idealPercentage > 0 && (
          <div className="pt-2 mt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              📊 <span className="font-medium text-green-600">{idealPercentage.toFixed(0)}%</span> dos pedidos
              na faixa ideal (R$100-200)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
