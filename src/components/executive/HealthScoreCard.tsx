import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthScore } from "@/types/executive";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthScoreCardProps {
  healthScore: HealthScore;
}

export const HealthScoreCard = ({ healthScore }: HealthScoreCardProps) => {
  const getStatusColor = (status: HealthScore['status']) => {
    switch (status) {
      case 'excellent': return 'from-green-50 to-emerald-50 border-green-500';
      case 'good': return 'from-blue-50 to-blue-100 border-blue-500';
      case 'warning': return 'from-yellow-50 to-orange-50 border-yellow-500';
      case 'critical': return 'from-red-50 to-red-100 border-red-500';
    }
  };
  
  const getStatusIcon = (status: HealthScore['status']) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <TrendingUp className="h-8 w-8 text-green-600" />;
      case 'warning':
        return <Activity className="h-8 w-8 text-yellow-600" />;
      case 'critical':
        return <TrendingDown className="h-8 w-8 text-red-600" />;
    }
  };
  
  const getStatusLabel = (status: HealthScore['status']) => {
    switch (status) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Bom';
      case 'warning': return 'Atenção';
      case 'critical': return 'Crítico';
    }
  };
  
  return (
    <Card className={cn("border-2 bg-gradient-to-br", getStatusColor(healthScore.status))}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🏥 Health Score do Negócio</span>
          {getStatusIcon(healthScore.status)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-5xl font-black">{healthScore.overall}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Status: {getStatusLabel(healthScore.status)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-2">Escala 0-100</div>
            <div className={cn(
              "inline-block px-3 py-1 rounded-full text-xs font-semibold",
              healthScore.overall >= 80 ? "bg-green-100 text-green-800" :
              healthScore.overall >= 60 ? "bg-blue-100 text-blue-800" :
              healthScore.overall >= 40 ? "bg-yellow-100 text-yellow-800" :
              "bg-red-100 text-red-800"
            )}>
              {healthScore.overall >= 80 ? "🌟 Top Performer" :
               healthScore.overall >= 60 ? "✅ Saudável" :
               healthScore.overall >= 40 ? "⚠️ Precisa Melhorar" :
               "🔴 Ação Urgente"}
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">BREAKDOWN POR ÁREA</div>
          {Object.entries(healthScore.breakdown).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm capitalize">{key}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      value >= 80 ? "bg-green-500" :
                      value >= 60 ? "bg-blue-500" :
                      value >= 40 ? "bg-yellow-500" :
                      "bg-red-500"
                    )}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="text-sm font-semibold w-8">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
