

# Reverter filtro B2B nos dashboards executivos

## Mudanças

### 1. `src/pages/ExecutiveDashboard.tsx`
- **Linha 35**: remover import `getComiDaDragaoOrders`
- **Linha 59**: `return getComiDaDragaoOrders(salesData as ProcessedOrder[])` → `return salesData as ProcessedOrder[]`
- Adicionar comentário `// Company-level: uses all segments (no brand filter)` antes do useMemo (linha 56)

### 2. `src/pages/VisaoExecutivaV2.tsx`
- **Linha 18**: remover import `getComiDaDragaoOrders`
- **Linha 117**: remover `const cdSalesData = useMemo(...)`
- Reverter `cdSalesData` → `salesData` em 8 ocorrências: linhas 121, 122, 123, 127, 131, 139, 140, 335
- Adicionar comentário `// Company-level: uses all segments (no brand filter)` antes do bloco lastDate

### 3. `src/pages/PerformanceFinanceira.tsx`
- Adicionar comentário `// Brand-level: excludes B2B (Lets Fly)` antes do cdSalesData memo (sem mudanças funcionais)

### 4. `.lovable/plan.md`
- Atualizar mapa de dados para refletir a arquitetura correta

## Resultado
| Dashboard | Dados | Filtro |
|-----------|-------|--------|
| ExecutiveDashboard | Companhia | nenhum |
| VisaoExecutivaV2 | Companhia | nenhum |
| PerformanceFinanceira | Marca | `getComiDaDragaoOrders` |
| ComportamentoCliente | Consumidor | `getB2COrders` |

