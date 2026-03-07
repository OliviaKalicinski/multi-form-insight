

# Ajustar KPIs do Consolidado com breakdown por segmento

## Changes

### 1. `src/components/dashboard/StatusMetricCard.tsx`
- Add `children?: React.ReactNode` to props interface
- Render `{children}` after interpretation blocks, before closing `</CardContent>`

### 2. `src/pages/ExecutiveDashboard.tsx`
- Compute `segmentBreakdown` inside the main `useMemo` (after `segments` is created), calculating `pedidos` and `ticketMedio` per segment using `getRevenueOrders` + `getOfficialRevenue`
- Create inline `SegmentBreakdownBadges` component using `SEGMENT_ORDER`, `SEGMENT_COLORS`, `SEGMENT_LABELS`
- Inject badges as `children` into Pedidos, Ticket Médio, and Ticket Real cards when `selectedSegment === 'all'`
- Add `getRevenueOrders` and `getOfficialRevenue` to the revenue import

### Files touched
1. `src/components/dashboard/StatusMetricCard.tsx` (~4 lines)
2. `src/pages/ExecutiveDashboard.tsx` (~40 lines)

