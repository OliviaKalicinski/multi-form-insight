

# Fix: CAC denominator + recurrence consistency

**File:** `src/utils/executiveMetricsCalculator.ts`

## Problem

Two related issues in lines 168-177:

1. **CAC bug** (approved but not yet applied): `novosClientes` counts customers with exactly 1 order in all history instead of customers whose first purchase is in the selected `month`. Makes CAC artificially low.

2. **Recurrence inconsistency** (new): After fixing CAC, `clientesRecorrentes = totalClientes - novosClientes` becomes semantically wrong because `novosClientes` now means "acquired this month" while `totalClientes` means "unique customers in filtered data". The subtraction no longer yields "customers who reordered."

## Changes (lines 168-177)

Replace the current block with:

```typescript
const totalClientes = clientesUnicos.size;

// Build first-purchase map from all orders
const primeiraCompraPorCliente = new Map<string, Date>();
orders.forEach(o => {
  const cpf = o.cpfCnpj;
  const data = new Date(o.dataVenda);
  if (isNaN(data.getTime())) return;
  if (!primeiraCompraPorCliente.has(cpf) || data < primeiraCompraPorCliente.get(cpf)!) {
    primeiraCompraPorCliente.set(cpf, data);
  }
});

// New customers = first purchase in selected period
let novosClientes = 0;
primeiraCompraPorCliente.forEach((data) => {
  if (!month || month === "all") {
    novosClientes++;
    return;
  }
  const m = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
  if (m === month) novosClientes++;
});

// Recurrence = customers with >1 order (independent of period)
const clientesRecorrentes = Array.from(clientesUnicos.values())
  .filter(c => c.pedidos > 1).length;
const taxaRecompra = totalClientes > 0 ? (clientesRecorrentes / totalClientes) * 100 : 0;

const clientesAtivos = churnAnalysis?.clientesAtivos || totalClientes;
const taxaChurn = churnAnalysis?.taxaChurn || 0;

const ltv = totalClientes > 0 ? receita / totalClientes : 0;
const cac = novosClientes > 0 ? investimentoAds / novosClientes : 0;
```

## What changes

| Metric | Before | After |
|---|---|---|
| `novosClientes` | customers with 1 order ever | first purchase in period |
| `clientesRecorrentes` | `total - novos` (inconsistent) | customers with >1 order |
| `taxaRecompra` | derived from subtraction | derived from actual repeat buyers |
| `cac` | inflated denominator | correct denominator |

**1 file, lines 168-177 replaced with ~30 lines.**

