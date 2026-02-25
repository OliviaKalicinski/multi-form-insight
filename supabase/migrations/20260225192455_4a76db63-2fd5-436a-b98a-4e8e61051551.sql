
-- 1. Drop partial indexes (incompatíveis com ON CONFLICT do Supabase JS)
DROP INDEX IF EXISTS idx_sales_pedido_ecommerce;
DROP INDEX IF EXISTS idx_sales_nota_serie;

-- 2. UNIQUE constraints reais
ALTER TABLE sales_data ADD CONSTRAINT uq_sales_nota_serie 
  UNIQUE (numero_nota, serie);

ALTER TABLE sales_data ADD CONSTRAINT uq_sales_pedido_fonte 
  UNIQUE (numero_pedido, fonte_dados);

-- 3. CHECK constraints
ALTER TABLE sales_data ADD CONSTRAINT chk_nf_has_nota
  CHECK (fonte_dados != 'nf' OR numero_nota IS NOT NULL);

ALTER TABLE sales_data ADD CONSTRAINT chk_ecommerce_has_pedido
  CHECK (fonte_dados != 'ecommerce' OR numero_pedido IS NOT NULL);

-- 4. Trigger function
CREATE OR REPLACE FUNCTION enforce_nf_precedence()
RETURNS TRIGGER AS $$
BEGIN
  -- Bloquear ecommerce se NF já existe
  IF NEW.fonte_dados = 'ecommerce' THEN
    IF EXISTS (
      SELECT 1 FROM sales_data
      WHERE numero_pedido = NEW.numero_pedido
        AND numero_pedido IS NOT NULL
        AND fonte_dados = 'nf'
    ) THEN
      RAISE EXCEPTION 'Ecommerce bloqueado: NF já existe para numero_pedido %', NEW.numero_pedido;
    END IF;
  END IF;

  -- NF substitui ecommerce
  IF NEW.fonte_dados = 'nf' 
     AND NEW.numero_pedido IS NOT NULL THEN
    DELETE FROM sales_data
    WHERE numero_pedido = NEW.numero_pedido
      AND numero_pedido IS NOT NULL
      AND fonte_dados = 'ecommerce';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger
CREATE TRIGGER trg_enforce_nf_precedence
BEFORE INSERT ON sales_data
FOR EACH ROW
EXECUTE FUNCTION enforce_nf_precedence();
