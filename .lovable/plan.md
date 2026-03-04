

# P1-Frontend — Fix read path in useDataPersistence.ts

## Change

**File:** `src/hooks/useDataPersistence.ts`, **line 376**

```typescript
// Before
cpfCnpj: row.cliente_email || "",

// After
cpfCnpj: row.cpf_cnpj || row.cliente_email || "",
```

This ensures the frontend reads the new `cpf_cnpj` column first, falling back to `cliente_email` for legacy records. Without this, the migration's write-side fix is useless — the read path would still grab email instead of the fiscal identifier.

**1 line, 1 file.**

