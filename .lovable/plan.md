

# Fix: Remove PII from AI chat context (LGPD compliance)

**File:** `supabase/functions/chat-with-data/index.ts`

## Problem

Customer names and emails are fetched from `sales_data` and sent to the AI gateway as part of `top_clientes` (lines 247-255 output `nome` and `email`). This exposes PII to a third-party AI service — a LGPD violation.

## Changes

### 1. Remove `cliente_nome` from SELECT (line 65)

```typescript
// Before
"data_venda, valor_total, valor_frete, produtos, canal, status, estado, forma_envio, cupom, cliente_email, cliente_nome",

// After — keep cliente_email for grouping only
"data_venda, valor_total, valor_frete, produtos, canal, status, estado, forma_envio, cupom, cliente_email",
```

### 2. Anonymize customer aggregation (lines 227-255)

Replace the block with PII-free version:
- Remove `nome`/`email` from `customerMap` type
- Normalize email key: `(r.cliente_email || "").toLowerCase().trim()`
- Skip orders without email (`if (!key) continue`)
- Output anonymous labels: `cliente: "Cliente #1"`

```typescript
const customerMap: Record<string, { orders: number; revenue: number; firstOrder: string; lastOrder: string }> = {};
for (const r of rows) {
  const key = (r.cliente_email || "").toLowerCase().trim();
  if (!key) continue;

  if (!customerMap[key]) {
    customerMap[key] = { orders: 0, revenue: 0, firstOrder: r.data_venda, lastOrder: r.data_venda };
  }
  customerMap[key].orders += 1;
  customerMap[key].revenue += Number(r.valor_total || 0);
  const dv = r.data_venda;
  if (dv < customerMap[key].firstOrder) customerMap[key].firstOrder = dv;
  if (dv > customerMap[key].lastOrder) customerMap[key].lastOrder = dv;
}

const topClientes = Object.values(customerMap)
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 30)
  .map((c, i) => ({
    cliente: `Cliente #${i + 1}`,
    total_pedidos: c.orders,
    receita_total: c.revenue.toFixed(2),
    ticket_medio: (c.revenue / c.orders).toFixed(2),
    primeiro_pedido: c.firstOrder?.split("T")[0] || "",
    ultimo_pedido: c.lastOrder?.split("T")[0] || "",
  }));
```

Lines 257-263 (`allCustomers`, segment counts, `taxaRecompra`) remain unchanged — they use `customerMap` values without exposing PII.

### 3. Update system prompt (line 548)

```
// Before
- "top_clientes": top 30 clientes por receita, com nome, email, total de pedidos...

// After
- "top_clientes": top 30 clientes por receita (anonimizados — sem nome ou email por privacidade). Cada entrada tem: cliente (ex: "Cliente #1"), total_pedidos, receita_total, ticket_medio, primeiro_pedido, ultimo_pedido. Use para análise de concentração de receita e comportamento de compra.
```

## Data flow after fix

```text
DB → cliente_email (memory only, for grouping) → anonymous aggregation → "Cliente #1..#30" → AI
```

PII never leaves the edge function. **1 file, 3 locations changed.**

