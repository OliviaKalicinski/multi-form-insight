import { SEGMENT_ORDER, SEGMENT_LABELS, SEGMENT_COLORS, SegmentFilter } from "@/utils/revenue";

interface SegmentBreakdownBarsProps {
  data: Record<Exclude<SegmentFilter, 'all'>, number>;
  formatValue?: (v: number) => string;
}

export function SegmentBreakdownBars({ data, formatValue }: SegmentBreakdownBarsProps) {
  const max = SEGMENT_ORDER.reduce((m, k) => Math.max(m, data[k] ?? 0), 0) || 1;
  return (
    <div className="space-y-2 pt-2">
      {SEGMENT_ORDER.map(key => {
        const value = data[key] ?? 0;
        const color = SEGMENT_COLORS[key];
        const ratio = value / max;
        const width = Math.min(Math.max(ratio * 100, 1), 100);
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground min-w-[52px] shrink-0">{SEGMENT_LABELS[key]}</span>
            <div className="flex-1 min-w-[90px] h-2 bg-muted rounded overflow-hidden">
              <div
                className="h-full rounded"
                style={{ width: `${width}%`, backgroundColor: color }}
                aria-label={`${SEGMENT_LABELS[key]}: ${formatValue ? formatValue(value) : value}`}
              />
            </div>
            <span className="text-[10px] tabular-nums font-medium min-w-[48px] text-right shrink-0">
              {formatValue ? formatValue(value) : value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
