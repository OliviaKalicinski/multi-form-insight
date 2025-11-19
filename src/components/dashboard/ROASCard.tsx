import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Target, Percent } from "lucide-react";
import { ROASMetrics } from "@/types/marketing";

interface ROASCardProps {
  metrics: ROASMetrics;
}

export const ROASCard = ({ metrics }: ROASCardProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);

  const formatNumber = (value: number, decimals: number = 2) => 
    value.toFixed(decimals);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          ROAS Real (Return on Ad Spend)
        </CardTitle>
        <CardDescription>
          Retorno sobre investimento em anúncios META (faturamento líquido / investimento)
          <br />
          <span className="text-xs text-muted-foreground">
            💡 Faturamento Líquido = Receita de produtos (sem frete) - Custo de frete
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* ROAS */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>ROAS</span>
            </div>
            <div className="text-3xl font-bold">
              {formatNumber(metrics.roas, 2)}x
            </div>
            <p className="text-xs text-muted-foreground">
              Para cada R$ 1 investido, retornou R$ {formatNumber(metrics.roas, 2)}
            </p>
          </div>

          {/* Faturamento Líquido */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Faturamento Líquido</span>
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.faturamentoLiquido)}
            </div>
            <p className="text-xs text-muted-foreground">
              Bruto: {formatCurrency(metrics.faturamentoBruto)} - Frete: {formatCurrency(metrics.custoFrete)}
            </p>
          </div>

          {/* Investimento Ads */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Investimento META Ads</span>
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.investimentoAds)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total investido em anúncios no período
            </p>
          </div>

          {/* ROI */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Percent className="h-4 w-4" />
              <span>ROI</span>
            </div>
            <div className="text-2xl font-bold">
              {formatNumber(metrics.roi, 1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Margem líquida: {formatNumber(metrics.margemLiquida, 1)}%
            </p>
          </div>
        </div>

        {/* Alerta sobre fonte de dados de frete */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          {metrics.usandoEstimativa ? (
            <p className="text-xs text-muted-foreground">
              ⚠️ <strong>Nota:</strong> Alguns pedidos não possuem valor de frete informado. 
              O custo de frete foi estimado com base na forma de envio para esses casos 
              (PAC/Sedex ~12%, Transportadora ~15%, Expresso ~18%).
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              ✅ <strong>Valores Reais:</strong> Todos os pedidos possuem valor de frete informado. 
              O cálculo está usando dados reais de custo de frete.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
