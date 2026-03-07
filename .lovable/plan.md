

# Segmentar Visao Executiva por B2C / B2B2C / B2B

## Critical finding from code review

`MarketingMetrics` fields are accessed directly (`.toFixed()`, arithmetic) in **4 files**: `ExecutiveDashboard.tsx`, `alertSystem.ts`, `recommendationEngine.ts`, `criticalAnalysis.ts`. Changing types to `number | null` would break all of them.

**Safer approach**: Keep `MarketingMetrics` types as `number` (no null). Instead, add a boolean flag `marketingApplicable: boolean` to `ExecutiveMetrics` that signals whether marketing cards should render. The calculator sets it to `false` when segment is `b2b` or `b2b2c`, and the dashboard uses it to hide/show cards. Alert and recommendation engines remain untouched (they always run on full/B2C data).

## Changes

### 1. Edit `src/utils/revenue.ts` — Add segment helpers (~20 lines)

Add exports:
- `SegmentFilter` type (`'all' | 'b2c' | 'b2b2c' | 'b2b'`)
- `segmentOrders(orders)` returning `{ b2c, b2b2c, b2b }` using existing `getB2COrders`, `getB2B2COrders`, `getB2BOrders`
- `calculateRevenueMix(orders)` returning `{ b2c: {value, percent}, b2b2c: {value, percent}, b2b: {value, percent} }` based on `getOfficialRevenue` sums
- `SEGMENT_COLORS`, `SEGMENT_LABELS`, `SEGMENT_ORDER` constants

### 2. Edit `src/types/executive.ts` — Add 2 fields

- Add `volumeKg?: number` to `VendasMetrics`
- Add `marketingApplicable?: boolean` to `ExecutiveMetrics` (default true, set false for non-B2C segments)
- Add exported `RevenueMix` interface

### 3. Edit `src/utils/executiveMetricsCalculator.ts` — Add segment parameter

**Signature**: `calculateExecutiveMetrics(orders, adsData, month, segment?: SegmentFilter)`

**Logic at start**: 
- `const segments = segmentOrders(orders)`
- If `segment !== 'all'`, replace `orders` with `segments[segment]`
- **ROAS fix**: Always compute ROAS/CAC using B2C revenue: `const b2cRevenueOrders = getRevenueOrders(segments.b2c)` for faturamento in ROAS calc, regardless of segment
- When `segment === 'b2b'` or `'b2b2c'`: set `marketingApplicable = false` on returned object; ROAS/CAC values still computed (from B2C) but won't display
- Add `volumeKg`: `revenueOrders.reduce((s, o) => s + (o.pesoLiquido || 0), 0)`

**Key**: alert system and recommendation engine are NOT touched. They receive the full metrics object and continue working as before. They only run when `previousMetrics` exists (line 178), which means they always use the segment-filtered view — but since marketing values are still numbers (not null), no breakage occurs.

### 4. Edit `src/pages/ExecutiveDashboard.tsx` — Toggle + conditional rendering

**New state**: `const [selectedSegment, setSelectedSegment] = useState<SegmentFilter>('all')`

**Filtering** (after line 88): 
```
const segments = useMemo(() => segmentOrders(monthOrders), [monthOrders]);
const filteredOrders = selectedSegment === 'all' ? monthOrders : segments[selectedSegment];
```
Use `filteredOrders` for `calculateExecutiveMetrics`, `getPlatformPerformance`, and `topProducts` calculation. Pass `selectedSegment` as 4th arg to calculator.

**Revenue mix** (consolidated only): `useMemo(() => calculateRevenueMix(monthOrders), [monthOrders])` — always computed from full monthOrders, not filtered.

**UI toggle**: `ToggleGroup` placed below header div (line 241), before the incomplete month card. Four options with tooltips.

**Conditional card rendering**:
- Wrap ROAS cards (lines 389-429), CAC (431-441), LTV (443-452), LTV/CAC (454-467) in `{currentMetrics.marketingApplicable !== false && (...)}` 
- **Variation calc** (line 166): Guard ROAS variation: `roas: currentMetrics.marketingApplicable !== false ? (currentMetrics.marketing.roasAds - previousMetrics.marketing.roasAds) : null`
- **Revenue card** (consolidated): Add 3 colored badges inside the revenue card showing mix percentages
- **B2B mode**: Add Volume KG `StatusMetricCard` in the satellite grid when `selectedSegment === 'b2b'`
- ROAS card titles in consolidated mode: append "(B2C)" to interpretation text

**Alerts/recommendations**: Pass `filteredOrders`-based metrics. When segment is non-B2C, marketing alerts will still fire based on B2C ROAS values (which is correct — they reflect the actual marketing performance).

## Files touched
1. `src/utils/revenue.ts` — add segmentOrders, RevenueMix calc, constants
2. `src/types/executive.ts` — add volumeKg, marketingApplicable, RevenueMix interface
3. `src/utils/executiveMetricsCalculator.ts` — segment filter + ROAS B2C fix + volumeKg
4. `src/pages/ExecutiveDashboard.tsx` — toggle + conditional cards + revenue mix badges

No database migration. No new files. Alert/recommendation engines untouched.

