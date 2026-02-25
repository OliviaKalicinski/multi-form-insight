
CREATE OR REPLACE FUNCTION enforce_nf_precedence()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
