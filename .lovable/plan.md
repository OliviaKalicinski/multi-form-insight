

# Fix: Deterministic synthetic IDs for NF orders without CPF

**File:** `src/hooks/useDataPersistence.ts`, line 164

## Problem

`Math.random()` fallback creates new customer IDs on every reload, inflating customer counts and all derived metrics (CAC, churn, segmentation).

## Change

Replace line 164:

```typescript
const syntheticId = `nf-${normalize(order.numeroPedido) || Math.random().toString(36).slice(2)}`;
```

With:

```typescript
const rawKey = order.numeroPedido || order.numeroNota || order.idNota || `${new Date(order.dataVenda).toISOString()}-${order.valorTotal}`;
const encoded = btoa(unescape(encodeURIComponent(rawKey)));
const syntheticId = `nf-${encoded.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;
```

Three improvements:
- **Deterministic**: same order → same ID across reloads
- **No empty-key collision**: falls back to `ISO date + value` when all identifiers are missing
- **UTF-8 safe**: `encodeURIComponent` + `unescape` before `btoa`

Includes the `toISOString()` normalization for locale-independent date formatting.

**1 file, 1 line → 3 lines.**

