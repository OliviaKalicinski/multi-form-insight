import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/**
 * Gráfico de ritmo semanal de novos parceiros (influenciadoras) no trimestre.
 *
 * Extraído da R32 — antes vivia inline em KanbanInfluenciadores.tsx. Movido
 * pra componente compartilhado pra também ser usado em /visao-executiva-v2
 * (decisão Bruno 02/05).
 *
 * Lógica:
 *   - Semanas completas do passado (Mon–Sun anteriores à semana atual):
 *     baseline sintético = total_parceiros_atual / K_past (referência uniforme).
 *   - Semana atual + futuras: contagem REAL de transições source='trigger'
 *     para "parceiro" (capturadas pela trigger desde 20260422180000).
 */

interface InfluencerBasic {
  id: string;
  status: string;
}

interface PartnerGrowthChartProps {
  /** Cor de tema da página (opcional) — não é usada no chart, mas reserva
      a possibilidade de tonalizar futuramente. */
  accentColor?: string;
}

function currentQuarterRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const qStartMonth = Math.floor(month / 3) * 3;
  const start = new Date(year, qStartMonth, 1, 0, 0, 0, 0);
  const end = new Date(year, qStartMonth + 3, 0, 23, 59, 59, 999);
  const monthNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const label = `${monthNames[qStartMonth]}–${monthNames[qStartMonth + 2]}/${year}`;
  return { start, end, label };
}

export function PartnerGrowthChart(_props: PartnerGrowthChartProps = {}) {
  const quarterRange = useMemo(() => currentQuarterRange(), []);

  // Total atual de parceiros (base do baseline sintético).
  const { data: rawInfluencers = [] } = useQuery({
    queryKey: ["partner_growth_chart_parceiros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("influencer_registry")
        .select("id, kanban_status")
        .eq("kanban_status", "parceiro");
      if (error) {
        console.warn("[partner_growth_chart] influencer_registry query falhou:", error.message);
        return [] as InfluencerBasic[];
      }
      return (data ?? []).map((r: any) => ({ id: r.id, status: r.kanban_status })) as InfluencerBasic[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Histórico de transições para "parceiro" no trimestre atual.
  const { data: statusHistory = [] } = useQuery({
    queryKey: [
      "partner_growth_chart_history",
      quarterRange.start.toISOString(),
      quarterRange.end.toISOString(),
    ],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kanban_status_history" as any)
        .select("new_status, changed_at, source")
        .eq("new_status", "parceiro")
        .eq("source", "trigger")
        .gte("changed_at", quarterRange.start.toISOString())
        .lte("changed_at", quarterRange.end.toISOString());
      if (error) {
        console.warn("[partner_growth_chart] kanban_status_history query falhou:", error.message);
        return [] as { new_status: string; changed_at: string; source: string }[];
      }
      return (data ?? []) as { new_status: string; changed_at: string; source: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const weeklyChartData = useMemo(() => {
    const { start: quarterStart, end: quarterEnd } = quarterRange;

    const mondayOf = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const dow = d.getDay();
      d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
      return d;
    };

    const firstMonday = mondayOf(quarterStart);
    const lastMonday = mondayOf(quarterEnd);
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const numWeeks = Math.min(
      16,
      Math.max(1, Math.round((lastMonday.getTime() - firstMonday.getTime()) / weekMs) + 1),
    );

    const currentMonday = mondayOf(new Date());
    const totalParceiros = rawInfluencers.length;

    type Slot = {
      label: string;
      weekStart: Date;
      isPast: boolean;
      parceiro: number;
    };
    const weeks: Slot[] = [];
    for (let w = 0; w < numWeeks; w++) {
      const ws = new Date(firstMonday);
      ws.setDate(firstMonday.getDate() + w * 7);
      const dd = String(ws.getDate()).padStart(2, "0");
      const mm = String(ws.getMonth() + 1).padStart(2, "0");
      weeks.push({
        label: `${dd}/${mm}`,
        weekStart: ws,
        isPast: ws.getTime() < currentMonday.getTime(),
        parceiro: 0,
      });
    }

    const pastCount = weeks.filter((s) => s.isPast).length;
    if (pastCount > 0 && totalParceiros > 0) {
      const base = Math.floor(totalParceiros / pastCount);
      const remainder = totalParceiros - base * pastCount;
      let assigned = 0;
      for (const slot of weeks) {
        if (!slot.isPast) continue;
        slot.parceiro = base;
        assigned += 1;
        if (assigned > pastCount - remainder) slot.parceiro += 1;
      }
    }

    for (const row of statusHistory) {
      const changed = new Date(row.changed_at);
      if (isNaN(changed.getTime())) continue;
      if (changed < quarterStart || changed > quarterEnd) continue;
      for (const slot of weeks) {
        const slotEnd = new Date(slot.weekStart);
        slotEnd.setDate(slot.weekStart.getDate() + 7);
        if (changed >= slot.weekStart && changed < slotEnd) {
          if (!slot.isPast) slot.parceiro += 1;
          break;
        }
      }
    }

    return weeks
      .map(({ label, parceiro, isPast }) => ({ label, parceiro, isPast }))
      .reverse();
  }, [statusHistory, quarterRange, rawInfluencers]);

  if (weeklyChartData.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2 w-full max-w-[1072px] overflow-hidden">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Ritmo semanal — crescimento da base de parceiros</p>
        <Badge variant="outline" className="text-[10px] ml-auto">
          Trimestre {quarterRange.label}
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Semanas passadas mostram a <strong>média histórica</strong> (base atual distribuída uniformemente). A partir da semana atual, cada barra é o <strong>número real</strong> de novos parceiros naquela semana, capturado pelo histórico de transições.
      </p>
      <ResponsiveContainer
        width="100%"
        height={Math.max(220, weeklyChartData.length * 28 + 60)}
      >
        <BarChart
          data={weeklyChartData}
          layout="vertical"
          barCategoryGap="20%"
          margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#888" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: "#888" }}
            axisLine={false}
            tickLine={false}
            width={56}
            interval={0}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(value: number, _name: string, item: any) => [
              value,
              item?.payload?.isPast ? "Média histórica (sintético)" : "Novos parceiros (real)",
            ]}
            labelFormatter={(label) => `Semana de ${label}`}
          />
          <Bar dataKey="parceiro" name="parceiro" radius={[0, 4, 4, 0]}>
            {weeklyChartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isPast ? "#d1d5db" : "#10b981"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-gray-300" />
          Média histórica
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />
          Novos parceiros (real)
        </span>
      </div>
    </div>
  );
}
