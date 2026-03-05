

# Navigation Reorganization — Implementation Plan

## Overview
Restructure sidebar into 3 sections, merge Segmentação + Churn into ComportamentoCliente as tabs, delete 3 pages, add redirects for old URLs.

## Changes (5 files modified, 3 deleted)

### 1. Database Migration
None required.

### 2. `src/components/AppSidebar.tsx`
Replace `navSections` array (lines 56–113) with 3 sections:
- **Visão Geral**: Fotografia Operacional, Visão Executiva, Kanban, Radar Operacional
- **CRM**: Clientes, Reclamações, Atendimentos
- **Comida de Dragão**: Performance Financeira, Comportamento, Produtos, Operações, Amostras, Anúncios Meta, Seguidores, Público

Remove unused imports: `Brain`, `PieChart`, `AlertTriangle` (from nav sections — keep if used in footer). Keep all footer items unchanged.

### 3. `src/App.tsx`
- Remove 3 imports (lines 24, 26, 27): `SegmentacaoClientes`, `AnaliseCritica`, `AnaliseChurn`
- Remove 3 Route blocks (lines 204–218 and 236–242)
- Add 3 redirect routes after the `/comportamento-cliente` route:
```tsx
<Route path="/segmentacao-clientes" element={<Navigate to="/comportamento-cliente" replace />} />
<Route path="/analise-churn" element={<Navigate to="/comportamento-cliente" replace />} />
<Route path="/analise-critica" element={<Navigate to="/dashboard" replace />} />
```

### 4. `src/pages/ComportamentoCliente.tsx` — Main change
Add Tabs wrapping existing content + 2 new tabs absorbing deleted pages.

**New imports:**
- `Tabs, TabsContent, TabsList, TabsTrigger` from `@/components/ui/tabs`
- `CustomerSegmentationChart`, `SegmentRevenueChart`, `SegmentDetailTable` (from Segmentação)
- `ChurnFunnelChart`, `ChurnRiskTable`, `KPITooltip`, `EmptyState` (from Churn)
- Additional lucide icons: `UserMinus`, `TrendingDown`, `FileWarning`, `PieChart`

**Data:** Add `churnRiskCustomers` to the existing `useCustomerData()` destructuring (line 27). The hook already returns it.

**Return structure:**
- Header stays above tabs (lines 140–148)
- Wrap everything below header in `<Tabs defaultValue="comportamento">`
- `TabsList` with 3 triggers: "Comportamento", "Segmentos", "Risco de Churn"
- `TabsContent value="comportamento"`: existing content (lines 150–374)
- `TabsContent value="segmentos"`: content copied from `SegmentacaoClientes.tsx` (charts + table with loading/empty states)
- `TabsContent value="churn"`: content copied from `AnaliseChurn.tsx` (KPI cards + funnel + risk table with loading/empty states), using destructured `churnMetrics` and `churnRiskCustomers`

### 5. Delete 3 files
- `src/pages/AnaliseCritica.tsx`
- `src/pages/SegmentacaoClientes.tsx`
- `src/pages/AnaliseChurn.tsx`

## Technical Notes
- Zero changes to hooks, utils, or formulas
- `useCustomerData()` already returns all needed data (`segments`, `churnMetrics`, `churnRiskCustomers`)
- Radix Tabs renders only the active tab content (no performance concern)
- Old URLs redirect gracefully via `<Navigate replace />`

