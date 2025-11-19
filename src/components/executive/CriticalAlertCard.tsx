import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CriticalAlert } from "@/types/executive";
import { AlertTriangle, Clock, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CriticalAlertCardProps {
  alert: CriticalAlert;
}

export const CriticalAlertCard = ({ alert }: CriticalAlertCardProps) => {
  const getSeverityConfig = (severity: CriticalAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'from-red-50 to-red-100 border-red-500',
          icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
          badge: 'bg-red-100 text-red-800',
          label: '🔴 CRÍTICO',
        };
      case 'warning':
        return {
          bg: 'from-yellow-50 to-orange-50 border-yellow-500',
          icon: <TrendingDown className="h-5 w-5 text-yellow-600" />,
          badge: 'bg-yellow-100 text-yellow-800',
          label: '🟡 ATENÇÃO',
        };
      case 'info':
        return {
          bg: 'from-blue-50 to-blue-100 border-blue-500',
          icon: <Clock className="h-5 w-5 text-blue-600" />,
          badge: 'bg-blue-100 text-blue-800',
          label: '🔵 INFO',
        };
    }
  };
  
  const config = getSeverityConfig(alert.severity);
  
  return (
    <Card className={cn("border-2 bg-gradient-to-br", config.bg)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {config.icon}
            <span>{alert.title}</span>
          </div>
          <div className={cn("px-2 py-1 rounded text-xs font-semibold", config.badge)}>
            {config.label}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Métrica</div>
            <div className="font-semibold">{alert.metric}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Atual vs Benchmark</div>
            <div className="font-semibold">
              {alert.current.toFixed(2)} vs {alert.benchmark.toFixed(2)}
              <span className="text-xs text-red-600 ml-1">
                ({alert.gap > 0 ? '+' : ''}{alert.gap.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-white/60 rounded p-3 text-sm">
          <div className="font-semibold text-xs text-muted-foreground mb-1">IMPACTO</div>
          <div>{alert.impact}</div>
        </div>
        
        <div className="bg-white/60 rounded p-3 text-sm">
          <div className="font-semibold text-xs text-muted-foreground mb-1">AÇÃO RECOMENDADA</div>
          <div>{alert.action}</div>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted-foreground">Potencial: </span>
              <span className="font-semibold text-green-700">{alert.estimatedFix}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Prazo: </span>
              <span className="font-semibold">
                {format(alert.deadline, "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>
          <div className={cn(
            "px-2 py-1 rounded text-xs font-semibold",
            alert.priority === 'urgent' ? "bg-red-200 text-red-900" :
            alert.priority === 'high' ? "bg-orange-200 text-orange-900" :
            "bg-blue-200 text-blue-900"
          )}>
            {alert.priority === 'urgent' ? '⚡ URGENTE' :
             alert.priority === 'high' ? '🔥 ALTA' :
             '📋 MÉDIA'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
