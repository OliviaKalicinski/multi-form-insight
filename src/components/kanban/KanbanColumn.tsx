import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";

export interface ColumnIndicator {
  label: string;
  count: number;
  variant: "warning" | "success" | "error";
}

const variantStyles: Record<string, string> = {
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

interface KanbanColumnProps {
  title: string;
  count: number;
  color: string;
  columnKey: string;
  indicators?: ColumnIndicator[];
  children: React.ReactNode;
}

export function KanbanColumn({ title, count, color, columnKey, indicators, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });
  const visibleIndicators = (indicators || []).filter((i) => i.count > 0).slice(0, 3);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[280px] w-full max-w-[340px] bg-muted/30 rounded-lg border transition-all",
        isOver && "ring-2 ring-primary",
      )}
    >
      <div className="p-3 border-b space-y-1.5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <Badge variant="secondary" className={cn("text-xs", color)}>
            {count}
          </Badge>
        </div>
        {visibleIndicators.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {visibleIndicators.map((ind) => (
              <span
                key={ind.label}
                className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", variantStyles[ind.variant])}
              >
                {ind.count} {ind.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <ScrollArea className="flex-1 p-2 max-h-[calc(100vh-240px)]">
        <div className="space-y-2 w-full">{children}</div>
      </ScrollArea>
    </div>
  );
}
