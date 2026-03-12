import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { HistoricalBenchmark } from "@/utils/metricsCalculator";

interface HistoricalBenchmarkTableProps {
  benchmarks: HistoricalBenchmark[];
}

export function HistoricalBenchmarkTable({ benchmarks }: HistoricalBenchmarkTableProps) {
  if (!benchmarks || benchmarks.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Benchmarks Históricos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dados históricos insuficientes para comparação.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (percentChange: number) => {
    if (percentChange > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (percentChange < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendClass = (percentChange: number) => {
    if (percentChange > 5) return "text-green-600";
    if (percentChange < -5) return "text-red-600";
    return "text-muted-foreground";
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Benchmarks Históricos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {benchmarks.map((b) => (
            <div key={b.metric} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm font-medium">{b.metric}</span>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm font-semibold">
                    {b.currentValue.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    vs {b.avg3months.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} méd. 3m
                  </span>
                </div>
                <div className={`flex items-center gap-1 ${getTrendClass(b.vsAvg3)}`}>
                  {getTrendIcon(b.vsAvg3)}
                  <span className="text-xs font-medium">
                    {b.vsAvg3 > 0 ? "+" : ""}{b.vsAvg3.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}