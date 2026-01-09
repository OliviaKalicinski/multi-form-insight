import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { OrderValueDistribution } from "@/types/marketing";
import { cn } from "@/lib/utils";

interface TicketDistributionCompactProps {
  data: OrderValueDistribution[];
  averageTicket: number;
  medianTicket?: number;
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
  medianTicket 
}: TicketDistributionCompactProps) => {
  const maxPercentage = Math.max(...data.map(d => d.percentage));
  const totalOrders = data.reduce((sum, d) => sum + d.count, 0);
  
  // Identificar faixa ideal (R$ 100-200)
  const idealRange = data.find(d => d.range.includes('101-200'));
  const idealPercentage = idealRange?.percentage || 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4 text-primary" />
          Distribuição de Ticket
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Histogram bars */}
        <div className="space-y-2">
          {data.map((item, index) => {
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
            <p className="text-sm font-semibold">{formatCurrency(averageTicket)}</p>
          </div>
          {medianTicket && (
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
