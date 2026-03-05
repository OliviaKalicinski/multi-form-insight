

# Fix: Ticket Médio DRY + Repurchase Rate Bug

## Changes

### 1. `src/utils/salesCalculator.ts` — Fix repurchase rate (lines 210-215)

Replace `orders` with `getRevenueOrders(orders)` so brindes/bonificações stop inflating recurrence:

```typescript
export const calculateRepurchaseRate = (orders: ProcessedOrder[]): number => {
  const revenueOrders = getRevenueOrders(orders);
  if (revenueOrders.length === 0) return 0;
  const clientesMap = new Map<string, number>();
  revenueOrders.forEach((order) => {
    // ...rest unchanged
```

### 2. `src/utils/financialMetrics.ts` — DRY ticket médio (line 4, 630)

Add import of `calculateAverageTicket` and replace inline calculation:

```typescript
// line 4: add to import
import { extractDailyOrders, calculateAverageTicket } from './salesCalculator';

// line 630: replace inline
const averageTicket = calculateAverageTicket(orders);
```

### 3. `src/utils/executiveMetricsCalculator.ts` — DRY ticket médio + fix repurchase (lines 3, 100, 148-158, 192-195)

Import `calculateAverageTicket` and `calculateRepurchaseRate`:

```typescript
// line 3: add imports
import { calculateSalesMetrics, calculateAverageTicket, calculateRepurchaseRate } from "./salesCalculator";

// line 100: replace inline ticket médio
const ticketMedio = calculateAverageTicket(orders);

// lines 148-158: keep clientesUnicos for customer base count (behavioral)
// but add revenue-order tracking for recurrence
// Add after line 158:
const revenueClientesMap = new Map<string, number>();
revenueOrders.forEach(order => {
  revenueClientesMap.set(order.cpfCnpj, (revenueClientesMap.get(order.cpfCnpj) || 0) + 1);
});

// lines 192-195: replace inline recurrence
const clientesRecorrentes = Array.from(revenueClientesMap.values())
  .filter(c => c > 1).length;
const taxaRecompra = totalClientes > 0 ? (clientesRecorrentes / totalClientes) * 100 : 0;
```

Note: We keep `clientesUnicos` counting ALL orders for the customer base (behavioral — a brinde recipient is still a customer), but recurrence now only counts revenue orders. This is the correct semantic split.

### 4. `src/utils/customerBehaviorMetrics.ts` — DRY repurchase (lines 1, 332-339)

Import and delegate:

```typescript
// line 1: add import
import { calculateRepurchaseRate } from "./salesCalculator";

// lines 332-339: replace inline with single call
const taxaRecompra = calculateRepurchaseRate(orders);
```

## Impact

| Metric | Before | After |
|--------|--------|-------|
| Ticket Médio | No change (same formula) | DRY, single source |
| Taxa Recompra | Inflated by brindes | Correct (revenue-only) |

Expected repurchase rate drop: 5-20% depending on brinde volume.

~18 lines changed across 4 files. No UI changes.

