

# Fix: Radar Operacional stuck on loading

## Root Cause

In `src/hooks/useRadarOperacional.ts`, line 112-113:

```typescript
const now = new Date();
const date180dAgo = daysAgo(HISTORICAL_WINDOW_DAYS, now).toISOString();
```

Every render creates a new `Date` with different milliseconds. Since `date180dAgo` is used in the query key (`['radar-sales', date180dAgo]`), React Query treats it as a brand new query every render. This prevents any query from completing, causing infinite loading.

## Fix

1. **Stabilize `now` with `useMemo`** -- recalculate only once per day (or per mount):

```typescript
const now = useMemo(() => new Date(), []);
const date180dAgo = useMemo(
  () => daysAgo(HISTORICAL_WINDOW_DAYS, now).toISOString().split('T')[0],
  [now]
);
```

Using `.split('T')[0]` gives a stable date-only string (`2025-08-31`) for the query key, and `useMemo(() => new Date(), [])` ensures `now` is stable across renders.

2. **Also stabilize the `useMemo` dependency** on line 598:

Change `now.toDateString()` to just use the memoized `now` directly since it's already stable.

## Files Changed

- `src/hooks/useRadarOperacional.ts` -- stabilize `now` and `date180dAgo` with `useMemo`

## Secondary Concern: 1000 Row Limit

The `sales_data` query for the last 180 days might hit the 1000 row limit (4105 total rows in the table). Will add `.limit(5000)` or use pagination if needed after fixing the primary loading bug.
