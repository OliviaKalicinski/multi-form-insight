
# Migrar paginas de clientes para ler de customer_full

## Objetivo

Eliminar o modo hibrido atual onde metricas de cliente sao calculadas em memoria via `calculateCustomerBehaviorMetrics(salesData)`. As tres paginas (SegmentacaoClientes, AnaliseChurn, ComportamentoCliente) passam a ler exclusivamente da view `customer_full` para metricas de cliente. Metricas de pedido (volume, picos) continuam calculadas localmente a partir de `salesData` filtrado.

## Mudancas

### 1. Criar hook `useCustomerData` (`src/hooks/useCustomerData.ts`)

Faz `supabase.from('customer_full').select('*')` e agrega:

- `customers`: lista completa de `CustomerSnapshot[]` (mapeando colunas do banco para o tipo TS)
- `segments`: `CustomerSegment[]` agregado por `segment` (com `ticketMedio`, `arpu`, `totalOrders`)
- `churnMetrics`: `{ totalClientes, clientesAtivos, clientesEmRisco, clientesInativos, clientesChurn, taxaChurn, taxaRetencao }`
- `summaryMetrics`: `{ taxaRecompra, customerLifetimeValue, averageDaysBetweenPurchases }` -- todas derivadas dos campos do banco, sem recalcular regras
- `churnRiskCustomers`: `ChurnRiskCustomer[]` -- clientes com `churn_status != 'active'`, mapeados para o tipo existente
- `isLoading`, `error`

Toda agregacao e feita no hook sobre os registros retornados. Nenhuma regra de segmento ou churn e recalculada -- vem pronto da view.

Guard de identidade fraca aplicado no fetch: filtra registros com `cpf_cnpj` vazio, null, ou que comece com `nf-`, ou com menos de 4 caracteres.

### 2. Corrigir `buildCustomerSnapshot` (`src/utils/customerSnapshot.ts`)

Adicionar guard de identidade fraca no inicio:
```
const validOrders = orders.filter(o => o.cpfCnpj && !o.cpfCnpj.startsWith('nf-') && o.cpfCnpj.trim().length > 3);
```
Usar `validOrders` em vez de `orders` para todo agrupamento.

### 3. Migrar `SegmentacaoClientes.tsx`

- Remover import de `calculateCustomerBehaviorMetrics`
- Remover import de `useDashboard` (nao precisa mais de `salesData`)
- Usar `useCustomerData()` para obter `segments`, `isLoading`
- Passar `segments` diretamente para `CustomerSegmentationChart` e `SegmentRevenueChart` e `SegmentDetailTable`
- Manter layout e indicador "todo o historico"

### 4. Migrar `AnaliseChurn.tsx`

- Remover import de `calculateCustomerBehaviorMetrics`
- Remover `useDashboard` (nao precisa de `salesData`)
- Usar `useCustomerData()` para obter `churnMetrics`, `churnRiskCustomers`, `isLoading`
- Os KPI cards leem de `churnMetrics` (totalClientes, clientesAtivos, clientesEmRisco, clientesInativos, taxaChurn)
- `valorEmRisco` calculado a partir de `churnRiskCustomers.reduce(sum => sum + valorTotal)`
- `ChurnFunnelChart` recebe `ativos/emRisco/inativos/churn` de `churnMetrics`
- `ChurnRiskTable` recebe `churnRiskCustomers` do hook

### 5. Migrar `ComportamentoCliente.tsx` (hibrido)

**Do banco (via hook):**
- Total clientes, taxa recompra, CLV, dias entre compras, clientes ativos/risco/inativos/churn, taxa churn/retencao
- Breakdown novos vs recorrentes (do `segments`)
- Estas metricas NAO variam com filtro de mes (sao historicas)

**Do salesData filtrado (manter calculo local):**
- `analyzeOrderVolume(filteredOrders)` -- volume diario/semanal/mensal
- `analyzeSalesPeaks(filteredOrders)` -- picos de venda
- Tendencia de volume (mes atual vs anterior)

**Modo comparacao multi-mes:**
- Metricas de cliente (totalClientes, taxaRecompra, clientesAtivos, receitaPorCliente) NAO variam por mes -- mostrar aviso de que segmentacao de cliente e historica
- Metricas de volume por mes continuam funcionando normalmente

### 6. Marcar funcoes legadas como deprecated

Em `customerBehaviorMetrics.ts`:
- `analyzeChurn`: adicionar `@deprecated` -- churn agora vem da view `customer_full`
- `segmentCustomers`: adicionar `@deprecated` -- segmentos vem da tabela `customer`
- `calculateCustomerBehaviorMetrics`: adicionar `@deprecated` -- substituido por `useCustomerData` hook
- Manter `analyzeOrderVolume` e `analyzeSalesPeaks` (metricas de pedido, ainda necessarias)
- Manter `analyzeChurn` no export para `executiveMetricsCalculator.ts` que ainda a consome (migracao do executivo e fase posterior)

## Sequencia de implementacao

1. Corrigir `buildCustomerSnapshot` (guard de identidade fraca)
2. Criar `useCustomerData` hook
3. Migrar `SegmentacaoClientes` para hook
4. Migrar `AnaliseChurn` para hook
5. Migrar `ComportamentoCliente` (hibrido: hook + volume local)
6. Marcar funcoes legadas como deprecated

## O que NAO muda

- `analyzeOrderVolume` e `analyzeSalesPeaks` (metricas de pedido)
- Tabela `customer` e view `customer_full` (ja existem)
- Fluxo de upload com RPC `recalculate_all_customers`
- `executiveMetricsCalculator.ts` (continua usando `analyzeChurn` por enquanto -- migra em fase posterior)
- Componentes UI de graficos (recebem mesmas props)
- `ChurnRiskTable` e `ChurnFunnelChart` (mesma interface)

## Detalhes tecnicos do hook

O hook usa `useQuery` do TanStack React Query para cache e loading state. Query key: `['customer-data']`. Stale time: 5 minutos. O hook mapeia snake_case do banco para camelCase do TypeScript internamente. A filtragem de identidade fraca acontece no `.filter()` pos-fetch, nao no SQL (para simplicidade e porque o volume e pequeno -- ~924 registros).
