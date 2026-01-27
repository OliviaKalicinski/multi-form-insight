

# Botões de Toggle Individuais por Gráfico

## Objetivo

Reverter a abordagem de toggle global na página e implementar botões individuais **dentro de cada gráfico**, permitindo ao usuário alternar "Com Amostras / Só Produtos" independentemente para cada visualização.

---

## Por que Isso é Melhor

| Abordagem Atual (Global) | Nova Abordagem (Individual) |
|-------------------------|---------------------------|
| Um botão no header controla todos | Cada gráfico tem seu próprio botão |
| Todos os gráficos sincronizados | Usuário pode comparar visões diferentes |
| Menos flexível para análise | Mais intuitivo e user-friendly |

---

## Gráficos Afetados

| Componente | Localização do Toggle | Dados Afetados |
|------------|----------------------|----------------|
| **DailyVolumeChart** | Já tem toggle ✅ | Volume de pedidos |
| **DailyRevenueChart** | Adicionar ao header | Faturamento diário |
| **ChannelDonutChart** | Adicionar ao header | Receita por canal |
| **TicketDistributionCompact** | Adicionar ao header | Distribuição de ticket |
| **GoalsProgressCard** | Adicionar ao header | Status das metas |

---

## Mudanças por Arquivo

### 1. `src/pages/PerformanceFinanceira.tsx`

**Remover:**
- Estado global `includeSamples`
- Botão toggle do header da página
- `useMemo` de `filteredFinancialMetrics` e `filteredVolumeData`

**Modificar:**
- Passar dados brutos (`salesData`, métricas completas) para os componentes
- Cada componente fará sua própria filtragem internamente

### 2. `src/components/dashboard/DailyVolumeChart.tsx`

**Já implementado!** O toggle existe e funciona com estado interno quando `onIncludeSamplesChange` não é fornecido.

**Modificar:**
- Adicionar estado interno `useState(true)` quando a prop `includeSamples` não for passada
- Remover dependência da prop `includeSamples` vinda do parent

### 3. `src/components/dashboard/DailyRevenueChart.tsx`

**Adicionar:**
- Nova prop `rawOrders: ProcessedOrder[]` para dados brutos
- Estado interno `const [includeSamples, setIncludeSamples] = useState(true)`
- Botão toggle com ícone `FlaskConical` no header
- `useMemo` para filtrar e recalcular dados de faturamento

**Lógica:**
```text
// Quando includeSamples = false, recalcular:
const filteredOrders = filterRealOrders(rawOrders);
const revenueData = calculateRevenueByDay/Week/Month(filteredOrders);
```

### 4. `src/components/dashboard/ChannelDonutChart.tsx`

**Adicionar:**
- Nova prop `rawOrders?: ProcessedOrder[]`
- Estado interno `includeSamples`
- Botão toggle compacto no header (ícone pequeno)
- `useMemo` para recalcular `platformPerformance` quando toggle off

**Lógica:**
```text
// Recalcular agregação por canal sem amostras
const dataToUse = includeSamples ? data : recalculatedFromRawOrders;
```

### 5. `src/components/dashboard/TicketDistributionCompact.tsx`

**Adicionar:**
- Nova prop `rawOrders?: ProcessedOrder[]`
- Estado interno `includeSamples`
- Botão toggle compacto no header
- `useMemo` para recalcular distribuição de ticket

**Impacto esperado:**
- Faixa R$0-50 terá muito menos pedidos (remove R$0,01)
- Ticket médio aumenta significativamente

### 6. `src/components/dashboard/GoalsProgressCard.tsx`

**Adicionar:**
- Nova prop opcional `alternativeGoals?: GoalItem[]` (para quando sem amostras)
- Estado interno `includeSamples`
- Botão toggle no header
- Alternar entre `goals` e `alternativeGoals`

---

## Design do Botão Toggle

Cada componente terá um botão compacto no header:

```text
┌─────────────────────────────────────────────────────┐
│ 📈 Faturamento Diário      [Diário] [Semanal] [🧪] │
│                                                      │
│      (gráfico)                                       │
└─────────────────────────────────────────────────────┘
```

**Estilo do botão:**
- Tamanho: `sm` ou `icon` (compacto)
- Variante: `default` quando incluindo amostras, `outline` quando só produtos
- Tooltip explicativo em hover
- Ícone: `FlaskConical` do lucide-react

---

## Fluxo de Dados Atualizado

```text
PerformanceFinanceira.tsx
├── salesData (dados brutos)
├── financialMetrics (métricas completas)
│
├─→ DailyRevenueChart
│   ├── rawOrders (para filtragem interna)
│   └── includeSamples (estado local)
│
├─→ DailyVolumeChart  
│   ├── rawOrders (para filtragem interna)
│   └── includeSamples (estado local) ✅ já existe
│
├─→ ChannelDonutChart
│   ├── data (métricas pré-calculadas)
│   ├── rawOrders (para recálculo)
│   └── includeSamples (estado local)
│
├─→ TicketDistributionCompact
│   ├── data (métricas pré-calculadas)
│   ├── rawOrders (para recálculo)
│   └── includeSamples (estado local)
│
└─→ GoalsProgressCard
    ├── goals (com amostras)
    ├── alternativeGoals (sem amostras)
    └── includeSamples (estado local)
```

---

## Resumo de Alterações

| Arquivo | Ação | Complexidade |
|---------|------|--------------|
| `PerformanceFinanceira.tsx` | Remover toggle global, passar dados brutos | Média |
| `DailyVolumeChart.tsx` | Ajustar para usar estado local | Baixa |
| `DailyRevenueChart.tsx` | Adicionar toggle + filtragem | Alta |
| `ChannelDonutChart.tsx` | Adicionar toggle + recálculo | Média |
| `TicketDistributionCompact.tsx` | Adicionar toggle + recálculo | Média |
| `GoalsProgressCard.tsx` | Adicionar toggle + dados alternativos | Média |

---

## Resultado Esperado

O usuário poderá:
1. Ver o gráfico de **Volume de Pedidos** incluindo amostras
2. Ao mesmo tempo, ver **Faturamento** sem amostras
3. Comparar lado a lado o impacto das amostras em cada métrica
4. Alternar independentemente cada visualização conforme necessidade

Isso proporciona uma experiência muito mais flexível e intuitiva para análise de dados.

