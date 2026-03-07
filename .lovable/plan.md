

# Fix barras visuais + ocultar seções no modo consolidado

## Mudanças em `src/pages/ExecutiveDashboard.tsx`

### 1. Corrigir `SegmentBreakdownBars` (linhas 48-74)

- Remove `if (value <= 0) return null` — segmentos com 0 aparecem
- `format` → `formatValue`
- Width: `Math.min(Math.max((value / max) * 100, 1), 100)` — mínimo de 1% (não 4%)
- Bar container: `flex-1 min-w-[90px]`
- Labels: `min-w-[52px]` (em vez de `w-16`)
- Values: `min-w-[48px]` (em vez de `w-16`), mantém `tabular-nums`
- `aria-label` com valor formatado: `formatValue ? formatValue(value) : value`
- Sem `shadow-sm`, sem `role="img"`
- `space-y-2` (em vez de `space-y-1.5`)

### 2. Atualizar chamadas (linhas ~527, ~549)

`format={formatCurrency}` → `formatValue={formatCurrency}`

### 3. Ocultar seções no modo consolidado

- Marketing + Volume cards (dentro do grid): `{!isConsolidated && (...)}`
- Tudo abaixo do grid (Separator + Canal + Produtos + Alertas + Oportunidades + Navegação): um único `{!isConsolidated && (<>...</>)}`

### Arquivo tocado
`src/pages/ExecutiveDashboard.tsx`

