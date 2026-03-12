import { HistoricalBenchmark } from "@/utils/metricsCalculator";
import { formatNumber } from "@/utils/metricsCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  benchmarks: HistoricalBenchmark[];
}

function Delta({ value }: { value: number }) {
  if (Math.abs(value) < 1) return <span className="text-muted-foreground">-</span>;
  const up = value > 0;
  return (
    <span className={`flex items-center gap-1 ${up ? "text-green-600" : "text-red-600"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

export function HistoricalBenchmarkTable({ benchmarks }: Props) {
  if (!benchmarks.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">📊 Benchmarks Históricos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Métrica</th>
                <th className="text-right py-2 font-medium">Atual</th>
                <th className="text-right py-2 font-medium">Média 3m</th>
                <th className="text-right py-2 font-medium">vs 3m</th>
                <th className="text-right py-2 font-medium">Média 6m</th>
                <th className="text-right py-2 font-medium">vs 6m</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map(b => (
                <tr key={b.metric} className="border-b last:border-0">
                  <td className="py-2 font-medium">{b.metric}</td>
                  <td className="text-right py-2">{formatNumber(b.currentValue)}</td>
                  <td className="text-right py-2 text-muted-foreground">{formatNumber(b.avg3months)}</td>
                  <td className="text-right py-2">
                    <Delta value={b.vsAvg3} />
                  </td>
                  <td className="text-right py-2 text-muted-foreground">{formatNumber(b.avg6months)}</td>
                  <td className="text-right py-2">
                    <Delta value={b.vsAvg6} />
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