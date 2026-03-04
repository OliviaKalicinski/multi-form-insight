

# P1 — Separate fiscal identifier from email in `sales_data`

## Problem

The column `cliente_email` in `sales_data` stores both CPF/CNPJ (for NF data) and actual emails (for e-commerce), creating identity collisions. The `recalculate_customer` function joins on this single field, merging unrelated customers.

## Scope

**2 changes:** 1 database migration + 1 frontend file edit.

## Changes

### 1. Database migration

Add a dedicated `cpf_cnpj` column to `sales_data` and backfill it from existing NF records:

```sql
-- Add column
ALTER TABLE public.sales_data ADD COLUMN IF NOT EXISTS cpf_cnpj text;

-- Backfill: copy cliente_email → cpf_cnpj for NF rows
UPDATE public.sales_data
SET cpf_cnpj = cliente_email
WHERE fonte_dados = 'nf'
  AND cliente_email IS NOT NULL
  AND cpf_cnpj IS NULL;

-- Also backfill ecommerce rows that have CPF-like values in cliente_email
UPDATE public.sales_data
SET cpf_cnpj = cliente_email
WHERE fonte_dados = 'ecommerce'
  AND cliente_email IS NOT NULL
  AND cpf_cnpj IS NULL
  AND cliente_email ~ '^\d';
```

Update `recalculate_customer` to prefer `cpf_cnpj` over `cliente_email` with a fallback for backward compatibility:

```sql
-- In recalculate_customer and recalculate_all_customers,
-- change WHERE clause from:
--   WHERE cliente_email = p_cpf_cnpj
-- to:
--   WHERE COALESCE(cpf_cnpj, cliente_email) = p_cpf_cnpj

-- And recalculate_all_customers iteration:
--   SELECT DISTINCT COALESCE(cpf_cnpj, cliente_email) ...
```

Also update `recalculate_all_customers` to iterate over `COALESCE(cpf_cnpj, cliente_email)` instead of just `cliente_email`.

### 2. Frontend: `src/hooks/useDataPersistence.ts`

**Two insert maps** (NF flow ~line 520, ecommerce flow ~line 645) need to also write `cpf_cnpj`:

- NF flow (line 520): add `cpf_cnpj: order.cpfCnpj || null`
- Ecommerce flow (line 645): add `cpf_cnpj: order.cpfCnpj || null`
- Read path (line 376): keep reading from `cliente_email` as fallback (no change needed since `cpf_cnpj` column will also be populated)

**Also update** the edge function `chat-with-data/index.ts` (line 65) to use `COALESCE(cpf_cnpj, cliente_email)` as the grouping key for customer aggregation (line 229).

### 3. Other read paths (no-change needed short term)

These files query `sales_data` filtered by `cliente_email`:
- `src/hooks/useCustomerProfile.ts` (line 101)
- `src/components/crm/ComplaintForm.tsx` (line 66)
- `src/pages/ReclamacaoNova.tsx` (line 107)
- `src/hooks/useRadarOperacional.ts` (line 150)

Since the backfill keeps `cliente_email` populated, these continue working. A follow-up migration can update them to use `cpf_cnpj` with a fallback.

## Verification

After migration:
```sql
SELECT COUNT(*) FROM sales_data WHERE fonte_dados = 'nf' AND cpf_cnpj IS NULL;
-- Should return 0
```

**1 migration + 1 file edited (useDataPersistence.ts) + 1 minor edit (chat-with-data grouping key).**

