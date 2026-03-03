
-- ============================================================
-- Kanban Operacional — Fase 1
-- ============================================================

-- 1. Tabela operational_orders (header do pedido)
CREATE TABLE public.operational_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customer(id),
  natureza_pedido text NOT NULL DEFAULT 'B2C',
  status_operacional text NOT NULL DEFAULT 'pedidos',
  valor_total_informado numeric NOT NULL DEFAULT 0,
  forma_pagamento text,
  responsavel text,
  observacoes text,
  
  -- Expedição / Fechamento
  lote text,
  peso_total numeric,
  medidas text,
  
  -- Envio
  codigo_rastreio text,
  numero_nf text,
  is_fiscal_exempt boolean NOT NULL DEFAULT false,
  
  -- Reconciliação
  reconciliado boolean NOT NULL DEFAULT false,
  divergencia text,
  
  -- Origem (link opcional a pedido externo)
  pedido_origem_tipo text,
  pedido_origem_id text,
  
  -- Auditoria
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_status CHECK (status_operacional IN ('pedidos', 'aguardando_expedicao', 'fechado', 'enviado', 'cancelado')),
  CONSTRAINT chk_natureza CHECK (natureza_pedido IN ('B2C', 'B2B', 'B2B2C')),
  CONSTRAINT chk_pagamento CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('pix', 'boleto', 'cartao', 'transferencia', 'outro')),
  CONSTRAINT chk_origem_integridade CHECK (
    (pedido_origem_tipo IS NULL AND pedido_origem_id IS NULL)
    OR
    (pedido_origem_tipo IS NOT NULL AND pedido_origem_id IS NOT NULL)
  )
);

-- 2. Tabela operational_order_items
CREATE TABLE public.operational_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operational_order_id uuid NOT NULL REFERENCES public.operational_orders(id) ON DELETE CASCADE,
  produto text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  unidade text NOT NULL DEFAULT 'un',
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT chk_unidade CHECK (unidade IN ('un', 'kg'))
);

-- 3. Índices
CREATE INDEX idx_operational_orders_numero_nf ON public.operational_orders(numero_nf);
CREATE INDEX idx_operational_orders_natureza ON public.operational_orders(natureza_pedido);
CREATE INDEX idx_operational_orders_status ON public.operational_orders(status_operacional);
CREATE INDEX idx_operational_order_items_order_id ON public.operational_order_items(operational_order_id);

-- 4. Trigger set_updated_at (reutilizável)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON public.operational_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS
ALTER TABLE public.operational_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_order_items ENABLE ROW LEVEL SECURITY;

-- operational_orders policies (authenticated: SELECT, INSERT, UPDATE — no DELETE)
CREATE POLICY "Authenticated can read operational_orders"
  ON public.operational_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert operational_orders"
  ON public.operational_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update operational_orders"
  ON public.operational_orders FOR UPDATE
  TO authenticated
  USING (true);

-- operational_order_items policies
CREATE POLICY "Authenticated can read operational_order_items"
  ON public.operational_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert operational_order_items"
  ON public.operational_order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update operational_order_items"
  ON public.operational_order_items FOR UPDATE
  TO authenticated
  USING (true);

-- 6. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('operational-documents', 'operational-documents', false);
