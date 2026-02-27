

# Bloco 1: Consolidar Paradigma Economico no Nucleo

## Resumo

Aplicar `getRevenueOrders()` em 4 arquivos para que receita, ROAS, ticket medio e LTV excluam brindes/bonificacoes/devolucoes. Modelo adotado: **Receita Comercial Bruta** (somente vendas, devolucoes como metrica operacional separada).

---

## 1. `src/utils/roasCalculator.ts`

- Importar `getRevenueOrders` de `./revenue`
- Filtrar orders antes de somar `faturamentoLiquido`

```typescript
import { getOfficialRevenue, getRevenueOrders } from "./revenue";

// L14: filtrar
const revenueOrders = getRevenueOrders(orders);
const faturamentoLiquido = revenueOrders.reduce(
  (sum, order) => sum + getOfficialRevenue(order), 0
);
```

Todas as metricas derivadas (roas, roi, margemLiquida) passam a usar receita filtrada automaticamente.

---

## 2. `src/utils/salesCalculator.ts` (2 pontos)

**2a. `calculateAverageTicket` (L198-202)**

Corrigir denominador: dividir por `revenueOrders.length` em vez de `orders.length`. Evitar dupla iteracao calculando receita inline.

```typescript
export const calculateAverageTicket = (orders: ProcessedOrder[]): number => {
  const revenueOrders = getRevenueOrders(orders);
  if (revenueOrders.length === 0) return 0;
  const revenue = revenueOrders.reduce(
    (sum, order) => sum + getOfficialRevenue(order), 0
  );
  return revenue / revenueOrders.length;
};
```

**2b. `extractDailyRevenue` (L272-281)**

Filtrar por `getRevenueOrders` para alinhar grafico diario com cards executivos.

```typescript
export const extractDailyRevenue = (orders: ProcessedOrder[]): { date: string; value: number }[] => {
  const dailyMap = new Map<string, number>();
  const revenueOrders = getRevenueOrders(orders);
  revenueOrders.forEach(order => {
    const dateKey = format(order.dataVenda, 'yyyy-MM-dd');
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + getOfficialRevenue(order));
  });
  return Array.from(dailyMap.entries()).map(([date, value]) => ({ date, value }));
};
```

---

## 3. `src/utils/executiveMetricsCalculator.ts` (6 pontos)

**3a. Import (L7):** Adicionar `getRevenueOrders`

```typescript
import { getOfficialRevenue, getRevenueOrders } from "./revenue";
```

**3b. Criar `revenueOrders` (apos L92)**

```typescript
const revenueOrders = getRevenueOrders(orders);
```

**3c. Ticket medio real (L101-110):** Filtrar por venda E produto real

```typescript
const pedidosReais = revenueOrders.filter(order => {
  return order.produtos.some(p => p.descricaoAjustada !== 'Kit de Amostras');
});
const receitaReal = pedidosReais.reduce((sum, o) => sum + getOfficialRevenue(o), 0);
```

**3d. Faturamento e frete (L122-123):** Usar `revenueOrders`

```typescript
const faturamentoTotal = revenueOrders.reduce((sum, o) => sum + getOfficialRevenue(o), 0);
const freteTotal = revenueOrders.reduce((sum, o) => sum + (o.valorFrete || 0), 0);
```

**3e. Clientes (L151-160):** Separar contagem (todos) de receita (vendas)

```typescript
const clientesUnicos = new Map<string, { pedidos: number; valorTotal: number }>();

// Contagem comportamental: todos os pedidos
orders.forEach(order => {
  const existing = clientesUnicos.get(order.cpfCnpj);
  if (existing) {
    existing.pedidos += 1;
  } else {
    clientesUnicos.set(order.cpfCnpj, { pedidos: 1, valorTotal: 0 });
  }
});

// Receita fiscal: apenas vendas
revenueOrders.forEach(order => {
  const existing = clientesUnicos.get(order.cpfCnpj);
  if (existing) {
    existing.valorTotal += getOfficialRevenue(order);
  }
});
```

**3f. Produtos (L176-189):** Usar `revenueOrders`

```typescript
revenueOrders.forEach(order => {
  order.produtos.forEach(produto => { ... });
});
```

---

## 4. `src/pages/PerformanceFinanceira.tsx` (L183-186)

Substituir soma manual de `o.valorTotal` por `getOfficialRevenue` com filtro de tipo.

```typescript
// Adicionar import
import { getOfficialRevenue, getRevenueOrders } from "@/utils/revenue";

// L183-186
const revenueFilteredOrders = getRevenueOrders(filteredOrders);
const faturamentoTotal = revenueFilteredOrders.reduce((sum, o) => sum + getOfficialRevenue(o), 0);
const freteTotal = revenueFilteredOrders.reduce((sum, o) => sum + (o.valorFrete || 0), 0);
const faturamentoExFrete = faturamentoTotal - freteTotal;
```

---

## O que NAO muda neste bloco

- Tipos (`ExecutiveMetrics`, `ROASMetrics`) -- sem mudanca de interface
- Churn (`analyzeChurn`) -- usa todos os pedidos (comportamento)
- Operacoes (NF, envio) -- usam todos os pedidos
- `samplesAnalyzer.ts` -- contexto comercial, nao fiscal
- Card de devolucoes -- bloco futuro separado

## Modelo economico adotado

```text
RECEITA FISCAL      -> getRevenueOrders(orders) + getOfficialRevenue(order)
VOLUME OPERACIONAL  -> orders.length (todos)
COMPORTAMENTO       -> orders (todos, incluindo brindes)
DEVOLUCOES          -> metrica operacional separada (bloco futuro)
```

## Total: 4 arquivos, ~12 pontos de correcao

