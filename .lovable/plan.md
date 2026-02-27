

# Correção da Página de Amostras: Alinhamento Fiscal + Filtro de Recompras

## Contexto

A página de Amostras opera em paradigma comportamental, mas usa `order.valorTotal` para valores monetários enquanto o resto do dashboard usa `getOfficialRevenue()`. Além disso, bonificações/brindes podem contar como recompras, inflando conversão.

## O que muda

### 1. `src/utils/samplesAnalyzer.ts` -- Import (L1-2)

Adicionar import de `getOfficialRevenue` e `isRevenueOrder` de `./revenue`.

### 2. Substituir `order.valorTotal` por `getOfficialRevenue(order)` em 6 pontos monetários

Estes são os pontos onde o valor é usado para ticket, receita ou LTV -- métricas que o usuário compara com o dashboard:

| Linha | Função | Contexto |
|-------|--------|----------|
| L105 | `groupOrdersByCustomer` | `totalRevenue += order.valorTotal` |
| L156 | `getQualifiedSampleCustomers` | `sortedOrders.reduce(...o.valorTotal...)` |
| L246 | `calculateRepurchaseBehavior` | `totalValue += o.valorTotal` |
| L309 | `calculateCrossSellMetrics` | `productsWithSample[key].totalValue += order.valorTotal` |
| L795 | `calculateCohortAnalysis` | `totalTicket += order.valorTotal` |
| L878 | `calculateSampleMetricsByPetType` | `ticketAccumulator[petType].totalValue += order.valorTotal` |

**Pontos que NÃO mudam** (são puramente sobre volume/perfil do primeiro pedido de amostra, não comparáveis com dashboard):
- L325: ticket médio de pedidos só-amostra (valor ~R$1, contexto de perfil)
- L329: ticket médio de pedidos amostra+outros (cross-sell mix, contexto de cesta)
- L510: `avgFirstOrderValue` no perfil do cliente (primeiro pedido, contexto comportamental)

### 3. Adicionar filtro `isRevenueOrder` nas recompras regulares (7 pontos)

Em todas as funções que identificam recompras, adicionar `.filter(o => isRevenueOrder(o))` junto ao filtro `hasRegularProduct`. Isso impede que bonificações/brindes inflem taxa de conversão:

| Linha | Função |
|-------|--------|
| L228-229 | `calculateRepurchaseBehavior` -- detecção de recompra |
| L244 | `calculateRepurchaseBehavior` -- iteração de recompras |
| L377-379 | `calculateConversionByTime` -- conversão por janela |
| L427-429 | `calculateRepurchaseQuality` -- recompras regulares |
| L591-593 | `calculateBehaviorSegmentation` -- contagem de recompras |
| L778-780 | `calculateCohortAnalysis` -- detecção de recompra |
| L790-792 | `calculateCohortAnalysis` -- iteração de recompras |
| L869-871 | `calculateSampleMetricsByPetType` -- recompras por pet |

Padrão: onde hoje existe `.filter(o => hasRegularProduct(o))`, passa a ser `.filter(o => hasRegularProduct(o) && isRevenueOrder(o))`.

### 4. `src/pages/AnaliseSamples.tsx` -- Label de segmentação (L159)

Alterar `criteria: '2 compras'` para `criteria: '1-2 recompras regulares'` no segmento "Recorrente", alinhando com a lógica real do código (explorers = 1-2 recompras = 2-3 pedidos totais).

## O que NÃO muda

- Identificação de amostra (`isSampleProduct`, `isSampleOrder`) -- continua comportamental
- Volume de clientes qualificados -- conta todos os pedidos
- LTV continua incluindo pedido de amostra (decisão intencional, impacto ~R$1)
- Perfil do cliente (plataforma, envio, primeiro pedido) -- contexto comportamental puro
- Análise temporal (contagem mensal de amostras) -- volume, não valor
- Cesta de compras (`calculateBasketAnalysis`) -- contagem de itens, não valor fiscal

## Resultado esperado

- Ticket médio de coorte alinhado com ticket médio do dashboard executivo
- Taxa de recompra limpa de bonificações/brindes
- LTV de convertidos consistente entre páginas
- Label "Recorrente" reflete lógica real

## Total: 2 arquivos, ~15 pontos de edição

