

# Kanban: Novo Cliente + Lote/Preço por Item

## 1. Database Migration

Add `lote` and `valor_unitario` columns to `operational_order_items`:

```sql
ALTER TABLE public.operational_order_items 
  ADD COLUMN IF NOT EXISTS lote text,
  ADD COLUMN IF NOT EXISTS valor_unitario numeric(12,2) CHECK (valor_unitario >= 0);

CREATE INDEX IF NOT EXISTS idx_operational_order_items_lote
  ON public.operational_order_items (lote)
  WHERE lote IS NOT NULL AND lote <> '';
```

## 2. `src/hooks/useOperationalOrders.ts`

**OrderItem interface** (line 6-11): Add `lote` and `valor_unitario`:
```typescript
export interface OrderItem {
  id?: string;
  produto: string;
  quantidade: number;
  unidade: "un" | "kg";
  lote: string;
  valor_unitario?: number;
}
```

**createOrder** (lines 207-212): Add new fields to item insert:
```typescript
lote: item.lote?.trim() || null,
valor_unitario: item.valor_unitario ?? null,
```

**updateOrder** (lines 267-272): Same addition to item insert.

**updateStatus validation** (lines 355-370):
- `aguardando_expedicao`: Remove `isSeeding` gate — accept `destinatario_nome` for ANY natureza when no `customer_id`:
```typescript
if (!order.customer_id) {
  if (!order.destinatario_nome) throw new Error("Cliente ou destinatário é obrigatório");
  if (!order.destinatario_endereco) throw new Error("Endereço do destinatário é obrigatório");
  if (!order.destinatario_cidade) throw new Error("Cidade do destinatário é obrigatória");
  if (!order.destinatario_cep) throw new Error("CEP do destinatário é obrigatório");
}
```
- `fechado`: Replace `order.lote` check with item-level:
```typescript
const missingLote = order.items.some(i => !i.lote || i.lote.trim() === "");
if (missingLote) throw new Error("Todos os itens precisam de lote para fechar");
```

## 3. `src/components/kanban/NewOrderForm.tsx`

**showDestinatario** (line 67): Change to `!selectedCustomer` (remove `isSeeding` condition).

**Customer dropdown** (lines 166-183): Add "+ Cadastrar novo destinatário" button when search has >= 2 chars but no results, and also at bottom of results list.

**Default item** (lines 53, 98, 136): Add `lote: ""`:
```typescript
{ produto: "", quantidade: 1, unidade: "un", lote: "" }
```

**Items section** (lines 248-296): Replace flat rows with card layout per item:
- Product selector (full width top row)
- Below: Qtd | Un | Lote | Valor Unit. (R$) | delete button
- Each item wrapped in a bordered card with `bg-muted/20`

**Total sugerido** (after valor field, ~line 302): Add computed hint when all items have `valor_unitario`:
```tsx
{items.every(i => i.valor_unitario != null) && (
  <p className="text-xs text-muted-foreground">
    Sugerido: R$ {items.reduce((s, i) => s + i.quantidade * (i.valor_unitario || 0), 0).toFixed(2)}
  </p>
)}
```

## 4. `src/components/kanban/EditOrderForm.tsx`

Same changes as NewOrderForm:
- **showDestinatario** (line 85): `!selectedCustomer`
- **Customer dropdown**: Add "+ Cadastrar novo" button
- **Items section** (lines 282-323): Card layout with lote + valor_unitario per item
- **Default item** (lines 100, 134): Include `lote: ""`
- **useEffect** (line 100): Map existing items to include `lote` and `valor_unitario` from DB
- **Total sugerido** hint below valor field
- **Expedição section** (lines 368-393): Remove the order-level "Lote" field (line 372-375), since lote is now per-item

## 5. `src/components/kanban/OrderCard.tsx`

**itemsSummary** (lines 77-79): Append lote when present:
```typescript
const itemsSummary = order.items
  .map((i) => {
    const base = `${getProductDisplayName(i.produto)} x ${i.quantidade}${i.unidade}`;
    return i.lote ? `${base} [Lote ${i.lote}]` : base;
  })
  .join(", ");
```

## Files Summary

| File | Change |
|------|--------|
| Migration SQL | +2 columns, +1 partial index |
| `useOperationalOrders.ts` | Interface + persist + validation |
| `NewOrderForm.tsx` | Destinatário all naturezas + card layout |
| `EditOrderForm.tsx` | Same + remove order-level lote field |
| `OrderCard.tsx` | Show lote per item |

