import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { OrderValueDistribution, ProcessedOrder } from "@/types/marketing";
import { getOrderValueDistribution, filterRealOrders } from "@/utils/financialMetrics";
import { cn } from "@/lib/utils";

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
  rawOrders,
}: TicketDistributionCompactProps) => {
  // R28+R29: filtro pedidos só-amostra via `filterRealOrders` pra distribuição
  // estatística. Mas pra "Ticket Médio" usa o `averageTicket` prop direto —
  // que vem de financialMetrics.ticketMedioReal (fonte canônica, exibida
  // também no header como "Ticket Real"). Antes recalculava ex-frete localmente
  // gerando R$ 85 enquanto header mostrava R$ 112,55. Agora os dois batem.
  const displayData = useMemo(() => {
    if (!rawOrders) return data;
    return getOrderValueDistribution(filterRealOrders(rawOrders));
  }, [data, rawOrders]);
  const ticketMedio = averageTicket;

  const maxPercentage = Math.max(...displayData.map((d) => d.percentage));

  // Identificar faixa ideal (R$ 100-200)
  const idealRange = displayData.find((d) => d.range.includes("101-200"));
  const idealPercentage = idealRange?.percentage || 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4 text-primary" />
          Distribuição de Ticket
        </CardTitle>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Vendas reais · amostras exclusivas excluídas
        </p>
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

        {/* Stats — R27: "Ticket Médio" (receita ex-frete ÷ pedidos reais),
             alinhado ao card "Ticket Real" no header da página. */}
        <div className="pt-3 mt-3 border-t text-center">
          <p className="text-xs text-muted-foreground">Ticket Médio</p>
          <p className="text-sm font-semibold">{formatCurrency(ticketMedio)}</p>
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
