import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  subtitle?: string;
  variant?: "default" | "success" | "warning";
}

export const MetricCard = ({ title, value, icon: Icon, trend, subtitle, variant = "default" }: MetricCardProps) => {
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

  return (
    <Card className={cn("transition-all duration-300 hover:shadow-lg", getVariantStyles())}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
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
      </CardContent>
    </Card>
  );
};
