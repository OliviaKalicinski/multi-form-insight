

# Filtro de Segmento B2B — Implementação Final

## Resumo
5 arquivos. Zero mudanças em fórmulas. Filtro nos dados de entrada com `.toLowerCase()` defensivo e tratamento de string vazia.

## 1. `src/utils/revenue.ts` — +2 funções (após linha 25)

```typescript
export const getComiDaDragaoOrders = (orders: ProcessedOrder[]): ProcessedOrder[] =>
  orders.filter(o => o.segmentoCliente?.toLowerCase() !== 'b2b');

export const getB2COrders = (orders: ProcessedOrder[]): ProcessedOrder[] =>
  orders.filter(o => {
    const seg = o.segmentoCliente?.toLowerCase();
    return !seg || seg === 'b2c';
  });
```

The `!seg` check handles both `undefined` and empty string `""`.

## 2. `src/pages/PerformanceFinanceira.tsx`

**Line 22** — add to import:
```typescript
import { getOfficialRevenue, getRevenueOrders, getComiDaDragaoOrders } from "@/utils/revenue";
```

**After line 50** — add memoized filter:
```typescript
const cdSalesData = useMemo(() => getComiDaDragaoOrders(salesData), [salesData]);
```

**Replace all `salesData`** (except the destructuring at line 38) with `cdSalesData`. Verified occurrences at lines: 55, 57, 71, 73, 74, 76, 80, 92, 100, 102, 106, 109, 114, 124, 134, 153, 156, 157, 161, 162, 163, 167, 171, 172, 202, 238, 239, 240, 247.

## 3. `src/pages/ExecutiveDashboard.tsx`

**After line 34** — add import:
```typescript
import { getComiDaDragaoOrders } from "@/utils/revenue";
```

**Line 58** — change:
```diff
-   return salesData as ProcessedOrder[];
+   return getComiDaDragaoOrders(salesData as ProcessedOrder[]);
```

Everything downstream uses `processedOrders` — filter propagates automatically.

## 4. `src/pages/VisaoExecutivaV2.tsx`

**Add import** (after line 17):
```typescript
import { getComiDaDragaoOrders } from "@/utils/revenue";
```

**After line 107** (inside the component, after useState blocks):
```typescript
const cdSalesData = useMemo(() => getComiDaDragaoOrders(salesData), [salesData]);
```

**Replace `salesData`** with `cdSalesData` at lines: 118, 119, 120, 124, 128, 136, 137, 332.

## 5. `src/pages/ComportamentoCliente.tsx`

**Add import** (after line 24):
```typescript
import { getB2COrders } from "@/utils/revenue";
```

**After line 37** (after useState):
```typescript
const b2cSalesData = useMemo(() => getB2COrders(salesData), [salesData]);
```

**Replace `salesData`** with `b2cSalesData` at lines: 51, 52, 53, 54, 67, 71, 72, 77, 98, 104, 118, 120.

## Impact
- Zero formula changes
- Case-insensitive + empty string safe
- Pages outside "Comida de Dragão" unaffected
- Backward compatible with missing `segmentoCliente`

