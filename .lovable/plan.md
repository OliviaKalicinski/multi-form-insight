
# Plano: Comparação de Períodos Iguais para Meses Incompletos

## Problema Identificado

Atualmente, quando você está no dia 25 de Janeiro e visualiza esse mês, o sistema:
- Soma 25 dias de Janeiro
- Compara com 31 dias completos de Dezembro
- Resultado: variações distorcidas (ex: -30% quando na verdade pode estar crescendo)

**Exemplo concreto:**
- Janeiro (25 dias): R$ 10.000 de faturamento
- Dezembro (31 dias): R$ 15.000 de faturamento
- Cálculo atual: -33% (errado!)
- Cálculo correto (25 dias de cada): Janeiro R$ 10.000 vs Dezembro D1-D25 R$ 12.000 = -17%

---

## Solução Proposta

### Lógica de Comparação "Espelho"

Para meses incompletos, o período de comparação deve "espelhar" o intervalo de dias:

```text
Exemplo 1: Hoje é 25 de Janeiro
├── Período atual: 01/Jan - 25/Jan (25 dias)
└── Período comparação: 01/Dez - 25/Dez (25 dias)

Exemplo 2: Hoje é 15 de Fevereiro
├── Período atual: 01/Fev - 15/Fev (15 dias)
└── Período comparação: 01/Jan - 15/Jan (15 dias)
```

### Indicador Visual

O mês incompleto deve ter uma sinalização visual clara:
- Badge "Em andamento" ou ícone de relógio
- Tooltip explicando que a comparação usa intervalos iguais
- Projeção do valor esperado ao final do mês

---

## Arquivos a Modificar

### 1. `src/utils/incompleteMonthDetector.ts` (expandir)
Adicionar novas funções:
- `getEqualIntervalDates()` - retorna as datas de início e fim para comparação justa
- `filterDataByEqualInterval()` - filtra dados usando intervalo espelhado

### 2. `src/utils/salesCalculator.ts`
Criar nova função:
- `filterOrdersByEqualInterval()` - filtra pedidos considerando intervalo igual para meses incompletos

### 3. `src/utils/comparisonCalculator.ts`
Atualizar funções de comparação para usar intervalos iguais quando mês incompleto

### 4. `src/pages/PerformanceFinanceira.tsx`
- Modificar cálculo de `previousMonthMetrics` para usar intervalo igual
- Adicionar indicador visual de mês incompleto
- Adicionar tooltip explicativo

### 5. `src/pages/ExecutiveDashboard.tsx`
- Aplicar mesma lógica de intervalos iguais
- Adicionar indicadores visuais

### 6. `src/components/dashboard/RevenueHeroCard.tsx`
- Exibir badge "Mês em andamento" quando aplicável
- Mostrar projeção do valor final

### 7. `src/utils/financialMetrics.ts`
- Atualizar `calculateGrowthRate()` para considerar intervalos iguais

---

## Implementação Detalhada

### Fase 1: Lógica Central de Intervalos Iguais

```text
Nova função em incompleteMonthDetector.ts:

getEqualIntervalComparison(selectedMonth: string) -> {
  isIncomplete: boolean,
  currentDayOfMonth: number,
  currentPeriod: { start: Date, end: Date },
  comparisonPeriod: { start: Date, end: Date },
  label: string // ex: "Comparando primeiros 25 dias"
}
```

### Fase 2: Filtro de Dados por Intervalo

```text
Nova função em salesCalculator.ts:

filterOrdersByDateRange(
  orders: ProcessedOrder[],
  startDate: Date,
  endDate: Date
) -> ProcessedOrder[]
```

### Fase 3: Atualização das Páginas

1. **PerformanceFinanceira.tsx:**
   - Detectar mês incompleto
   - Usar `filterOrdersByDateRange` para ambos os períodos
   - Exibir badge visual

2. **ExecutiveDashboard.tsx:**
   - Mesma lógica
   - Cards de comparação usam intervalos iguais

### Fase 4: Indicadores Visuais

Adicionar nos cards e gráficos:
- Badge "Em andamento" com ícone Clock
- Tooltip: "Comparando os primeiros X dias de cada mês"
- Texto auxiliar: "Período parcial: D1-D25"

---

## Fluxo de Dados

```text
Usuário seleciona Janeiro/2026 (dia atual: 25)
         │
         ▼
detectIncompleteMonth("2026-01")
         │
         ├── isIncomplete: true
         ├── currentDay: 25
         └── Calcular intervalo espelho
                    │
                    ▼
getEqualIntervalComparison("2026-01")
         │
         ├── currentPeriod: 01/Jan - 25/Jan
         └── comparisonPeriod: 01/Dez - 25/Dez
                    │
                    ▼
filterOrdersByDateRange(orders, startDate, endDate)
         │
         ▼
Métricas calculadas com intervalos iguais
         │
         ▼
Exibição com badge "Mês em andamento"
```

---

## Casos Especiais

1. **Primeiro mês com dados**: Não há período anterior para comparar
   - Exibir "N/A" ou "Sem dados anteriores"

2. **Mês anterior também incompleto**: Improvável, mas se ocorrer
   - Usar o intervalo do mês mais recente como base

3. **Seleção de múltiplos meses**: Modo comparação
   - Aplicar lógica apenas para meses detectados como incompletos

4. **Visualização "Todos os períodos"**: 
   - Não aplicar a lógica de intervalos (não há comparação MoM)

---

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `incompleteMonthDetector.ts` | + `getEqualIntervalComparison()` |
| `salesCalculator.ts` | + `filterOrdersByDateRange()` |
| `comparisonCalculator.ts` | Usar intervalos iguais para meses incompletos |
| `financialMetrics.ts` | Atualizar `calculateGrowthRate()` |
| `PerformanceFinanceira.tsx` | Badge + lógica de intervalos iguais |
| `ExecutiveDashboard.tsx` | Badge + lógica de intervalos iguais |
| `RevenueHeroCard.tsx` | Badge "Mês em andamento" + projeção |

---

## Resultado Esperado

Antes:
```text
Janeiro (25 dias) vs Dezembro (31 dias) = -33%
```

Depois:
```text
Janeiro (D1-D25) vs Dezembro (D1-D25) = -17%
+ Badge: "🕐 Mês em andamento"
+ Tooltip: "Comparando os primeiros 25 dias de cada mês"
```
