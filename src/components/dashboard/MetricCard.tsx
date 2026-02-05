import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectionData } from "@/utils/incompleteMonthDetector";
import { KPITooltip } from "./KPITooltip";
import { MetricNature, MetricAuthority, requiresExplicitWarning } from "@/types/metricNature";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Info } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  subtitle?: string;
  variant?: "default" | "success" | "warning";
  isIncomplete?: boolean;
  projectionData?: ProjectionData | null;
  tooltipKey?: string;
  nature?: MetricNature;
  authority?: MetricAuthority;
}

export const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  subtitle, 
  variant = "default",
  isIncomplete = false,
  projectionData = null,
  tooltipKey,
  nature,
  authority,
}: MetricCardProps) => {
  const getTrendColor = () => {
    if (trend === undefined) return "";
    if (trend > 0) return "text-success";
    if (trend < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-success/20 bg-success-light/50";
      case "warning":
        return "border-warning/20 bg-warning-light/50";
      default:
        return "";
    }
  };

  const cardContent = (
    <Card className={cn("transition-all duration-300 hover:shadow-lg", getVariantStyles())}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {nature && nature !== 'REAL' && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] px-1.5 py-0",
                nature === 'ESTIMATED' && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
                nature === 'INFERRED' && "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
              )}
            >
              {nature === 'ESTIMATED' ? 'EST' : 'INF'}
            </Badge>
          )}
          {authority && requiresExplicitWarning(authority) && (
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant="destructive" 
                  className="text-[10px] px-1.5 py-0 flex items-center gap-0.5"
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                  REST
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  <strong>Métrica Restrita:</strong> Esta métrica usa dados estimados ou não tem
                  confiabilidade suficiente para gerar alertas ou recomendações automáticas.
                </p>
              </TooltipContent>
            </Tooltip>
          )}
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
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend !== undefined && (
          <p className={cn("text-sm font-medium mt-2", getTrendColor())}>
            {trend >= 0 ? "+" : ""}
            {trend.toFixed(1)}% vs mês anterior
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

  if (tooltipKey) {
    return <KPITooltip metricKey={tooltipKey}>{cardContent}</KPITooltip>;
  }

  return cardContent;
};
