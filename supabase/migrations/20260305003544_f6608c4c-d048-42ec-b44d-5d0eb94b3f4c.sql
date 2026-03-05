ALTER TABLE public.operational_order_items 
  ADD COLUMN IF NOT EXISTS lote text,
  ADD COLUMN IF NOT EXISTS valor_unitario numeric(12,2);

CREATE INDEX IF NOT EXISTS idx_operational_order_items_lote
  ON public.operational_order_items (lote)
  WHERE lote IS NOT NULL AND lote <> '';