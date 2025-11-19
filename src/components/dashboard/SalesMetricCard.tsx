import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectionData } from "@/utils/incompleteMonthDetector";

interface SalesMetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "success" | "warning";
  isIncomplete?: boolean;
  projectionData?: ProjectionData | null;
}

export const SalesMetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  subtitle, 
  trend,
  variant = "default",
  isIncomplete = false,
  projectionData = null,
}: SalesMetricCardProps) => {
  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.value > 0) return "text-success";
    if (trend.value < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-success/20 bg-success/5";
      case "warning":
        return "border-warning/20 bg-warning/5";
      default:
        return "";
    }
  };

  return (
    <Card className={cn("transition-all duration-300 hover:shadow-lg", getVariantStyles())}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {isIncomplete && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
              📅 Up to date
            </Badge>
          )}
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
        {trend && (
          <p className={cn("text-sm font-medium mt-2", getTrendColor())}>
            {trend.value >= 0 ? "+" : ""}
            {trend.value.toFixed(1)}% {trend.label}
          </p>
        )}
        
        {isIncomplete && projectionData && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1">
              📊 Projeção (média móvel 30 dias)
            </p>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
              {projectionData.projectionLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Média diária: {projectionData.movingAverage30Days.toLocaleString('pt-BR', { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 0 
              })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
