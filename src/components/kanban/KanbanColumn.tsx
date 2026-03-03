import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
}

export function KanbanColumn({ title, count, color, children }: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-[280px] w-full max-w-[340px] bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">{title}</h3>
        <Badge variant="secondary" className={cn("text-xs", color)}>
          {count}
        </Badge>
      </div>
      <ScrollArea className="flex-1 p-2 max-h-[calc(100vh-240px)]">
        <div className="space-y-2">
          {children}
        </div>
      </ScrollArea>
    </div>
  );
}
