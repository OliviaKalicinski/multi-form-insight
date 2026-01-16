import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { kpiExplanations } from "@/data/kpiExplanations";

interface KPITooltipProps {
  metricKey: string;
  children: React.ReactNode;
}

export const KPITooltip = ({ metricKey, children }: KPITooltipProps) => {
  const explanation = kpiExplanations[metricKey];
  
  if (!explanation) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="cursor-help transition-opacity hover:opacity-90">
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs p-3 bg-popover border border-border shadow-lg"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">📊</span>
              <span className="font-semibold text-sm text-foreground">Fórmula:</span>
            </div>
            <code className="block text-xs bg-muted px-2 py-1 rounded font-mono text-foreground">
              {explanation.formula}
            </code>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {explanation.description}
            </p>
            {explanation.rules && explanation.rules.length > 0 && (
              <div className="pt-1 border-t border-border">
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {explanation.rules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-primary">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
