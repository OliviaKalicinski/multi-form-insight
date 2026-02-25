
# Etapa 2 -- Ativacao da Receita Fiscal ✅ IMPLEMENTADA

## Resumo
- Criado `src/utils/revenue.ts` com `getOfficialRevenue(order)` como unico ponto de verdade fiscal
- 17 substituicoes semanticas aplicadas em 5 arquivos
- Corrigida soma dupla de frete em `financialMetrics.ts`
- Audit log temporario inserido para validacao do delta

## Arquivos Alterados
1. `src/utils/revenue.ts` — NOVO — funcao central `getOfficialRevenue`
2. `src/utils/salesCalculator.ts` — 2 trocas (`calculateRevenue`, `extractDailyRevenue`)
3. `src/utils/roasCalculator.ts` — 1 troca (base ROAS)
4. `src/utils/financialMetrics.ts` — 10 trocas + correcao soma dupla + audit log
5. `src/utils/executiveMetricsCalculator.ts` — 4 trocas (`receitaReal`, `faturamentoTotal`, `clientesUnicos` x2)
6. `src/utils/customerBehaviorMetrics.ts` — 1 troca (CLV)

## Correcao Critica
```
ANTES: faturamentoBruto = totalRevenue + freteTotal (soma dupla)
DEPOIS: faturamentoBruto = totalRevenue (ja inclui frete via getOfficialRevenue)
         faturamentoLiquido = totalRevenue - freteTotal (ex-frete)
```

## Validacao Esperada
- `[AUDIT]` delta positivo proporcional ao frete (~7-10%)
- Nenhum NaN
- `assert-economic-invariants` HTTP 200
