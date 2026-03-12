import { FunnelStep, formatNumber } from "@/utils/metricsCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  steps: FunnelStep[];
}

export function InstagramFunnel({ steps }: Props) {
  if (!steps.length) return null;

  const maxValue = steps[0].value || 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">🎯 Funil de Atenção</CardTitle>
        <p className="text-xs text-muted-foreground">De cada 100 pessoas que veem → quantas chegam à próxima etapa</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, i) => {
            const widthPct = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
            const isGoodConversion =
              step.conversionRate !== null &&
              ((i === 1 && step.conversionRate >= 40) || // Alcance/Impressões ≥ 40% = ok
                (i === 2 && step.conversionRate >= 2) || // Visitas/Alcance ≥ 2% = ok
                (i === 3 && step.conversionRate >= 5) || // Interações/Visitas ≥ 5% = ok
                (i === 4 && step.conversionRate >= 5)); // Cliques/Visitas ≥ 5% = ok

            return (
              <div key={step.label} className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{step.label}</span>
                    {step.conversionLabel && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          isGoodConversion ? "bg-emerald-500/15 text-emerald-600" : "bg-orange-500/15 text-orange-600"
                        }`}
                      >
                        {step.conversionLabel}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-foreground">{formatNumber(step.value)}</span>
                </div>
                <div className="h-5 rounded-md bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-500"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: step.color,
                      opacity: 0.8,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
