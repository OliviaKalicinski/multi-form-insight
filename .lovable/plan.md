

# Correcao do Bug de Precedencia NF > Ecommerce

## Problema Confirmado

O bug ainda esta presente em `src/hooks/useDataPersistence.ts` (linhas 348-352). O cast `as any` fecha antes do `.eq("fonte_dados", "nf")`, potencialmente invalidando o filtro e quebrando a regra de precedencia fiscal.

## Correcao

**Arquivo**: `src/hooks/useDataPersistence.ts` (linhas 348-352)

Mover o `as any` para depois de toda a cadeia de filtros:

```typescript
// DE (bug):
const { data: existing } = await (supabase
  .from("sales_data")
  .select("numero_pedido")
  .in("numero_pedido", batch) as any)
  .eq("fonte_dados", "nf");

// PARA (corrigido):
const { data: existing } = await (supabase
  .from("sales_data")
  .select("numero_pedido")
  .in("numero_pedido", batch)
  .eq("fonte_dados", "nf") as any);
```

## Impacto

- Nenhuma mudanca de logica declarada
- Comportamento real corrigido: `.eq("fonte_dados", "nf")` agora faz parte da query
- Regra de precedencia NF > ecommerce passa a funcionar como projetado
- Zero risco de regressao

## Arquivo modificado

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useDataPersistence.ts` | Linha 348-352: mover `as any` para apos `.eq()` |

