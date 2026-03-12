import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle } from "lucide-react";
import type { DayOfWeekStat } from "@/hooks/useInstagramPosts";

interface DayOfWeekChartProps {
  stats: DayOfWeekStat[];
  bestDay?: DayOfWeekStat;
}

export function DayOfWeekChart({ stats, bestDay }: DayOfWeekChartProps) {
  const maxEngagement = Math.max(...stats.map(s => s.avgEngagement), 1);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Melhor Dia para Postar
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bestDay && bestDay.posts >= 2 && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Recomendação</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Postar às <span className="font-semibold text-foreground">{bestDay.day}s</span> gera melhor engajamento
              ({bestDay.avgEngagement.toLocaleString("pt-BR")} curtidas + comentários em média)
            </p>
          </div>
        )}

        <div className="space-y-2">
          {stats.map((stat) => {
            const widthPercent = (stat.avgEngagement / maxEngagement) * 100;
            const isBest = bestDay?.dayIndex === stat.dayIndex;

            return (
              <div key={stat.day} className="flex items-center gap-3">
                <span className="w-8 text-xs font-medium text-muted-foreground">
                  {stat.day}
                </span>
                <div className="flex-1 relative h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                      isBest ? "bg-primary" : "bg-primary/40"
                    }`}
                    style={{ width: `${Math.max(widthPercent, 5)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">
                    {stat.avgEngagement > 0 ? stat.avgEngagement.toLocaleString("pt-BR") : "-"}
                  </span>
                </div>
                <span className="w-8 text-xs text-muted-foreground text-right">
                  {stat.posts} posts
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          Baseado em {stats.reduce((sum, s) => sum + s.posts, 0)} posts analisados
        </div>
      </CardContent>
    </Card>
  );
}