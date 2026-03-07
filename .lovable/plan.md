

# Fix barras visuais + ocultar seções no modo consolidado

## Mudanças em `src/pages/ExecutiveDashboard.tsx`

### 1. Corrigir `SegmentBreakdownBars` (linhas 48-74)

Aplicar todos os fixes aprovados:

- **Remover `if (value <= 0) return null`** -- segmentos com 0 devem aparecer (barra vazia + "0")
- **`format` -> `formatValue`** -- evita shadowing do import `format` de date-fns
- **`Math.min(Math.max(...), 100)`** -- cap de largura
- **`min-w-[80px]`** no container da barra -- garante visibilidade em grids estreitos
- **`min-w-[52px]`** nos labels, **`min-w-[48px]`** nos valores
- **`aria-label`** sem `role="img"`
- **`space-y-2`** para melhor legibilidade
- **`shadow-sm`** na barra para contraste em dark mode

### 2. Atualizar chamadas (linhas 527, 549)

`format={formatCurrency}` -> `formatValue={formatCurrency}`

### 3. Ocultar seções no modo consolidado

Envolver com `{!isConsolidated && (...)}`:

- **Marketing cards** (linhas 555-638) -- dentro do grid existente
- **Volume card** (linhas 640-648) -- dentro do grid existente
- **Linhas 653-924** (Separator + Canal + Produtos + Separator + Alertas + Oportunidades + Separator + Navegacao) -- um unico bloco `{!isConsolidated && (<>...</>)}` fora do grid

```text
<div grid satelites>           <- linha 491
  Pedidos card (with bars)
  Ticket Medio card (with bars)
  Ticket Real card (with bars)
  {!isConsolidated && marketing + volume cards}
</div>                         <- linha 649

{!isConsolidated && (
  <>
    <Separator />
    Canal + Produtos
    <Separator />
    Alertas + Oportunidades
    <Separator />
    Navegacao Rapida
  </>
)}
```

### Arquivo tocado
`src/pages/ExecutiveDashboard.tsx` -- ~30 linhas modificadas

