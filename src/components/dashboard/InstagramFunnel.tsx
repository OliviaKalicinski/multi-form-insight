import { FunnelStep } from "@/utils/metricsCalculator";
import { formatNumber } from "@/utils/metricsCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  steps: FunnelStep[];
}

export function InstagramFunnel({ steps }: Props) {
  if (!steps.length) return null;

  const maxValue = steps[0].value || 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🎯 Funil de Atenção</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, i) => {
            const widthPct = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
            return (
              <div key={step.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{step.label}</span>
                  <div className="flex items-center gap-2">
                    {step.rate !== null && (
                      <span className="text-xs text-muted-foreground">
                        {step.rate.toFixed(1)}% do anterior
                      </span>
                    )}
                    <span className="font-semibold">
                      {formatNumber(step.value)}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${widthPct}%` }}
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