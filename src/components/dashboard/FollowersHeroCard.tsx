import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Users, Target, Sparkles } from "lucide-react";

interface FollowersHeroCardProps {
  totalAcumulado: number;
  novosNoMes: number;
  crescimentoPercentual: number;
  mediaDiaria: number;
  meta?: number;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toLocaleString("pt-BR");
};

export const FollowersHeroCard = ({
  totalAcumulado,
  novosNoMes,
  crescimentoPercentual,
  mediaDiaria,
  meta,
}: FollowersHeroCardProps) => {
  const progressoMeta = meta ? Math.min((novosNoMes / meta) * 100, 100) : 0;
  const metaAtingida = meta ? novosNoMes >= meta : false;
  
  const getStatusBadge = () => {
    if (metaAtingida) {
      return { label: "🎯 Meta Atingida", variant: "default" as const, className: "bg-green-500/20 text-green-700 border-green-500/30" };
    }
    if (crescimentoPercentual > 10) {
      return { label: "⚡ Em Crescimento", variant: "default" as const, className: "bg-blue-500/20 text-blue-700 border-blue-500/30" };
    }
    if (crescimentoPercentual < -10) {
      return { label: "📉 Atenção", variant: "default" as const, className: "bg-orange-500/20 text-orange-700 border-orange-500/30" };
    }
    return { label: "📊 Estável", variant: "default" as const, className: "bg-muted text-muted-foreground" };
  };

  const status = getStatusBadge();

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/20 to-transparent rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-fuchsia-500/10 to-transparent rounded-tr-full" />
      
      <CardContent className="p-6 relative z-10">
        {/* Header with badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Total Acumulado</span>
          </div>
          <Badge variant={status.variant} className={status.className}>
            {status.label}
          </Badge>
        </div>

        {/* Main value */}
        <div className="mb-4">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold tracking-tight">
              {formatNumber(totalAcumulado)}
            </span>
            <div className={`flex items-center gap-1 text-sm font-medium ${
              crescimentoPercentual >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {crescimentoPercentual >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {crescimentoPercentual >= 0 ? "+" : ""}
                {crescimentoPercentual.toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">seguidores ganhos desde o início</p>
        </div>

        {/* Progress bar (if meta exists) */}
        {meta && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                Meta do mês
              </span>
              <span className="font-medium">
                {formatNumber(novosNoMes)} / {formatNumber(meta)}
              </span>
            </div>
            <Progress 
              value={progressoMeta} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {progressoMeta.toFixed(0)}% da meta
            </p>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Sparkles className="h-3 w-3" />
              Novos no mês
            </div>
            <span className="text-lg font-semibold text-violet-600">
              +{formatNumber(novosNoMes)}
            </span>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Média diária</div>
            <span className="text-lg font-semibold">
              {mediaDiaria.toFixed(0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
