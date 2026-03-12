import { HistoricalBenchmark, formatNumber } from "@/utils/metricsCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  benchmarks: HistoricalBenchmark[];
}

function Delta({ value }: { value: number }) {
  if (Math.abs(value) < 1)
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
        <Minus className="h-3 w-3" /> estável
      </span>
    );
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
        up ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {value.toFixed(0)}%
    </span>
  );
}

export function HistoricalBenchmarkTable({ benchmarks }: Props) {
  if (!benchmarks.length) return null;

  const days = benchmarks[0]?.daysInCurrentPeriod ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">📊 Benchmarks Históricos</CardTitle>
        <p className="text-xs text-muted-foreground">Média diária · mês atual ({days} dias) vs meses anteriores</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium">Métrica</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Hoje/dia</th>
                <th className="text-right py-2 text-muted-foreground font-medium">vs 3m</th>
                <th className="text-right py-2 text-muted-foreground font-medium">vs 6m</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b) => (
                <tr key={b.metric} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                  <td className="py-2 font-medium text-foreground">{b.metric}</td>
                  <td className="py-2 text-right tabular-nums font-semibold">
                    {formatNumber(b.currentDailyAvg)}
                    <span className="text-muted-foreground font-normal">/dia</span>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <Delta value={b.vsAvg3} />
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        ref: {formatNumber(b.avg3monthsDailyAvg)}/dia
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <Delta value={b.vsAvg6} />
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        ref: {formatNumber(b.avg6monthsDailyAvg)}/dia
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
