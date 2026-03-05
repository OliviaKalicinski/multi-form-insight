

# Fix: Ticket Médio DRY + Repurchase Rate Bug

Patch cirúrgico em 4 arquivos, ~18 linhas. Zero impacto de UI.

## Mudanças

### 1. `src/utils/salesCalculator.ts` (linhas 210-215)
Adicionar filtro `getRevenueOrders` na `calculateRepurchaseRate` para que brindes/bonificações não inflem recorrência. Numerador E denominador usam apenas pedidos de receita.

### 2. `src/utils/financialMetrics.ts` (linhas 4 e 630)
- Linha 4: adicionar `calculateAverageTicket` ao import de `./salesCalculator`
- Linha 630: substituir `totalRevenueOrders > 0 ? totalRevenue / totalRevenueOrders : 0` por `calculateAverageTicket(orders)`

### 3. `src/utils/executiveMetricsCalculator.ts` (linhas 3, 100, 192-195)
- Linha 3: adicionar `calculateAverageTicket, calculateRepurchaseRate` ao import
- Linha 100: substituir `pedidos > 0 ? receita / pedidos : 0` por `calculateAverageTicket(orders)`
- Linhas 192-195: substituir 4 linhas de cálculo inline por `const taxaRecompra = calculateRepurchaseRate(orders);`

### 4. `src/utils/customerBehaviorMetrics.ts` (linhas 1-3 e 332-339)
- Adicionar import de `calculateRepurchaseRate` de `./salesCalculator`
- Substituir 8 linhas de lógica inline por `const taxaRecompra = calculateRepurchaseRate(orders);`

## Impacto
- **Ticket médio**: sem mudança (mesma fórmula, apenas DRY)
- **Taxa de recompra**: queda esperada de 5-20% (correção de métrica inflada por brindes)

