

# NF como Fonte Primaria: Triggers + Recovery + Revenue Consistency

## Validacoes confirmadas

- `sales_data_log` payload usa chaves corretas: `numero_pedido`, `canal`, `forma_envio` -- UPDATE funcionara
- `getOfficialRevenue` ja faz fallback: `totalFaturado ?? (valorTotal + valorFrete)` -- 19 ecommerce sem NF continuam seguros

## Sequencia de execucao

### 1. SQL Migration: Substituir trigger monolitico por 3 triggers

Dropar `enforce_nf_precedence` (funcao + trigger) e criar:

- **`inherit_ecommerce_metadata`** (BEFORE INSERT): Se NF chega com `numero_pedido_plataforma`, copia `canal` e `forma_envio` do ecommerce correspondente para a NF (somente se NF nao traz esses campos)
- **`block_ecommerce_if_nf_exists`** (BEFORE INSERT): Se ecommerce chega e ja existe NF com `numero_pedido_plataforma` correspondente, RAISE EXCEPTION
- **`delete_ecommerce_if_nf`** (AFTER INSERT): Se NF chega com `numero_pedido_plataforma`, deleta ecommerce duplicado

### 2. SQL Data Update: Recuperar canal/forma_envio das 919 NFs

```text
UPDATE sales_data nf
SET canal = log.payload_completo->>'canal',
    forma_envio = log.payload_completo->>'forma_envio'
FROM sales_data_log log
WHERE log.motivo = 'dedup_nf_precedence'
  AND nf.fonte_dados = 'nf'
  AND nf.numero_pedido_plataforma IS NOT NULL
  AND nf.numero_pedido_plataforma = log.payload_completo->>'numero_pedido'
  AND nf.cliente_email = log.payload_completo->>'cliente_email'
  AND (nf.canal IS NULL OR nf.canal = '');
```

### 3. SQL: Recalcular todos os clientes

Executar `recalculate_all_customers()` para atualizar metricas persistidas.

### 4. Codigo: Corrigir calculadores para usar getOfficialRevenue

Pontos que usam `order.valorTotal` onde deveriam usar `getOfficialRevenue(order)`:

**`src/utils/financialMetrics.ts`** (linhas 384-391):
- `getOrderValueDistribution`: filtro de faixas e soma de receita usam `order.valorTotal`

**`src/utils/customerBehaviorMetrics.ts`**:
- Linha 33, 38: `analyzeChurn` acumula `order.valorTotal`
- Linhas 111, 136, 152, 169: `analyzeOrderVolume` (daily/weekly/monthly/quarterly revenue)

**`src/utils/productOperationsMetrics.ts`**:
- Linhas 162, 166: combinacoes de produto usam `order.valorTotal`
- Linhas 248, 252: shipping methods usam `order.valorTotal`

Cada ponto sera substituido por `getOfficialRevenue(order)` com import adicionado no topo do arquivo.

## O que NAO muda

- Schema de tabelas (nenhuma coluna nova)
- `useCustomerProfile.ts` (deduplicacao defensiva permanece como esta)
- `recalculate_customer` (CTE defensiva permanece)
- Pipeline de ingestao NF e ecommerce
- Arquivos ja corretos: `revenue.ts`, `roasCalculator.ts`, `executiveMetricsCalculator.ts`, `salesCalculator.ts`

## Resultado esperado

- Dashboard de plataforma mostra Shopify/ML/Base corretamente (919 NFs com canal restaurado)
- Receita total inalterada (baseada em `totalFaturado`)
- Futuros uploads NF herdam canal/forma_envio automaticamente via trigger
- `getOfficialRevenue` e a unica funcao de receita em todo o sistema
- Triggers separados, auditaveis, cada um com responsabilidade unica
