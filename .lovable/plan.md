

# Two Changes: Sorting in Clientes + New/Edit in Atendimentos

## 1. Clientes — Add sortable columns for Segmento, Churn, Pedidos, Responsavel

Currently `SortKey` only supports `'nome' | 'total_revenue' | 'days_since_last_purchase' | 'last_order_date'`. The columns Segmento, Churn, Pedidos, and Responsavel exist in the table but are not clickable for sorting.

**Changes in `src/pages/Clientes.tsx`:**
- Expand `SortKey` type to include `'segment' | 'churn_status' | 'total_orders_revenue' | 'responsavel'`
- Add sort logic for each: segment and churn use string compare, orders uses numeric, responsavel uses string compare
- Add `cursor-pointer` + `onClick={() => toggleSort(...)}` + `ArrowUpDown` icon to the Segmento, Churn, Pedidos, and Responsavel `TableHead` cells (matching existing pattern of Nome and Receita)

## 2. Atendimentos — Add "Novo Atendimento" button + Edit existing

### 2a. "Novo Atendimento" button

The `ContactLogForm` component already exists but requires a `customerId`. For the centralized page, the form needs a customer selector.

**Changes:**
- Create `src/components/crm/ContactLogFormWithCustomerSelect.tsx` — wraps the existing form fields in a Dialog, but adds a customer search/select field at the top (combobox searching `customers` by name/cpf). Once a customer is selected, the `customer_id` is set. Uses same fields as `ContactLogForm`.
- In `Atendimentos.tsx`: add a `Plus` button "Novo Atendimento" in the header (same position as Reclamacoes). Opens the new form dialog. On submit, calls `addLog` mutation and invalidates `all-contact-logs` query.

### 2b. Edit existing atendimento

**Changes:**
- Create `src/components/crm/ContactLogEditForm.tsx` — Dialog pre-populated with existing log data (tipo, motivo, resumo, responsavel, resultado). Same pattern as `ComplaintEditForm`.
- Add `updateLog` mutation to `useAllContactLogs.ts` (or create inline in Atendimentos) — `supabase.from('customer_contact_log').update({...}).eq('id', id)`, then invalidate queries.
- In `Atendimentos.tsx`: add a `Pencil` icon button per row. Clicking opens `ContactLogEditForm` with the selected log. On submit, calls update mutation.

### 2c. Hook changes

- Add `addLog` and `updateLog` mutations to `useAllContactLogs.ts` so the centralized page can create and edit without needing a per-customer hook.

## Files

| File | Action |
|------|--------|
| `src/pages/Clientes.tsx` | Edit — expand SortKey, add clickable headers |
| `src/pages/Atendimentos.tsx` | Edit — add New button, edit button per row |
| `src/hooks/useAllContactLogs.ts` | Edit — add `addLog` and `updateLog` mutations |
| `src/components/crm/ContactLogFormWithCustomerSelect.tsx` | Create — new atendimento form with customer selector |
| `src/components/crm/ContactLogEditForm.tsx` | Create — edit form for existing atendimento |

## Impact
- 0 database migrations (RLS already allows insert/update for authenticated)
- 2 new components (following existing patterns)
- No calculation changes

