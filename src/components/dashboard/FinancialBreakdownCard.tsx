import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialBreakdownCardProps {
  grossRevenue: number;
  shippingCost: number;
  costPercentage?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * R29: refatorado para deixar a auditoria contábil clara.
 * - Cada linha mostra o sinal (=, +, −) e o que está sendo somado/subtraído.
 * - A coluna "% sobre Bruta" facilita comparação entre linhas (mesma base).
 * - Margem de Contribuição calculada sobre Receita BRUTA (decisão Bruno 28/04).
 * - Decomposição por canal removida — já existe no card "Receita por Canal".
 *   Antes confundia: as 3 fatias somavam mais que a Receita Líquida porque
 *   o componente externo passava receita bruta enquanto o item ficava
 *   visualmente abaixo de "Líquida".
 *
 * Equação:
 *   Receita Bruta              = R$ X       [100%]
 *   (−) Frete                  = R$ Y       [-Y%]
 *   ────────────────────────
 *   Receita Líquida            = X − Y      [(100−Y)%]
 *   (−) Custo (z% da Líquida)  = (X−Y) × z  [-(100−Y)×z/100 %]
 *   ────────────────────────
 *   Lucro Bruto                = (X−Y) × (1−z)
 *   Margem de Contribuição     = Lucro Bruto ÷ Receita Bruta
 */
export const FinancialBreakdownCard = ({
  grossRevenue,
  shippingCost,
  costPercentage = 0.65,
}: FinancialBreakdownCardProps) => {
  const netRevenue = grossRevenue - shippingCost;
  const costOfGoods = netRevenue * costPercentage;
  const grossProfit = netRevenue - costOfGoods;
  // R29: margem sobre Receita Bruta (definição operacional do Bruno).
  const profitMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

  const pct = (v: number) => (grossRevenue > 0 ? (v / grossRevenue) * 100 : 0);
  const shippingPct = pct(shippingCost);
  const netPct = pct(netRevenue);
  const costPct = pct(costOfGoods);
  const profitPct = pct(grossProfit);

  const Row = ({
    sign,
    label,
    value,
    valuePct,
    bold = false,
    muted = false,
    highlight,
  }: {
    sign: "=" | "+" | "−";
    label: string;
    value: number;
    valuePct: number;
    bold?: boolean;
    muted?: boolean;
    highlight?: "green" | "red" | "yellow";
  }) => {
    const colorClass =
      highlight === "green"
        ? "text-green-600"
        : highlight === "red"
          ? "text-red-600"
          : highlight === "yellow"
            ? "text-yellow-600"
            : "";
    return (
      <div className={cn("flex items-baseline justify-between", muted && "text-muted-foreground")}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono w-3 text-center text-muted-foreground">{sign}</span>
          <span className={cn("text-sm", bold && "font-semibold")}>{label}</span>
        </div>
        <div className={cn("text-right", colorClass)}>
          <span className={cn("text-sm tabular-nums", bold && "font-semibold")}>
            {sign === "−" && "(" }
            {formatCurrency(value)}
            {sign === "−" && ")"}
          </span>
          <span className="text-xs text-muted-foreground ml-2 tabular-nums">
            [{valuePct.toFixed(1)}%]
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Demonstrativo Financeiro
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">% sempre sobre Receita Bruta</p>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <Row sign="=" label="Receita Bruta" value={grossRevenue} valuePct={100} bold />
        <Row sign="−" label="Frete" value={shippingCost} valuePct={shippingPct} muted />

        <div className="border-t border-dashed pt-2" />

        <Row sign="=" label="Receita Líquida" value={netRevenue} valuePct={netPct} bold />
        <Row
          sign="−"
          label={`Custo (${(costPercentage * 100).toFixed(0)}% da líquida)`}
          value={costOfGoods}
          valuePct={costPct}
          muted
        />

        <div className="border-t border-dashed pt-2" />

        <Row
          sign="="
          label="Lucro Bruto"
          value={grossProfit}
          valuePct={profitPct}
          bold
          highlight={grossProfit >= 0 ? "green" : "red"}
        />

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Margem de Contribuição</span>
            <span className="text-[10px] text-muted-foreground">Lucro Bruto ÷ Receita Bruta</span>
          </div>
          <span
            className={cn(
              "font-bold text-lg tabular-nums",
              profitMargin >= 60
                ? "text-green-600"
                : profitMargin >= 40
                  ? "text-yellow-600"
                  : "text-red-600",
            )}
          >
            {profitMargin.toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
