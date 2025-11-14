import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { MonthMetric } from "@/types/marketing";

interface ComparisonMetricCardProps {
  title: string;
  icon: LucideIcon;
  metrics: MonthMetric[];
  formatValue?: (value: number) => string;
}

export const ComparisonMetricCard = ({
  title,
  icon: Icon,
  metrics,
  formatValue = (v) => v.toLocaleString("pt-BR"),
}: ComparisonMetricCardProps) => {
  if (metrics.length === 0) return null;

  const sortedMetrics = [...metrics].sort((a, b) => b.value - a.value);
  const bestMonth = sortedMetrics[0];
  const worstMonth = sortedMetrics[sortedMetrics.length - 1];

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.map((metric, index) => (
            <div key={metric.month} className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: metric.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {metric.monthLabel}
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {formatValue(metric.value)}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {metric.percentageChange !== undefined && (
                  <div
                    className={`flex items-center gap-1 text-xs font-medium ${
                      metric.percentageChange >= 0
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {metric.percentageChange >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>
                      {metric.percentageChange >= 0 ? "+" : ""}
                      {metric.percentageChange.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {metrics.length > 1 && (
          <div className="mt-4 pt-4 border-t border-border space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">📈 Melhor:</span>
              <span className="font-medium text-success">{bestMonth.monthLabel}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">📉 Menor:</span>
              <span className="font-medium text-muted-foreground">
                {worstMonth.monthLabel}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
