import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendInsight, InsightClass } from "@/types/executive";
import { CheckCircle, AlertCircle, Lightbulb, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TrendInsightCardProps {
  insight: TrendInsight;
}

const getInsightClassConfig = (insightClass: InsightClass) => {
  switch (insightClass) {
    case 'signal':
      return { label: 'Sinal', color: 'bg-gray-100 text-gray-700 border-gray-300' };
    case 'context':
      return { label: 'Contexto', color: 'bg-blue-100 text-blue-700 border-blue-300' };
    case 'recommendation':
      return { label: 'Recomendação', color: 'bg-green-100 text-green-700 border-green-300' };
  }
};

export const TrendInsightCard = ({ insight }: TrendInsightCardProps) => {
  const getTypeConfig = (type: TrendInsight['type']) => {
    switch (type) {
      case 'sucesso':
        return {
          bg: 'from-green-50 to-emerald-50 border-green-500',
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          badge: 'bg-green-100 text-green-800',
          label: '✅ SUCESSO',
        };
      case 'atencao':
        return {
          bg: 'from-red-50 to-red-100 border-red-500',
          icon: <AlertCircle className="h-5 w-5 text-red-600" />,
          badge: 'bg-red-100 text-red-800',
          label: '⚠️ ATENÇÃO',
        };
      case 'oportunidade':
        return {
          bg: 'from-blue-50 to-blue-100 border-blue-500',
          icon: <Lightbulb className="h-5 w-5 text-blue-600" />,
          badge: 'bg-blue-100 text-blue-800',
          label: '💡 OPORTUNIDADE',
        };
    }
  };
  
  const config = getTypeConfig(insight.type);
  const insightClassConfig = getInsightClassConfig(insight.insightClass);
  
  return (
    <Card className={cn("border-2 bg-gradient-to-br", config.bg)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {config.icon}
            <span>{insight.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Badge de classe do insight */}
            <Badge variant="outline" className={cn("text-[10px] border", insightClassConfig.color)}>
              {insightClassConfig.label}
            </Badge>
            {/* Badge de tipo */}
            <div className={cn("px-2 py-1 rounded text-xs font-semibold", config.badge)}>
              {config.label}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed">{insight.description}</p>
        
        {/* Mostrar razão do bloqueio se existir */}
        {insight.blockedReason && (
          <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{insight.blockedReason}</span>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3 mt-3">
          {insight.metrics.map((metric, index) => (
            <div key={index} className="bg-white/60 rounded p-2">
              <div className="text-xs text-muted-foreground">{metric.label}</div>
              <div className="font-bold">{metric.value}</div>
              {metric.trend !== 0 && (
                <div className={cn(
                  "text-xs font-semibold mt-0.5",
                  metric.trend > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {metric.trend > 0 ? '↑' : '↓'} {Math.abs(metric.trend).toFixed(1)}%
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Mostrar métrica base se existir */}
        {insight.basedOnMetric && (
          <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/50">
            Baseado em: <span className="font-medium">{insight.basedOnMetric}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
