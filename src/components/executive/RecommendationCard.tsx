import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Recommendation } from "@/types/executive";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecommendationCardProps {
  recommendation: Recommendation;
  rank: number;
}

export const RecommendationCard = ({ recommendation, rank }: RecommendationCardProps) => {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: "🥇", color: "bg-yellow-100 text-yellow-800" };
    if (rank === 2) return { emoji: "🥈", color: "bg-gray-200 text-gray-800" };
    if (rank === 3) return { emoji: "🥉", color: "bg-orange-100 text-orange-800" };
    return { emoji: `#${rank}`, color: "bg-blue-100 text-blue-800" };
  };
  
  const badge = getRankBadge(rank);
  
  return (
    <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span>{recommendation.title}</span>
          </div>
          <div className={cn("px-2 py-1 rounded text-xs font-semibold", badge.color)}>
            {badge.emoji}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="bg-green-50 rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">Impacto</div>
            <div className="font-bold text-green-700">{recommendation.impact}</div>
          </div>
          <div className="bg-purple-50 rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">ROI</div>
            <div className="font-bold text-purple-700">{recommendation.roi.toFixed(1)}x</div>
          </div>
          <div className="bg-blue-50 rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">Prazo</div>
            <div className="font-bold text-blue-700">{recommendation.prazo}</div>
          </div>
          <div className="bg-orange-50 rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">Custo</div>
            <div className="font-bold text-orange-700">
              {recommendation.custo === 0 ? 'Grátis' : `R$ ${recommendation.custo}`}
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded p-3">
          <div className="font-semibold text-xs text-muted-foreground mb-2">AÇÕES ESPECÍFICAS</div>
          <ul className="space-y-1.5">
            {recommendation.actions.map((action, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <span className="text-blue-600 font-bold">→</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex items-center justify-between text-xs pt-2 border-t">
          <div>
            <span className="text-muted-foreground">Responsável: </span>
            <span className="font-semibold">{recommendation.responsavel}</span>
          </div>
          <div className={cn(
            "px-2 py-1 rounded",
            recommendation.facilidade === 'alta' ? "bg-green-100 text-green-800" :
            recommendation.facilidade === 'media' ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          )}>
            Facilidade: {recommendation.facilidade}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
