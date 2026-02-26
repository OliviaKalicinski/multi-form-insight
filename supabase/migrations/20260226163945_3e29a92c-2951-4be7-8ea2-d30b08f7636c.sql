ALTER TABLE sales_data ADD COLUMN IF NOT EXISTS numero_pedido_plataforma TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_pedido_plataforma
  ON sales_data (numero_pedido_plataforma)
  WHERE numero_pedido_plataforma IS NOT NULL;