

# C1–C5: Implementar Páginas de Canais

Ambas verificações confirmadas:
- `filterOrdersByMonth` importa de `@/utils/salesCalculator` com assinatura `(orders, month, availableMonths)`
- `EmptyState.icon` aceita `ReactNode` — `<Package className="h-8 w-8" />` funciona

## Mudanças

### C1. `src/utils/revenue.ts`
Adicionar ao final:
```typescript
export const getB2B2COrders = (orders: ProcessedOrder[]): ProcessedOrder[] =>
  orders.filter(o => o.segmentoCliente?.toLowerCase().trim() === 'b2b2c');

export const getB2BOrders = (orders: ProcessedOrder[]): ProcessedOrder[] =>
  orders.filter(o => o.segmentoCliente?.toLowerCase().trim() === 'b2b');
```

### C2. `src/pages/Distribuidores.tsx` — nova página
- `useDashboard()` para `salesData`, `selectedMonth`, `availableSalesMonths`
- Pipeline: `getRevenueOrders(getB2B2COrders(salesData))` + `filterOrdersByMonth(orders, selectedMonth, availableSalesMonths)`
- 4 KPIs: receita (`getOfficialRevenue`), pedidos, ticket médio (div/0 protegido), clientes únicos (`new Set` por `cpfCnpj`)
- Tabela de distribuidores agrupados por `cpfCnpj`, exibindo `nomeCliente?.trim()`, ordenada por receita desc
- `EmptyState` com `icon={<Package className="h-8 w-8" />}`

### C3. `src/pages/LetsFly.tsx` — nova página
- Mesmo pipeline com `getB2BOrders`
- 5 KPIs: receita, pedidos, volume KG (`pesoLiquido || 0`), ticket médio, receita/kg (`totalKg > 0 ? r/totalKg : 0`)
- Tabela mensal: mês | receita | volume KG | receita/kg
- `EmptyState` com `icon={<Truck className="h-8 w-8" />}`

### C4. `src/App.tsx`
2 imports + 2 rotas `ProtectedRoute > AuthenticatedLayout > Page` após `/kanban-operacional`.

### C5. `src/components/AppSidebar.tsx`
Nova seção "Canais" entre CRM e Comida de Dragão. `Truck` e `Package` já importados.

### C6. `.lovable/plan.md`
Adicionar Distribuidores (B2B2C) e LetsFly (B2B) ao mapa.

