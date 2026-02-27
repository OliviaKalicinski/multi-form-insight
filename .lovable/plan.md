

# Fase 1 -- Customer como Entidade Operacional (Plano Final Refinado)

## Correcoes incorporadas desta revisao

| Feedback | Decisao |
|---|---|
| `cliente_email` e divida tecnica | Documentado, nao renomeado agora. SQL usa `cliente_email` mapeado como identificador |
| `average_days_between_purchases` com 1 pedido | NULL explicito (nao 0, nao calculado) |
| Churn na view: usar aritmetica de date | `(now()::date - last_order_date::date)` em vez de `EXTRACT` |
| `buildCustomerSnapshot` no front e risco de dupla verdade | Mantido apenas como fallback temporario; dashboard migra para ler `customer_full` o mais rapido possivel |
| `total_orders_all` conta o que? | Todos os tipos de movimento (venda + brinde + bonificacao + devolucao etc.). Metricas economicas usam apenas `total_orders_revenue` |
| Segment muda se regra mudar | Aceito. `recalculate_all_customers()` existe como ferramenta administrativa para isso |

---

## Arquitetura

```text
sales_data (imutavel)
       |
       v
recalculate_customer(cpf_cnpj)   -- por cliente individual
recalculate_all_customers()      -- manutencao/rebuild
       |
       v
customer (entidade real, UPDATE nao DELETE)
  - campos derivados: revenue, orders, segment, ticket_medio
  - campos operacionais: tags, observacoes, responsavel (NUNCA tocados por recalc)
       |
       v
customer_full (view: churn dinamico via date arithmetic)
       |
       v
dashboard / CRM / segmentacao
```

---

## Etapa 1: Migracao SQL

### 1a. Tabela `customer`

```sql
CREATE TABLE customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf_cnpj text NOT NULL UNIQUE,
  nome text,

  -- Derivados (atualizados por recalculate)
  total_orders_revenue integer NOT NULL DEFAULT 0,
  total_orders_all integer NOT NULL DEFAULT 0,
  total_revenue numeric(14,2) NOT NULL DEFAULT 0,
  ticket_medio numeric(14,2) DEFAULT 0,
  first_order_date timestamptz,
  last_order_date timestamptz,
  average_days_between_purchases numeric(10,2),  -- NULL se < 2 pedidos
  segment text CHECK (segment IN ('Primeira Compra','Recorrente','Fiel','VIP')),

  -- Operacionais (manuais, NUNCA sobrescritos por recalc)
  tags jsonb DEFAULT '[]',
  observacoes text,
  responsavel text,
  prioridade text,
  status_manual text,
  last_contact_date timestamptz,

  -- Controle
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  recalculated_at timestamptz
);

ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
```

**RLS:**
- SELECT: authenticated users (`true`)
- INSERT/UPDATE/DELETE: admins only (`is_admin(auth.uid())`)

### 1b. View `customer_full`

```sql
CREATE VIEW customer_full AS
SELECT *,
  CASE
    WHEN last_order_date IS NULL THEN NULL
    ELSE (now()::date - last_order_date::date)
  END AS days_since_last_purchase,
  CASE
    WHEN last_order_date IS NULL THEN 'churned'
    WHEN (now()::date - last_order_date::date) <= 30 THEN 'active'
    WHEN (now()::date - last_order_date::date) <= 60 THEN 'at_risk'
    WHEN (now()::date - last_order_date::date) <= 90 THEN 'inactive'
    ELSE 'churned'
  END AS churn_status
FROM customer;
```

Churn nunca e congelado. Sempre derivado de `last_order_date` vs `now()::date`.

### 1c. Funcao `recalculate_customer(p_cpf_cnpj text)`

Funcao SQL SECURITY DEFINER que:

1. Seleciona todos os pedidos de `sales_data` onde `cliente_email = p_cpf_cnpj`
2. Filtra `tipo_movimento = 'venda'` para metricas economicas (`total_orders_revenue`, `total_revenue`)
3. Conta todos os pedidos sem filtro para `total_orders_all`
4. Calcula `total_revenue` usando `COALESCE(total_faturado, valor_total + COALESCE(valor_frete, 0))` (equivalente a `getOfficialRevenue`)
5. Calcula `ticket_medio = total_revenue / total_orders_revenue`
6. Calcula `average_days_between_purchases` como media dos intervalos entre compras de venda (NULL se < 2 pedidos)
7. Determina `segment`:
   - `total_orders_revenue >= 5 OR total_revenue >= 500` = VIP
   - `total_orders_revenue >= 3` = Fiel
   - `total_orders_revenue = 2` = Recorrente
   - else = Primeira Compra
8. Faz UPSERT: INSERT se novo, UPDATE apenas campos derivados se existente (preserva tags, observacoes, responsavel, prioridade, status_manual, last_contact_date)

### 1d. Funcao `recalculate_all_customers()`

