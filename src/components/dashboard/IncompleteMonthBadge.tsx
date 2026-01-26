import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { IncompleteMonthInfo, EqualIntervalComparison } from "@/utils/incompleteMonthDetector";

interface IncompleteMonthBadgeProps {
  monthInfo: IncompleteMonthInfo;
  comparison?: EqualIntervalComparison;
  className?: string;
  size?: "sm" | "md";
}

export const IncompleteMonthBadge = ({
  monthInfo,
  comparison,
  className,
  size = "md",
}: IncompleteMonthBadgeProps) => {
  if (!monthInfo.isIncomplete) return null;

  const tooltipText = comparison?.tooltipText || 
    `Mês em andamento: ${monthInfo.currentDay}/${monthInfo.totalDays} dias (${monthInfo.completionPercentage.toFixed(0)}%)`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={cn(
              "gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20",
              size === "sm" && "text-xs py-0 px-1.5",
              className
            )}
          >
            <Clock className={cn("h-3 w-3", size === "sm" && "h-2.5 w-2.5")} />
            {size === "md" && "Mês em andamento"}
            {size === "sm" && `D1-D${monthInfo.currentDay}`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium">{tooltipText}</p>
          {comparison?.isIncomplete && (
            <p className="text-xs text-muted-foreground mt-1">
              Variações calculadas com intervalo igual para comparação justa
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
