import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { KPITooltip } from "./KPITooltip";

export type StatusType = 'success' | 'warning' | 'danger' | 'neutral';

interface StatusMetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  benchmark?: {
    value: number;
    label: string;
  };
  status?: StatusType;
  interpretation?: string;
  size?: 'compact' | 'default' | 'large';
  className?: string;
  invertTrend?: boolean; // For metrics where lower is better (CAC, CPA, etc.)
  tooltipKey?: string;
  children?: React.ReactNode;
}

const statusConfig: Record<StatusType, { color: string; bgColor: string; borderColor: string; badge: string }> = {
  success: {
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badge: 'Excelente',
  },
  warning: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badge: 'Atenção',
  },
  danger: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badge: 'Crítico',
  },
  neutral: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-muted',
    badge: 'Normal',
  },
};

export function StatusMetricCard({
  title,
  value,
  icon,
  trend,
  trendLabel = 'vs mês anterior',
  benchmark,
  status = 'neutral',
  interpretation,
  size = 'default',
  className,
  invertTrend = false,
  tooltipKey,
  children,
}: StatusMetricCardProps) {
  const config = statusConfig[status];
  
  const getTrendIcon = () => {
    if (trend === undefined) return null;
    const isPositive = invertTrend ? trend < 0 : trend > 0;
    const isNegative = invertTrend ? trend > 0 : trend < 0;
    
    if (isPositive) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (isNegative) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (trend === undefined) return '';
    const isPositive = invertTrend ? trend < 0 : trend > 0;
    const isNegative = invertTrend ? trend > 0 : trend < 0;
    
    if (isPositive) return 'text-emerald-600';
    if (isNegative) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const isCompact = size === 'compact';
  const isLarge = size === 'large';

  const cardContent = (
    <Card 
      className={cn(
        "transition-all",
        status !== 'neutral' && `${config.bgColor} ${config.borderColor}`,
        isLarge && "md:col-span-2 md:row-span-2",
        className
      )}
    >
      <CardHeader className={cn(
        "pb-2",
        isCompact && "p-2 pb-1",
        isLarge && "pb-3"
      )}>
        <CardTitle className="flex items-center justify-between">
          <div className={cn(
            "font-medium text-muted-foreground flex items-center gap-1.5",
            isCompact ? "text-[10px]" : isLarge ? "text-sm" : "text-xs"
          )}>
            {icon}
            {title}
          </div>
          {status !== 'neutral' && !isCompact && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] font-medium",
                config.color,
                config.borderColor
              )}
            >
              {config.badge}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(
        "space-y-3",
        isCompact && "p-2 pt-0 space-y-1"
      )}>
        {/* Main Value */}
        <div className={cn(
          "font-bold",
          isCompact ? "text-lg" : isLarge ? "text-4xl" : "text-2xl",
          status !== 'neutral' && config.color
        )}>
          {value}
        </div>

        {/* Trend - Compact inline version */}
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1",
            isCompact && "text-[10px]"
          )}>
            {getTrendIcon()}
            <span className={cn(
              "font-medium",
              isCompact ? "text-[10px]" : "text-sm",
              getTrendColor()
            )}>
              {trend >= 0 ? '+' : ''}{typeof trend === 'number' ? trend.toFixed(0) : trend}%
            </span>
            {!isCompact && (
              <span className="text-xs text-muted-foreground">{trendLabel}</span>
            )}
          </div>
        )}

        {/* Benchmark - Hidden in compact */}
        {benchmark && !isCompact && (
          <div className={cn(
            "pt-2 border-t space-y-1",
            isLarge && "pt-3"
          )}>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{benchmark.label}</span>
              <span className="font-medium">{benchmark.value}</span>
            </div>
            {interpretation && (
              <p className="text-xs text-muted-foreground">
                {interpretation}
              </p>
            )}
          </div>
        )}

        {/* Interpretation without benchmark - Hidden in compact */}
        {!benchmark && interpretation && !isCompact && (
          <p className="text-xs text-muted-foreground pt-1">
            {interpretation}
          </p>
        )}

        {/* Custom children slot */}
        {children && !isCompact && (
          <div className="mt-2">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (tooltipKey) {
    return <KPITooltip metricKey={tooltipKey}>{cardContent}</KPITooltip>;
  }

  return cardContent;
}

// Helper function to determine status based on value and benchmark
export function getStatusFromBenchmark(
  value: number,
  benchmark: number,
  options: {
    invertComparison?: boolean; // For metrics where lower is better
    warningThreshold?: number;  // % below/above benchmark for warning
    dangerThreshold?: number;   // % below/above benchmark for danger
  } = {}
): StatusType {
  const {
    invertComparison = false,
    warningThreshold = 10,
    dangerThreshold = 25,
  } = options;

  const percentDiff = ((value - benchmark) / benchmark) * 100;
  
  if (invertComparison) {
    // Lower is better (CAC, CPA, Churn, etc.)
    if (percentDiff <= -warningThreshold) return 'success';
    if (percentDiff >= dangerThreshold) return 'danger';
    if (percentDiff >= warningThreshold) return 'warning';
    return 'neutral';
  } else {
    // Higher is better (ROAS, Revenue, etc.)
    if (percentDiff >= warningThreshold) return 'success';
    if (percentDiff <= -dangerThreshold) return 'danger';
    if (percentDiff <= -warningThreshold) return 'warning';
    return 'neutral';
  }
}

// Helper to format interpretation text
export function formatBenchmarkInterpretation(
  value: number,
  benchmark: number,
  options: { 
    metricName?: string;
    invertComparison?: boolean;
    formatValue?: (v: number) => string;
  } = {}
): string {
  const { metricName = 'valor', invertComparison = false, formatValue = (v) => v.toFixed(1) } = options;
  
  const diff = value - benchmark;
  const percentDiff = ((diff / benchmark) * 100).toFixed(0);
  
  if (invertComparison) {
    if (diff < 0) return `${formatValue(Math.abs(diff))} abaixo da referência (${Math.abs(Number(percentDiff))}% melhor)`;
    if (diff > 0) return `${formatValue(diff)} acima da referência (${percentDiff}% pior)`;
  } else {
    if (diff > 0) return `${formatValue(diff)} acima da referência (${percentDiff}% melhor)`;
    if (diff < 0) return `${formatValue(Math.abs(diff))} abaixo da referência (${Math.abs(Number(percentDiff))}% pior)`;
  }
  
  return 'Na média do setor';
}
