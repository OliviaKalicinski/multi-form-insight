
# Barras Empilhadas por Tipo de Pedido no Grafico de Volume

## Objetivo

Modificar o grafico de Volume de Pedidos para:
1. Dividir cada barra em duas partes: **pedidos "So Amostras"** vs **pedidos "Produtos"** (produtos ou produtos + amostras)
2. Usar cores diferentes baseadas na meta:
   - **Acima da meta**: tons de verde (verde escuro = produtos, verde claro = so amostras)
   - **Abaixo da meta**: tons de amarelo (amarelo escuro = produtos, amarelo claro = so amostras)
3. Usar a meta de pedidos da pagina Metas (atualmente zerada - `financialGoals.pedidos = 0`)

---

## Situacao Atual

### Grafico
- Mostra barras solidas com cor verde (acima da meta) ou amarelo (abaixo)
- Nao diferencia tipos de pedido

### Meta
- O grafico recebe `dailyGoal={Math.round(financialGoals.pedidos / 30)}`
- A meta de pedidos esta zerada (`pedidos: 0`)
- Quando `dailyGoal = 0`, o grafico usa a media como referencia

---

## Solucao Proposta

### Parte 1: Modificar Estrutura de Dados

O componente `DailyVolumeChart` precisa receber dados detalhados por tipo:

**Estrutura atual:**
```text
{ date: string, orders: number }
```

**Nova estrutura:**
```text
{ date: string, orders: number, sampleOnlyOrders: number, productOrders: number }
```

### Parte 2: Calcular Dados por Tipo

Criar funcoes em `financialMetrics.ts` para calcular pedidos diarios/semanais/mensais separados por tipo:

1. `calculateOrdersByDayWithTypes()` - pedidos diarios separados
2. `calculateOrdersByWeekWithTypes()` - pedidos semanais separados
3. `calculateOrdersByMonthWithTypes()` - pedidos mensais separados

A logica usara `isOnlySampleOrder()` de `samplesAnalyzer.ts` para classificar cada pedido.

### Parte 3: Atualizar o Grafico

Modificar `DailyVolumeChart.tsx` para:

1. Usar `StackedBarChart` com 2 barras empilhadas
2. Aplicar cores dinamicas baseadas na meta:
   - **Acima da meta (verde)**:
     - Produtos: `#10b981` (verde esmeralda)
     - So Amostras: `#6ee7b7` (verde claro)
   - **Abaixo da meta (amarelo)**:
     - Produtos: `#f59e0b` (amarelo)
     - So Amostras: `#fcd34d` (amarelo claro)

3. Atualizar a legenda para mostrar as 4 categorias

### Parte 4: Corrigir Meta Zero

Quando `dailyGoal = 0` (meta zerada):
- Usar a media calculada como linha de referencia
- Mostrar label "Media" ao inves de "Meta"

Este comportamento ja existe, mas precisa ser confirmado visualmente.

---

## Arquivos a Modificar

### 1. `src/utils/financialMetrics.ts`
- Adicionar funcoes `calculateOrdersByDayWithTypes`, `calculateOrdersByWeekWithTypes`, `calculateOrdersByMonthWithTypes`
- Retornar contagem separada de `sampleOnlyOrders` e `productOrders`

### 2. `src/components/dashboard/DailyVolumeChart.tsx`
- Atualizar interface para receber dados com tipos separados
- Trocar `Bar` simples por 2 `Bar` empilhadas
- Implementar logica de cores dinamicas (verde/amarelo escuro/claro)
- Atualizar tooltip para mostrar breakdown
- Atualizar legenda

### 3. `src/pages/PerformanceFinanceira.tsx`
- Atualizar chamada para usar os novos dados com tipos

---

## Paleta de Cores

| Situacao | Tipo | Cor | Hex |
|----------|------|-----|-----|
| Acima da meta | Produtos | Verde escuro | #10b981 |
| Acima da meta | So Amostras | Verde claro | #6ee7b7 |
| Abaixo da meta | Produtos | Amarelo escuro | #f59e0b |
| Abaixo da meta | So Amostras | Amarelo claro | #fcd34d |

---

## Visualizacao Final

Cada barra tera:
- **Parte inferior**: pedidos com produtos (cor mais escura)
- **Parte superior**: pedidos so amostras (cor mais clara)
- A cor muda entre verde (acima) e amarelo (abaixo) baseado na soma total vs meta

---

## Nota sobre a Meta Zerada

A meta de pedidos esta atualmente em **zero** no banco de dados. Apos implementar as mudancas, voce precisara ir na pagina **Metas** e definir um valor para "Pedidos/Mes" (ex: 350) para que a linha de meta apareca corretamente no grafico.

