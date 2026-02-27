
# Classificacao Economica de NFs (`tipo_movimento`) -- Plano Final

## Problema

A tabela `sales_data` mistura vendas reais com movimentos promocionais (brindes, bonificacoes, doacoes), distorcendo receita, ticket medio, ROAS e cobertura de `numero_pedido_plataforma`.

## Principio Central

**Natureza da Operacao manda. Observacoes apenas complementa.** Como "Remessa de Bonificacao" e um campo fiscal estruturado, a classificacao e deterministica -- nao heuristica.

---

## Etapa 1: Migracao SQL

Duas colunas novas em `sales_data`:

```sql
ALTER TABLE sales_data ADD COLUMN tipo_movimento TEXT DEFAULT 'venda';
ALTER TABLE sales_data ADD COLUMN observacoes_nf TEXT;
```

---

## Etapa 2: Tipo ProcessedOrder (`src/types/marketing.ts`, apos linha 219)

Adicionar antes do fechamento da interface:

```typescript
tipoMovimento?: 'venda' | 'brinde' | 'bonificacao' | 'doacao' | 'ajuste' | 'devolucao';
observacoesNF?: string;
```

---

## Etapa 3: Classificador no Parser (`src/utils/invoiceParser.ts`)

### 3a. Funcao `classifyMovementType`

Prioridade absoluta para `natureza_operacao` (campo estruturado). Fallback para `observacoes` (campo livre) apenas quando natureza nao classifica.

```typescript
const normalizeText = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

const NATUREZA_RULES = [
  { type: 'devolucao',   pattern: /devol/ },
  { type: 'bonificacao', pattern: /remessa.*bonifica|bonifica/ },
  { type: 'brinde',      pattern: /remessa.*brinde|brinde/ },
  { type: 'doacao',      pattern: /doacao|remessa gratuita/ },
  { type: 'ajuste',      pattern: /nota complementar|complementar|ajuste/ },
];

const OBSERVACOES_RULES = [
  { type: 'brinde', pattern: /influenciador/ },
];
```

Ordem: natureza primeiro, observacoes depois, default `'venda'`.

### 3b. Aplicar no loop de construcao de pedidos (linha ~219)

- Chamar `classifyMovementType(first["Natureza da operacao"], first["Observacoes"])`
- Atribuir `tipoMovimento` e persistir `observacoesNF`

### 3c. Recalcular cobertura apenas sobre vendas

Filtrar `consolidated` para `tipoMovimento === 'venda'` antes de calcular cobertura. Expandir `InvoiceProcessingResult`:

```typescript
classificacao: Record<string, number>;
coberturaApenasVendas: number;
vendasComId: number;
vendasSemId: number;
```

### 3d. Logs enriquecidos

```text
[NF] Classificacao: venda=X, brinde=Y, bonificacao=Z, doacao=W, ajuste=A, devolucao=D
[NF] Cobertura pedido_plataforma (apenas vendas): X/Y (Z%)
```

---

## Etapa 4: Persistencia (`src/hooks/useDataPersistence.ts`)

### Save (linha ~322, mapeamento NF)

Adicionar ao objeto de rows:

```
tipo_movimento: order.tipoMovimento || 'venda',
observacoes_nf: order.observacoesNF || null,
```

### Load (linha ~176, mapeamento de leitura)

Adicionar:

```
tipoMovimento: row.tipo_movimento || 'venda',
observacoesNF: row.observacoes_nf || undefined,
```

---

## Etapa 5: Filtro centralizado (`src/utils/revenue.ts`)

Adicionar ao arquivo existente (sem alterar `getOfficialRevenue`):

```typescript
export const isRevenueOrder = (order: ProcessedOrder): boolean => {
  const tipo = order.tipoMovimento || 'venda';
  return tipo === 'venda';
};

export const getRevenueOrders = (orders: ProcessedOrder[]): ProcessedOrder[] =>
  orders.filter(isRevenueOrder);
```

---

## Etapa 6: Filtragem dentro de `calculateRevenue` (Opcao B)

Em `src/utils/salesCalculator.ts` (linha 191), alterar para filtrar internamente:

```typescript
export const calculateRevenue = (orders: ProcessedOrder[]): number => {
  return getRevenueOrders(orders).reduce((sum, order) => sum + getOfficialRevenue(order), 0);
};
```

Unico ponto de filtragem economica. `calculateAverageTicket` herda automaticamente.

---

## Etapa 7: UI (`src/components/dashboard/SalesUploader.tsx`)

### 7a. Toast atualizado (linhas 119-125)

Usar `coberturaApenasVendas` e mostrar resumo de classificacao:

```
"Rastreabilidade vendas: 96.2% (248/258).
 Classificadas: 48 brindes, 12 bonificacoes."
```

Toast destrutivo apenas se cobertura de vendas < 90%.

### 7b. Indicador permanente

Badge discreto abaixo do resultado de upload mostrando rastreabilidade.

---

## O que NAO muda

- `getOfficialRevenue` inalterado (fiscal puro)
- Constraint `uq_sales_nota_serie` intacta
- RPC `nf_snapshot_and_purge` inalterada
- Trigger `enforce_nf_precedence` inalterado
- Dados ecommerce recebem default `'venda'` automaticamente

---

## Arquivos modificados

1. **Nova migracao SQL** -- 2 colunas
2. **`src/types/marketing.ts`** -- 2 campos em `ProcessedOrder`
3. **`src/utils/invoiceParser.ts`** -- `classifyMovementType`, cobertura recalculada, `InvoiceProcessingResult` expandido
4. **`src/hooks/useDataPersistence.ts`** -- mapeamento save/load
5. **`src/utils/revenue.ts`** -- `isRevenueOrder` + `getRevenueOrders`
6. **`src/utils/salesCalculator.ts`** -- `calculateRevenue` filtra internamente
7. **`src/components/dashboard/SalesUploader.tsx`** -- toast + indicador

## Validacao pos-deploy

1. Re-upload completo de NFs
2. Verificar classificacao no toast
3. Rodar queries de validacao:

```sql
SELECT tipo_movimento, COUNT(*) FROM sales_data WHERE fonte_dados = 'nf' GROUP BY tipo_movimento;

SELECT COUNT(*) total_vendas, COUNT(numero_pedido_plataforma) com_plataforma,
  ROUND(COUNT(numero_pedido_plataforma)*100.0/COUNT(*),2) cobertura_pct
FROM sales_data WHERE fonte_dados = 'nf' AND tipo_movimento = 'venda';
```

4. Comparar receita, ticket medio e ROAS antes/depois
5. Amostragem manual de 10 registros classificados como brinde/bonificacao
