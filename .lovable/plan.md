

# Modo comparativo com barras proporcionais nos cards consolidados

## O que muda

Quando `isConsolidated === true`, os 3 cards (Pedidos, Ticket Médio, Ticket Real) mostram `"Por segmento"` como valor principal e barras proporcionais com números em vez de badges. Trend, status e interpretation são removidos.

## Mudanças em `src/pages/ExecutiveDashboard.tsx`

### A. Variável semântica (linha ~72)
```typescript
const isConsolidated = selectedSegment === "all";
```

### B. Substituir `SegmentBreakdownBadges` por `SegmentBreakdownBars` (linhas 48-67)

```tsx
function SegmentBreakdownBars({ data, format }: {
  data: Record<Exclude<SegmentFilter, 'all'>, number>;
  format?: (v: number) => string;
}) {
  const max = SEGMENT_ORDER.reduce((m, k) => Math.max(m, data[k] ?? 0), 1);
  return (
    <div className="space-y-1.5 pt-2">
      {SEGMENT_ORDER.map(key => {
        const value = data[key] ?? 0;
        if (value <= 0) return null;
        const color = SEGMENT_COLORS[key];
        const width = Math.max((value / max) * 100, 4);
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-16 shrink-0">{SEGMENT_LABELS[key]}</span>
            <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
              <div className="h-full rounded" style={{ width: `${width}%`, backgroundColor: color }} />
            </div>
            <span className="text-[10px] tabular-nums font-medium w-16 text-right shrink-0">
              {format ? format(value) : value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

Incorporates all 3 review adjustments: `reduce` for max, `Math.max(..., 4)` for min bar width, no type cast.

### C. Modificar os 3 cards (linhas 485-538)

Build data outside JSX to avoid casts:
```typescript
const pedidosData = SEGMENT_ORDER.reduce((acc, k) => {
  acc[k] = segmentBreakdown[k].pedidos; return acc;
}, {} as Record<Exclude<SegmentFilter, 'all'>, number>);

const ticketData = SEGMENT_ORDER.reduce((acc, k) => {
  acc[k] = segmentBreakdown[k].ticketMedio; return acc;
}, {} as Record<Exclude<SegmentFilter, 'all'>, number>);
```

Then each card follows the pattern:
- **value**: `isConsolidated ? "Por segmento" : <original>`
- **trend**: `isConsolidated ? undefined : <original>`
- **status**: `isConsolidated ? undefined : <original>`
- **interpretation**: `isConsolidated ? undefined : <original>`
- **children**: `{isConsolidated && <SegmentBreakdownBars data={pedidosData} />}`

### Arquivo tocado
`src/pages/ExecutiveDashboard.tsx` — ~45 linhas modificadas

