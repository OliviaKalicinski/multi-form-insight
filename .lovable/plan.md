

# Reestruturar Página de Operações com Segmentação — Plano Final

## Correções aplicadas nesta versão

1. **Modo consolidado**: `segmentOrders()` é puro filtro — `salesData` e `[...segments.b2c, ...segments.b2b2c, ...segments.b2b]` produzem o mesmo resultado. Para garantir consistência e eliminar qualquer dúvida, no modo `all` concatenamos os segmentos em vez de usar `salesData` diretamente.

2. **Tipagem explícita**: `segmentBreakdown` terá tipo `Record<Exclude<SegmentFilter, 'all'>, { pedidos: number; faturamento: number; tempoNF: number }>` no reduce.

3. **Mapeamento para SegmentBreakdownBars**: O componente espera `Record<SegmentKey, number>`. Antes de passar, extraímos a métrica desejada do breakdown (ex: `{ b2c: breakdown.b2c.pedidos, ... }`).

4. **Memoização**: `segments` será memoizado via `useMemo`.

---

## Arquivos tocados (4)

### 1. `src/components/dashboard/SegmentBreakdownBars.tsx` — NOVO

Extrair linhas 48-77 do `ExecutiveDashboard.tsx`. Props:
```typescript
{ data: Record<Exclude<SegmentFilter, 'all'>, number>; formatValue?: (v: number) => string }
```
Importa `SEGMENT_ORDER`, `SEGMENT_LABELS`, `SEGMENT_COLORS` de `@/utils/revenue`.

### 2. `src/pages/ExecutiveDashboard.tsx`

Remover definição inline (linhas 48-77). Adicionar:
```typescript
import { SegmentBreakdownBars } from "@/components/dashboard/SegmentBreakdownBars";
```

### 3. `src/components/AppSidebar.tsx`

Mover `{ title: "Operações", url: "/operacoes", icon: Truck }` do grupo "Comida de Dragão" (linha 92) para o grupo "Visão Geral" (após "Radar Operacional", linha ~65).

### 4. `src/pages/Operacoes.tsx` — Refatoração

**Novo state:**
```typescript
const [selectedSegment, setSelectedSegment] = useState<SegmentFilter>('all');
```

**Pipeline de dados (memoizado):**
```typescript
const segments = useMemo(() => segmentOrders(salesData), [salesData]);

const ordersForSegment = useMemo(() =>
  selectedSegment === 'all'
    ? [...segments.b2c, ...segments.b2b2c, ...segments.b2b]  // ← concatenar segmentos, não salesData
    : segments[selectedSegment],
  [segments, selectedSegment]
);

const ordersByMonth = useMemo(() =>
  selectedMonth
    ? filterOrdersByMonth(ordersForSegment, selectedMonth, availableMonths)
    : ordersForSegment,
  [ordersForSegment, selectedMonth, availableMonths]
);
```

**Dois fluxos de cálculo:**
```text
ordersByMonth → productMetrics (operacional: pedidos, NF, envio)
ordersByMonth → getRevenueOrders() → .reduce((sum, o) => sum + getOfficialRevenue(o), 0) → faturamento
```

**Breakdown por segmento (modo consolidado):**
```typescript
type SegmentKey = Exclude<SegmentFilter, 'all'>;

interface SegmentBreakdownEntry {
  pedidos: number;
  faturamento: number;
  tempoNF: number;
}

const segmentBreakdown = useMemo(() => {
  if (selectedSegment !== 'all') return null;
  return SEGMENT_ORDER.reduce((acc, key) => {
    const segOrdersByMonth = selectedMonth
      ? filterOrdersByMonth(segments[key], selectedMonth, availableMonths)
      : segments[key];
    const revOrders = getRevenueOrders(segOrdersByMonth);
    acc[key] = {
      pedidos: segOrdersByMonth.length,
      faturamento: revOrders.reduce((sum, o) => sum + getOfficialRevenue(o), 0),
      tempoNF: analyzeNFIssuanceTime(segOrdersByMonth).averageDays,
    };
    return acc;
  }, {} as Record<SegmentKey, SegmentBreakdownEntry>);
}, [selectedSegment, segments, selectedMonth, availableMonths]);
```

**Mapeamento para SegmentBreakdownBars:**
```typescript
// No card de Pedidos:
<SegmentBreakdownBars data={{ b2c: segmentBreakdown.b2c.pedidos, b2b2c: segmentBreakdown.b2b2c.pedidos, b2b: segmentBreakdown.b2b.pedidos }} />

// No card de Faturamento:
<SegmentBreakdownBars data={{ b2c: segmentBreakdown.b2c.faturamento, ... }} formatValue={formatCurrency} />

// No card de Tempo NF:
<SegmentBreakdownBars data={{ b2c: segmentBreakdown.b2c.tempoNF, ... }} formatValue={(v) => `${v.toFixed(1)}d`} />
```

**Correção de faturamento** — todas as ocorrências de `o.valorTotal`:
- Linha 87 (comparação): `getRevenueOrders(filteredOrders).reduce((sum, o) => sum + getOfficialRevenue(o), 0)`
- Linha 131 (summaryMetrics): idem

**Comparação multi-mês** (linhas 35-115): Aplicar mesmo pipeline — segmentar → selecionar → filtrar mês → calcular.

**UI:**
- `ToggleGroup` abaixo do título (Consolidado | B2C | B2B2C | B2B)
- Cards de Pedidos, Faturamento e Tempo NF recebem `SegmentBreakdownBars` quando `selectedSegment === 'all'`
- Seções detalhadas (LogisticsKPICards, gráficos, tabela envio) ocultas no consolidado: `{selectedSegment !== 'all' && (...)}`

