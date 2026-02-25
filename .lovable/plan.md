

# Blindagem de Precedencia NF no Banco de Dados

## Objetivo

Mover a regra de precedencia fiscal (NF > ecommerce) para o banco de dados, substituir partial indexes por constraints reais, e adicionar CHECK constraints + trigger de protecao.

## Validacao Pre-Migration (confirmada)

| Verificacao | Resultado |
|-------------|-----------|
| Ecommerce com `numero_pedido IS NULL` | 0 registros |
| Duplicatas ecommerce | 0 |
| Partial indexes existentes | `idx_sales_pedido_ecommerce` e `idx_sales_nota_serie` confirmados |
| CHECK constraints existentes | Nenhuma (campo livre) |

## Alteracoes

### 1. Migration SQL

Executada em ordem:

1. **Drop partial indexes** `idx_sales_pedido_ecommerce` e `idx_sales_nota_serie` (incompativeis com `ON CONFLICT` do Supabase JS)
2. **UNIQUE constraints reais**:
   - `uq_sales_nota_serie UNIQUE (numero_nota, serie)` -- NULLs nao conflitam
   - `uq_sales_pedido_fonte UNIQUE (numero_pedido, fonte_dados)` -- permite mesmo pedido com fontes diferentes
3. **CHECK constraints**:
   - `chk_nf_has_nota`: NF deve ter `numero_nota IS NOT NULL`
   - `chk_ecommerce_has_pedido`: ecommerce deve ter `numero_pedido IS NOT NULL`
4. **Trigger function** `enforce_nf_precedence()`:
   - Ecommerce + NF ja existe = RAISE EXCEPTION (bloqueia)
   - NF + ecommerce existe = DELETE automatico do ecommerce
   - Protecao contra `numero_pedido IS NULL`
5. **Trigger** `trg_enforce_nf_precedence` BEFORE INSERT FOR EACH ROW

### 2. Codigo: `src/hooks/useDataPersistence.ts`

Linha 393: alterar `onConflict` de `"numero_pedido"` para `"numero_pedido,fonte_dados"` para alinhar com a nova constraint composta.

## Garantias

| Situacao | Resultado |
|----------|-----------|
| Ecommerce depois NF | Ecommerce deletado automaticamente |
| NF depois Ecommerce | Ecommerce bloqueado |
| So NF | Funciona |
| So Ecommerce | Funciona |
| NF sem numero_nota | Bloqueado por CHECK |
| Ecommerce sem numero_pedido | Bloqueado por CHECK |

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| Migration SQL (nova) | Trigger + CHECK + UNIQUE constraints |
| `src/hooks/useDataPersistence.ts` | Linha 393: `onConflict: "numero_pedido,fonte_dados"` |

