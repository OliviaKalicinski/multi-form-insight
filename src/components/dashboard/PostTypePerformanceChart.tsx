import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { PostTypeStat } from "@/hooks/useInstagramPosts";

const TYPE_COLORS: Record<string, string> = {
  manifesto: "#8b5cf6",
  educativo: "#3b82f6",
  bastidor: "#f59e0b",
  prova_social: "#10b981",
  oferta: "#ef4444",
  outro: "#6b7280",
};

interface Props {
  stats: PostTypeStat[];
}

export function PostTypePerformanceChart({ stats }: Props) {
  if (stats.length === 0) return null;

  const chartData = stats.map((s) => ({
    name: s.label,
    type: s.type,
    "Eng. Médio": s.avgEngagement,
    "Alcance Médio": s.avgReach,
    "Saves Médio": s.avgSaves,
    posts: s.posts,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">🎯 Performance por Tipo de Conteúdo</CardTitle>
        <CardDescription>
          Engajamento médio por categoria editorial ({stats.reduce((s, x) => s + x.posts, 0)} posts analisados)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [value.toLocaleString("pt-BR"), name]}
                labelFormatter={(label) => {
                  const item = chartData.find((d) => d.name === label);
                  return `${label} (${item?.posts ?? 0} posts)`;
                }}
              />
              <Legend />
              <Bar dataKey="Eng. Médio" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.type} fill={TYPE_COLORS[entry.type] || "#6b7280"} />
                ))}
              </Bar>
              <Bar dataKey="Alcance Médio" fill="#94a3b8" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Saves Médio" fill="#f472b6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Best performer insight */}
        {stats.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
            <span className="font-medium">Destaque:</span>{" "}
            Posts do tipo <strong>{stats[0].label}</strong> têm o maior engajamento médio
            ({stats[0].avgEngagement.toLocaleString("pt-BR")}) com alcance médio de{" "}
            {stats[0].avgReach.toLocaleString("pt-BR")} pessoas.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
