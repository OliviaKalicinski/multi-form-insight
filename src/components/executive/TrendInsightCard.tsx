import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendInsight } from "@/types/executive";
import { CheckCircle, AlertCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendInsightCardProps {
  insight: TrendInsight;
}

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
  
  return (
    <Card className={cn("border-2 bg-gradient-to-br", config.bg)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {config.icon}
            <span>{insight.title}</span>
          </div>
          <div className={cn("px-2 py-1 rounded text-xs font-semibold", config.badge)}>
            {config.label}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed">{insight.description}</p>
        
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
      </CardContent>
    </Card>
  );
};
