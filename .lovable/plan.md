

# Deduplicacao NF + E-commerce: Trigger Fix + Purge + Defesa

## Contexto confirmado por query

- `sales_data`: 3185 NF + 931 ecommerce
- **919 pares duplicados** (98.7% dos ecommerce tem NF correspondente)
- Bug no trigger: `enforce_nf_precedence` compara `numero_pedido = NEW.numero_pedido` (numero interno da NF), mas deveria usar `NEW.numero_pedido_plataforma` (link para ecommerce)
- Indices existentes: `idx_sales_pedido_plataforma` (partial) e `uq_sales_pedido_fonte_ecommerce` -- suficientes para as operacoes

## Sequencia de execucao

### Migracao 1: Snapshot + Purge dos 919 duplicados

Arquivar os 919 registros ecommerce em `sales_data_log` (com motivo `dedup_nf_precedence`) e depois deletar de `sales_data`.

```text
-- 1. Snapshot para audit
INSERT INTO sales_data_log (id_original, numero_nota, serie, numero_pedido, payload_completo, motivo)
SELECT ec.id, ec.numero_nota, ec.serie, ec.numero_pedido, to_jsonb(ec), 'dedup_nf_precedence'
FROM sales_data ec
JOIN sales_data nf ON nf.fonte_dados = 'nf'
  AND nf.numero_pedido_plataforma IS NOT NULL
  AND ec.fonte_dados = 'ecommerce'
  AND ec.numero_pedido = nf.numero_pedido_plataforma
  AND ec.cliente_email = nf.cliente_email;

-- 2. Delete
DELETE FROM sales_data ec
USING sales_data nf
WHERE nf.fonte_dados = 'nf'
  AND nf.numero_pedido_plataforma IS NOT NULL
  AND ec.fonte_dados = 'ecommerce'
  AND ec.numero_pedido = nf.numero_pedido_plataforma
  AND ec.cliente_email = nf.cliente_email;
```

### Migracao 2: Corrigir trigger `enforce_nf_precedence`

Reescrever a funcao para usar o campo correto (`numero_pedido_plataforma`):

```text
-- Quando NF chega com numero_pedido_plataforma:
--   deletar ecommerce cujo numero_pedido == NEW.numero_pedido_plataforma
-- Quando ecommerce chega:
--   bloquear se ja existe NF com numero_pedido_plataforma == NEW.numero_pedido
```

Isso garante que novos uploads NF auto-eliminam ecommerce duplicado.

### Migracao 3: CTE defensiva em `recalculate_customer`

Adicionar CTE que exclui ecommerce quando NF correspondente existe (via `EXISTS`). Isso protege contra duplicatas residuais (NFs sem `numero_pedido_plataforma` ou dados importados fora de ordem).

A CTE `deduplicated` substitui todas as referencias diretas a `sales_data` dentro da funcao (COUNT, SUM, MIN, MAX, ARRAY_AGG).

### Migracao 4: Adicionar indice composto para performance do trigger

```text
CREATE INDEX IF NOT EXISTS idx_sales_fonte_pedido_email
ON sales_data (fonte_dados, numero_pedido, cliente_email);
```

Garante que o DELETE dentro do trigger seja eficiente em volumes maiores.

### Codigo: Deduplicar orders no perfil do cliente

**`src/hooks/useCustomerProfile.ts`**:
- Adicionar `fonte_dados` e `numero_pedido_plataforma` ao select
- Funcao `deduplicateOrders`: dado o array de orders, remove ecommerce cujo `numero_pedido` esta no Set de `numero_pedido_plataforma` das NFs. Para NFs mantidas, herda `canal` do ecommerce correspondente (fallback: canal da propria NF)
- Retornar orders deduplicados

**`src/pages/ClientePerfil.tsx`**:
- Coluna "Fonte" na tabela com badge (NF / Ecommerce)
- Tab "Pedidos" usa contagem deduplicada

### Pos-migracao: Recalcular todos os clientes

Executar `recalculate_all_customers()` para corrigir metricas persistidas (receita, ticket medio, contagem, segmento).

## O que NAO muda

- Nenhum dado NF e deletado
- Pipeline de ingestao NF e ecommerce continuam independentes
- `syncIdentifiers` batch resiliente nao e afetado
- Schema de tabelas nao muda (apenas funcoes, trigger e indice)

## Resultado esperado

- Adriana (011.034.726-90): 4 pedidos reais (nao 8)
- ~919 registros ecommerce duplicados removidos (com audit trail)
- Metricas recalculadas refletindo transacoes reais
- Novos uploads NF auto-eliminam ecommerce via trigger corrigido
- Perfil mostra badge "Fonte" para transparencia

