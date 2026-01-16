import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { MonthMetric } from "@/types/marketing";
import { IncompleteMonthInfo } from "@/utils/incompleteMonthDetector";
import { KPITooltip } from "./KPITooltip";

interface ComparisonMetricCardProps {
  title: string;
  icon: LucideIcon;
  metrics: MonthMetric[];
  formatValue?: (value: number) => string;
  incompleteMonthsInfo?: Map<string, IncompleteMonthInfo>;
  tooltipKey?: string;
}

export const ComparisonMetricCard = ({
  title,
  icon: Icon,
  metrics,
  formatValue = (v) => v.toLocaleString("pt-BR"),
  incompleteMonthsInfo = new Map(),
  tooltipKey,
}: ComparisonMetricCardProps) => {
  if (metrics.length === 0) return null;

  const sortedMetrics = [...metrics].sort((a, b) => b.value - a.value);
  const bestMonth = sortedMetrics[0];
  const worstMonth = sortedMetrics[sortedMetrics.length - 1];

  const cardContent = (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.map((metric, index) => {
            const monthInfo = incompleteMonthsInfo.get(metric.month);
            const isIncomplete = monthInfo?.isIncomplete || false;
            
            return (
              <div key={metric.month} className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: metric.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      {metric.monthLabel}
                      {isIncomplete && (
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                          📅 Up to date
                        </Badge>
                      )}
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
            );
          })}
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

  if (tooltipKey) {
    return <KPITooltip metricKey={tooltipKey}>{cardContent}</KPITooltip>;
  }

  return cardContent;
};
