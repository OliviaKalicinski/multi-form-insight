
-- Bloco 1: Timeline do Pedido
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

-- Bloco 2: NF Extracted Data
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
  ADD COLUMN IF NOT EXISTS reconciliacao_status text DEFAULT NULL;
