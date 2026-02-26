-- 1. Remover constraint global que bloqueia NF multi-nota por pedido
ALTER TABLE sales_data DROP CONSTRAINT IF EXISTS uq_sales_pedido_fonte;

-- 2. Recriar como partial unique index (somente ecommerce)
CREATE UNIQUE INDEX uq_sales_pedido_fonte_ecommerce
  ON sales_data (numero_pedido, fonte_dados)
  WHERE fonte_dados = 'ecommerce';