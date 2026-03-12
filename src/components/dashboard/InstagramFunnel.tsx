import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Funnel, ArrowDown } from "lucide-react";

export interface FunnelStep {
  label: string;
  value: number;
  color?: string;
}

interface InstagramFunnelProps {
  steps: FunnelStep[];
}

export function InstagramFunnel({ steps }: InstagramFunnelProps) {
  const maxValue = Math.max(...steps.map(s => s.value), 1);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Funnel className="h-4 w-4" />
          Funil Instagram
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, index) => {
            const widthPercent = (step.value / maxValue) * 100;
            const prevValue = index > 0 ? steps[index - 1].value : step.value;
            const conversionRate = index > 0 && prevValue > 0 
              ? ((step.value / prevValue) * 100).toFixed(1) 
              : null;

            return (
              <div key={step.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    {step.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {step.value.toLocaleString("pt-BR")}
                    </span>
                    {conversionRate && (
                      <span className="text-xs text-muted-foreground">
                        ({conversionRate}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative h-8 bg-muted rounded-md overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-primary/80 rounded-md transition-all duration-300"
                    style={{ width: `${widthPercent}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-primary-foreground mix-blend-difference">
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}