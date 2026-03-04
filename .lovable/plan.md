

# Fix: Churn reference date bug

**File:** `src/utils/customerBehaviorMetrics.ts`

## Problem
`analyzeChurn` uses `new Date()` as reference. For historical datasets (e.g., 2022 data analyzed in 2026), every customer appears as churned → 100% churn rate.

## Changes

**Line 42** — Replace `const hoje = new Date()` with:
```typescript
const dataReferencia = orders.length > 0
  ? new Date(Math.max(...orders.map(o => new Date(o.dataVenda).getTime())))
  : new Date();
```
Uses the most recent order date as reference. Wraps in `new Date()` for robustness against string/timestamp inputs.

**Line 50** — Replace `hoje` with `dataReferencia`:
```typescript
const diasSemComprar = differenceInDays(dataReferencia, cliente.ultimaCompra);
```

**1 file, 2 edits, ~4 lines changed.**

