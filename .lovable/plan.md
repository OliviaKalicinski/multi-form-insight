

# Fase 2 — Plano de Implementação Final (5 Blocos)

Incorpora todos os ajustes do review arquitetural: `usuario_id DEFAULT auth.uid()`, `verify_jwt = false` + `getClaims()` (per Lovable Cloud guidelines), `divergencia` JSONB, `reconciliacao_status`, idempotencia via UNIQUE constraint, normalização NFD no parser, e `logEvent` resiliente.

---

## Bloco 1: Timeline do Pedido

### Migration SQL

```sql
CREATE TABLE order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES operational_orders(id) ON DELETE CASCADE,
  tipo_evento text NOT NULL,
  usuario_id uuid DEFAULT auth.uid(),
  payload jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read order_events" ON order_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert order_events" ON order_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_order_events_order_id ON order_events(order_id);
```

### New Files
- **`src/hooks/useOrderEvents.ts`** — `useOrderEvents(orderId)` query + `logEvent(orderId, tipo, payload)` mutation
- **`src/components/kanban/OrderTimeline.tsx`** — chronological event list with icons per type

### Modified Files
- **`src/hooks/useOperationalOrders.ts`** — after each mutation success callback, call `logEvent` wrapped in `try/catch` (timeline never breaks main flow). Events: `pedido_criado`, `status_alterado`, `nf_anexada`, `boleto_anexado`, `pedido_editado`, `pedido_cancelado`
- **`src/components/kanban/EditOrderForm.tsx`** — add collapsible "Historico" section at bottom with `OrderTimeline`

---

## Bloco 2: Reconciliacao Automatica

### Migration SQL

```sql
CREATE TABLE nf_extracted_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES operational_orders(id) ON DELETE CASCADE,
  numero_nf text,
  serie text,
  valor_total numeric,
  cliente_nome text,
  produtos jsonb DEFAULT '[]',
  numero_pedido_ref text,
  raw_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, numero_nf)
);
ALTER TABLE nf_extracted_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read nf_extracted_data" ON nf_extracted_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert nf_extracted_data" ON nf_extracted_data FOR INSERT TO authenticated WITH CHECK (true);

-- Migrate divergencia to JSONB + add reconciliation status
ALTER TABLE operational_orders
  ALTER COLUMN divergencia TYPE jsonb USING
    CASE WHEN divergencia IS NOT NULL THEN jsonb_build_object('legacy', divergencia) ELSE NULL END;
ALTER TABLE operational_orders
  ADD COLUMN reconciliacao_status text DEFAULT NULL;
```

### New Edge Function: `supabase/functions/process-nf-pdf/index.ts`

Config: `[functions.process-nf-pdf] verify_jwt = false`

Flow:
1. Validate auth via `getClaims()`
2. Set `reconciliacao_status = 'processando'`
3. Download PDF from Storage via service role key
4. Extract text using `pdf-parse` (via esm.sh import, with fallback to error status)
5. Regex extraction from DANFE standard layout (multi-product support):
   - `NF-e\s*N[ºo]\s*([\d.]+)` for numero_nf
   - `VALOR TOTAL DA NOTA\s*([\d.,]+)` for valor_total
   - Product rows from "DADOS DO PRODUTO" section (loop)
   - `N[ºo]\s*Pedido:\s*(\d+)` for auto-linking
6. Product normalization — inline map from `operationalProducts` catalog (31 entries), with NFD normalization (`normalize("NFD").replace(/[\u0300-\u036f]/g, "")`) before matching
7. Duplicate NF check — query `nf_extracted_data` for same `numero_nf` on different `order_id`
8. Compare extracted items vs `operational_order_items` (order-independent):
   - Value: `|nf.valor - order.valor| < 0.01`
   - Products: matched by normalized ID
   - Quantities per product
9. Upsert into `nf_extracted_data` (ON CONFLICT order_id, numero_nf)
10. Update order: `reconciliado`, `divergencia` (JSONB: `{valor, produto, quantidade, nf_duplicada}`), `reconciliacao_status = 'concluido'`
11. On any error: set `reconciliacao_status = 'erro'`
12. Log event to `order_events`

### Modified Files
- **`src/hooks/useOperationalOrders.ts`**:
  - Update `OperationalOrder` interface: `divergencia` becomes `Record<string, boolean> | null`, add `reconciliacao_status`
  - In `uploadDocument` mutation (type='nf'), after upload success, invoke `process-nf-pdf` (fire-and-forget with error toast)
- **`src/integrations/supabase/types.ts`** — auto-updated after migration

---

## Bloco 3: Indicadores no Kanban

### Modified Files
- **`src/components/kanban/KanbanColumn.tsx`** — add optional `indicators` prop (max 3), render as small colored badges below column title
- **`src/pages/KanbanOperacional.tsx`** — compute per-column from `ordersByStatus`:
  - NF pendentes (yellow): `nf_pendente && !nf_file_path && !is_fiscal_exempt`
  - Reconciliados (green): `reconciliado === true`
  - Divergentes (red): `divergencia` is not null

No backend changes.

---

## Bloco 4: Badges de Divergencia Refinados

### Modified Files
- **`src/components/kanban/OrderCard.tsx`** — replace generic "Divergente" badge with specific badges from JSONB keys:
  - `divergencia?.valor` → "Divergencia valor"
  - `divergencia?.produto` → "Divergencia produto"
  - `divergencia?.quantidade` → "Divergencia qtd"
  - `divergencia?.nf_duplicada` → "NF Duplicada" (red)
  - Show "Processando..." spinner badge when `reconciliacao_status === 'processando'`

---

## Bloco 5: Drag & Drop UX

### New File
- **`src/components/kanban/DocumentDropZone.tsx`** — reusable component with `onDragOver`/`onDrop`, visual states (idle dashed, hover blue, uploaded green), PDF MIME validation, fallback click-to-upload, filename + "Visualizar"/"Substituir" buttons

### Modified Files
- **`src/components/kanban/EditOrderForm.tsx`** — replace `renderDocumentRow` with `DocumentDropZone`

No backend changes.

---

## Implementation Order

1. Bloco 1 (Timeline) — foundation for audit trail
2. Bloco 2 (Reconciliation) — core automation + Edge Function
3. Bloco 3 (Column indicators) — visibility
4. Bloco 4 (Divergence badges) — detail
5. Bloco 5 (Drag & Drop) — UX polish

**Totals:** 2 new tables, 1 edge function, 3 new components/hooks, modifications to 4 existing files. Each block independently deployable.

