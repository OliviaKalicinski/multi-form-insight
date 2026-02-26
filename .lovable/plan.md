
## Migração: Partial Unique Index para NF

### Estado Atual (confirmado via query)

A constraint `uq_sales_pedido_fonte` ainda é **global** -- aplica UNIQUE em `(numero_pedido, fonte_dados)` para todas as fontes, incluindo NF. Isso causa o erro 23505 quando múltiplas notas pertencem ao mesmo pedido.

### Migração a Executar

Uma única migração SQL:

```sql
-- 1. Remover constraint global que bloqueia NF multi-nota por pedido
ALTER TABLE sales_data DROP CONSTRAINT IF EXISTS uq_sales_pedido_fonte;

-- 2. Recriar como partial unique index (somente ecommerce)
CREATE UNIQUE INDEX uq_sales_pedido_fonte_ecommerce
  ON sales_data (numero_pedido, fonte_dados)
  WHERE fonte_dados = 'ecommerce';
```

### O que muda

| Antes | Depois |
|-------|--------|
| `UNIQUE (numero_pedido, fonte_dados)` global | Partial index somente para `fonte_dados = 'ecommerce'` |
| NF: 1 linha por pedido (errado) | NF: N linhas por pedido (correto) |
| Ecommerce: protegido | Ecommerce: continua protegido |

### O que NAO muda

- Nenhum arquivo de código alterado
- `uq_sales_nota_serie` permanece intacto
- `.upsert(rows, { onConflict: "numero_nota,serie" })` continua funcionando
- RPC `nf_snapshot_and_purge` continua funcionando
- Dashboard, RLS, e log fiscal inalterados

### Validação pós-migração

Após aplicar, verificar:
1. `uq_sales_pedido_fonte` removida das constraints
2. `uq_sales_pedido_fonte_ecommerce` aparece nos indexes com cláusula `WHERE`
3. Upload do arquivo NF (3101 registros) sem erro 23505
