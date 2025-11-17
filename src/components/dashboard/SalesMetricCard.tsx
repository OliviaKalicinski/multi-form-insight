import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SalesMetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "success" | "warning";
}

export const SalesMetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  subtitle, 
  trend,
  variant = "default" 
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
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <p className={cn("text-sm font-medium mt-2", getTrendColor())}>
            {trend.value >= 0 ? "+" : ""}
            {trend.value.toFixed(1)}% {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