Loop sobre `SELECT DISTINCT cliente_email FROM sales_data WHERE cliente_email IS NOT NULL`, chamando `recalculate_customer()` para cada. Ferramenta administrativa.

---

## Etapa 2: Tipos TypeScript

### 2a. Novo tipo `CustomerSnapshot` em `src/types/marketing.ts`

```text
export interface CustomerSnapshot {
  cpfCnpj: string;
  nome: string;
  totalOrdersRevenue: number;
  totalOrdersAll: number;
  totalRevenue: number;
  firstOrderDate: Date;
  lastOrderDate: Date;
  averageDaysBetweenPurchases: number | null;  -- NULL se < 2 pedidos
  segment: 'Primeira Compra' | 'Recorrente' | 'Fiel' | 'VIP';
  ticketMedio: number;
  // Da view (nao persistidos)
  daysSinceLastPurchase?: number;
  churnStatus?: 'active' | 'at_risk' | 'inactive' | 'churned';
  // CRM (operacionais)
  tags?: string[];
  observacoes?: string;
  responsavel?: string;
}
```

### 2b. Atualizar `CustomerSegment`

Remover `averageTicket`. Adicionar `totalOrders`, `ticketMedio` (receita/pedidos), `arpu` (receita/clientes).

---

## Etapa 3: `buildCustomerSnapshot` -- `src/utils/customerSnapshot.ts`

Funcao pura para uso em memoria (fallback temporario e metricas filtradas por mes).

- Filtra com `isRevenueOrder` para metricas economicas
- Agrupa todos os orders por `cpfCnpj` para `totalOrdersAll`
- Usa `getOfficialRevenue` para toda receita
- `averageDaysBetweenPurchases` = NULL se < 2 pedidos de venda
- NAO calcula churn (responsabilidade da view)

---

## Etapa 4: Refatorar `customerBehaviorMetrics.ts`

- Chama `buildCustomerSnapshot(orders)` internamente
- Deriva metricas agregadas dos snapshots
- Para churn em memoria: usa `new Date()` como referencia (compatibilidade ate migrar para leitura do banco)
- Remove `analyzeChurn` e `segmentCustomers` como funcoes separadas
- `analyzeOrderVolume` e `analyzeSalesPeaks` continuam recebendo orders (metricas de pedido), mas usam `getOfficialRevenue` para `revenue`
- Segmentos usam `ticketMedio` (receita/pedidos) e `arpu` (receita/clientes)

---

## Etapa 5: Atualizar componentes UI

### SegmentDetailTable.tsx
- Coluna "Ticket Medio" le `segment.ticketMedio` (receita por pedido)
- Nova coluna "ARPU" le `segment.arpu` (receita por cliente)
- Linha total: `ticketMedio = totalRevenue / totalOrders`

### AnaliseSamples.tsx (linhas 146-169)
- Trocar `averageTicket: 0` por `ticketMedio: 0, arpu: 0, totalOrders: 0`

### SegmentRevenueChart.tsx
- Sem alteracao (nao usa `averageTicket`)

---

## Etapa 6: Integrar recalculate no fluxo de upload

Em `handleUploadComplete` (arquivo `src/pages/Upload.tsx`):
- Apos `refreshFromDatabase()`, chamar RPC `recalculate_all_customers()`

Alternativa mais eficiente: extrair CPFs dos pedidos inseridos e chamar `recalculate_customer()` individualmente. Decisao durante implementacao.

---

## Etapa 7: Popular tabela inicial

Executar `recalculate_all_customers()` uma vez apos criacao da tabela para popular com dados existentes.

---

## Sequencia de implementacao

1. Migracao SQL (tabela `customer`, view `customer_full`, funcoes `recalculate_*`, RLS)
2. Tipos TypeScript (`CustomerSnapshot`, `CustomerSegment` atualizado)
3. `buildCustomerSnapshot` (funcao pura em `src/utils/customerSnapshot.ts`)
4. Refatorar `customerBehaviorMetrics` para usar snapshot internamente
5. Atualizar componentes UI (`averageTicket` -> `ticketMedio`/`arpu`)
6. Integrar recalculate no fluxo de upload
7. Popular tabela com `recalculate_all_customers()`

## O que NAO muda

- Thresholds de churn (30/60/90 dias)
- Regras de segmentacao (1/2/3-4/5+ OR >=500)
- `analyzeOrderVolume` e `analyzeSalesPeaks` (metricas de pedido)
- Pagina de Publico (Instagram)
- `isRevenueOrder` e `getOfficialRevenue` (reutilizadas)
- Coluna `cliente_email` em `sales_data` (mapeada como cpfCnpj -- renomeacao adiada)
- `averageTicket` em `PlatformPerformance`, `TicketDistributionCompact`, `comparisonCalculator` -- esses sao ticket medio por PEDIDO (corretos), nao por cliente

