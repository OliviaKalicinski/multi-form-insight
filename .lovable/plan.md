

# Etapa 2 -- Ativacao da Receita Fiscal

## Objetivo
Criar `getOfficialRevenue(order)` e aplicar 17 substituicoes semanticas nos calculos fiscais, corrigindo soma dupla de frete.

---

## 1. Criar `src/utils/revenue.ts`

Nova funcao central que retorna receita fiscal oficial:
- Se `totalFaturado` (NF) existir, usa como autoridade
- Senao, fallback para `valorTotal + valorFrete`

---

## 2. Bloco 1 -- Nucleo Financeiro

### `salesCalculator.ts` (2 trocas)
- **Linha 191**: `calculateRevenue` -- `order.valorTotal` vira `getOfficialRevenue(order)`
- **Linha 276**: `extractDailyRevenue` -- idem

### `roasCalculator.ts` (1 troca)
- **Linha 13**: `faturamentoLiquido` -- base do ROAS passa a ser receita fiscal
- Atualizar comentarios

### `financialMetrics.ts` (10 trocas + correcao soma dupla + audit log)

Trocas diretas (`order.valorTotal` vira `getOfficialRevenue(order)`):
- L176: receita trimestral
- L209: receita por periodo
- L290: receita semanal
- L311: sazonalidade mensal
- L336: sazonalidade trimestral
- L407: plataforma (acumular)
- L412: plataforma (total)
- L532: growth atual
- L544: growth anterior
- L608: totalRevenue geral

**Correcao critica (L609-610)**:
```text
ANTES:
  faturamentoBruto = totalRevenue + freteTotal   // soma dupla apos migracao
  faturamentoLiquido = totalRevenue

DEPOIS:
  faturamentoBruto = totalRevenue                // ja inclui frete via getOfficialRevenue
  faturamentoLiquido = totalRevenue - freteTotal  // ex-frete
```

**L619**: `realRevenue` tambem migra para `getOfficialRevenue(order)`

**Mantidos como valorTotal** (comercial): L384, L390 (`getOrderValueDistribution`)

**Audit log** apos L608:
```typescript
const receitaLegada = orders.reduce((s, o) => s + (o.valorTotal || 0), 0);
const delta = receitaLegada > 0
  ? ((totalRevenue - receitaLegada) / receitaLegada) * 100 : 0;
console.log(`[AUDIT] Legada=${receitaLegada.toFixed(2)} | Fiscal=${totalRevenue.toFixed(2)} | Delta=${delta.toFixed(2)}%`);
```

---

## 3. Bloco 2 -- Executive Metrics

### `executiveMetricsCalculator.ts` (3 trocas)
- **L106**: `receitaReal` -- `o.valorTotal` vira `getOfficialRevenue(o)`
- **L121**: `faturamentoTotal` -- `o.valorTotal` vira `getOfficialRevenue(o)` (corrige inconsistencia historica: comentario dizia "com frete" mas codigo somava apenas valorTotal)
- **L155, L157**: `clientesUnicos.valorTotal` -- vira `getOfficialRevenue(order)` (alimenta LTV)
- **L122**: `freteTotal` **mantido** como `sum(o.valorFrete)` -- necessario para `faturamentoExFrete`
- Consequencia: `roasBruto` (L128) agora usa receita fiscal completa -- correto
- Consequencia: `percentualFrete` (L123) muda para frete/fiscal -- mais correto

---

## 4. Bloco 3 -- CLV

### `customerBehaviorMetrics.ts` (1 troca)
- **L345**: `order.valorTotal` vira `getOfficialRevenue(order)` (CLV)
- Todas as outras ocorrencias permanecem `valorTotal` (comportamentais)

---

## 5. Bloco 4 -- Atualizar `.lovable/plan.md`

Registrar Etapa 2 como implementada com resumo dos 4 blocos.

---

## Arquivos NAO alterados
- `samplesAnalyzer.ts` -- comercial
- `productOperationsMetrics.ts` -- operacional
- `customerBehaviorMetrics.ts` (exceto CLV L345) -- comportamental
- `getOrderValueDistribution` (L384, L390) -- faixas comerciais
- Tipo `ProcessedOrder` -- inalterado
- Nenhum componente de UI

## Validacao
1. Dashboard carrega sem erro
2. Console mostra `[AUDIT]` com delta positivo (proporcional ao frete, ~7-10%)
3. Nenhum NaN em ROAS ou growth
4. Executar `assert-economic-invariants` -- HTTP 200

