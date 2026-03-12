import { DayOfWeekStat } from "@/hooks/useInstagramPosts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface Props {
  stats: DayOfWeekStat[];
  bestDay: DayOfWeekStat;
}

type Metric = "avgEngagement" | "avgLikes" | "avgComments";

const METRIC_LABELS: Record<Metric, string> = {
  avgEngagement: "Engajamento",
  avgLikes: "Curtidas",
  avgComments: "Comentários",
};

export function DayOfWeekChart({ stats, bestDay }: Props) {
  const [metric, setMetric] = useState<Metric>("avgEngagement");

  const maxVal = Math.max(...stats.map(s => s[metric]), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <span>📅</span>
              Melhor Dia para Postar
            </CardTitle>
            <CardDescription>
              Média por dia da semana ·{" "}
              <Badge variant="secondary" className="text-xs">
                🏆 {bestDay.day} ({bestDay.posts} posts)
              </Badge>
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {(Object.keys(METRIC_LABELS) as Metric[]).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  metric === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {METRIC_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis hide />
              <Tooltip
                formatter={(val: number) => [val, METRIC_LABELS[metric]]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey={metric} radius={[4, 4, 0, 0]}>
                {stats.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={entry.day === bestDay.day ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {["IMAGE", "VIDEO", "CAROUSEL_ALBUM"].map((_, i) => null)}
          {stats
            .filter(s => s.posts > 0)
            .sort((a, b) => b.avgEngagement - a.avgEngagement)
            .slice(0, 3)
            .map((s, i) => (
              <div
                key={s.day}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
              >
                <span className="text-lg font-bold text-muted-foreground">
                  #{i + 1}
                </span>
                <span className="text-sm font-medium">
                  {s.day}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {s[metric]} avg
                </span>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}