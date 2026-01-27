

# Toggle de Amostras nos Gráficos Financeiros

## Objetivo

Adicionar o mesmo botão toggle "Com Amostras / Só Produtos" implementado no `DailyVolumeChart` a outros 4 gráficos da página Performance Financeira.

---

## Gráficos Afetados

| Gráfico | Arquivo | Impacto do Toggle |
|---------|---------|-------------------|
| Faturamento Diário | `DailyRevenueChart.tsx` | Excluir receita de pedidos só-amostras |
| Receita por Canal | `ChannelDonutChart.tsx` | Recalcular % por canal sem amostras |
| Distribuição de Ticket | `TicketDistributionCompact.tsx` | Remover pedidos R$0,01 da faixa 0-50 |
| Status das Metas | `GoalsProgressCard.tsx` | Comparar metas com pedidos reais |

---

## Arquitetura da Solução

### Opção Escolhida: Toggle Centralizado na Página

Em vez de adicionar toggles individuais em cada componente, criar um **toggle global** na página `PerformanceFinanceira.tsx` que controla todos os gráficos simultaneamente.

**Vantagens:**
- UX consistente (todos os gráficos sincronizados)
- Menos código duplicado
- Fácil de entender para o usuário

**Localização do toggle:** No header da página, próximo ao título.

---

## Mudanças por Arquivo

### 1. `src/pages/PerformanceFinanceira.tsx`

**Adicionar:**
- Estado `includeSamples` para controlar filtro global
- Botão toggle no header da página
- Cálculo de métricas filtradas (sem amostras) usando `filterRealOrders`
- Passar dados filtrados ou completos conforme o toggle

```text
// Novo estado
const [includeSamples, setIncludeSamples] = useState(true);

// Métricas filtradas (sem amostras)
const filteredFinancialMetrics = useMemo(() => {
  if (!includeSamples) {
    // Filtrar pedidos sem-amostra e recalcular
    const realOrders = salesData.filter(order => !isOnlySampleOrder(order));
    return calculateFinancialMetrics(realOrders, selectedMonth);
  }
  return financialMetrics;
}, [salesData, selectedMonth, includeSamples, financialMetrics]);
```

### 2. `src/components/dashboard/DailyRevenueChart.tsx`

**Adicionar:**
- Nova prop `includeSamples?: boolean`
- Dados de faturamento separados (com/sem amostras)
- Lógica para filtrar dados quando `includeSamples = false`

**Nota:** O gráfico de faturamento precisa receber dados já filtrados da página pai OU calcular internamente baseado em dados brutos.

### 3. `src/components/dashboard/ChannelDonutChart.tsx`

**Adicionar:**
- Nova prop `includeSamples?: boolean`
- Badge indicando modo atual (opcional)
- Receber dados já filtrados do componente pai

### 4. `src/components/dashboard/TicketDistributionCompact.tsx`

**Adicionar:**
- Nova prop `includeSamples?: boolean`
- Receber dados já filtrados
- A faixa R$0-50 terá contagem significativamente menor sem amostras

### 5. `src/components/dashboard/GoalsProgressCard.tsx`

**Adicionar:**
- Nova prop `includeSamples?: boolean`
- Indicador visual mostrando qual base está sendo usada
- Receber dados `totalPedidosReais` ou `totalPedidos` conforme toggle

---

## UI do Toggle Global

### Localização

Será adicionado no header da página, alinhado à direita:

```text
💰 Performance Financeira
Análise completa de receita, margem e tendências    [🧪 Com Amostras ▼]
```

### Estilos

- Mesma aparência do toggle implementado em `DailyVolumeChart`
- Ícone `FlaskConical` do lucide-react
- Variantes: `default` (incluindo) / `outline` (excluindo)

---

## Lógica de Filtragem

### Dados que precisam ser recalculados quando `includeSamples = false`:

| Métrica | Cálculo Original | Cálculo Filtrado |
|---------|------------------|------------------|
| `faturamentoTotal` | Soma todos pedidos | Soma pedidos com produto real |
| `platformPerformance` | Agrupa todos | Agrupa só pedidos reais |
| `orderDistribution` | Conta todos tickets | Conta só tickets reais |
| `totalPedidos` | Count total | Count pedidos reais |

### Função existente para filtrar

O código já possui `filterRealOrders()` em `financialMetrics.ts` que pode ser reutilizado:

```text
const filterRealOrders = (orders: ProcessedOrder[]): ProcessedOrder[] => {
  return orders.filter(order => {
    const nonSampleProducts = order.produtos.filter(
      p => p.descricaoAjustada !== 'Kit de Amostras'
    );
    return nonSampleProducts.length > 0;
  });
};
```

---

## Fluxo de Dados

```text
PerformanceFinanceira.tsx
├── includeSamples (estado)
├── salesData → filteredOrders (se !includeSamples)
├── calculateFinancialMetrics(filteredOrders)
│
├─→ DailyRevenueChart (recebe dados filtrados)
├─→ ChannelDonutChart (recebe platformPerformance filtrado)
├─→ TicketDistributionCompact (recebe orderDistribution filtrado)
└─→ GoalsProgressCard (recebe totalPedidos/totalPedidosReais)
```

---

## Resumo das Alterações

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `PerformanceFinanceira.tsx` | Modificar | Estado global + toggle + filtragem |
| `DailyRevenueChart.tsx` | Modificar | Aceitar dados filtrados |
| `ChannelDonutChart.tsx` | Sem mudança | Apenas recebe dados já filtrados |
| `TicketDistributionCompact.tsx` | Sem mudança | Apenas recebe dados já filtrados |
| `GoalsProgressCard.tsx` | Sem mudança | Apenas recebe dados já filtrados |
| `financialMetrics.ts` | Modificar | Exportar `filterRealOrders` |

---

## Resultado Esperado

**Com Amostras (padrão):**
- Todos os gráficos mostram dados completos
- Pedidos de R$0,01 aparecem na faixa 0-50
- Meta de pedidos compara com total

**Só Produtos:**
- Gráficos mostram apenas pedidos com produtos reais
- Faixa R$0-50 muito menor
- Meta compara com pedidos reais
- Ticket médio mais realista

O usuário poderá alternar entre visualizações para entender o impacto real das amostras nas métricas financeiras.

