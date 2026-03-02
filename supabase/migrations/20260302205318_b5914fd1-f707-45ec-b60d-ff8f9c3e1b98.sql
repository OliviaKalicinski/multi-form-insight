
-- Drop existing monolithic trigger and function
DROP TRIGGER IF EXISTS trg_enforce_nf_precedence ON sales_data;
DROP FUNCTION IF EXISTS public.enforce_nf_precedence();

-- 1. BEFORE INSERT: Inherit canal/forma_envio from ecommerce to NF
CREATE OR REPLACE FUNCTION public.inherit_ecommerce_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_canal text;
  v_forma_envio text;
BEGIN
  IF NEW.fonte_dados = 'nf'
     AND NEW.numero_pedido_plataforma IS NOT NULL THEN

    SELECT canal, forma_envio
      INTO v_canal, v_forma_envio
    FROM sales_data
    WHERE fonte_dados = 'ecommerce'
      AND numero_pedido = NEW.numero_pedido_plataforma
      AND cliente_email = NEW.cliente_email
    LIMIT 1;

    IF NEW.canal IS NULL OR NEW.canal = '' THEN
      NEW.canal := v_canal;
    END IF;

    IF NEW.forma_envio IS NULL OR NEW.forma_envio = '' THEN
      NEW.forma_envio := v_forma_envio;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inherit_ecommerce_metadata
BEFORE INSERT ON sales_data
FOR EACH ROW
EXECUTE FUNCTION public.inherit_ecommerce_metadata();

-- 2. BEFORE INSERT: Block ecommerce if NF already exists
CREATE OR REPLACE FUNCTION public.block_ecommerce_if_nf_exists()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.fonte_dados = 'ecommerce' THEN
    IF EXISTS (
      SELECT 1
      FROM sales_data
      WHERE fonte_dados = 'nf'
        AND numero_pedido_plataforma = NEW.numero_pedido
        AND cliente_email = NEW.cliente_email
    ) THEN
      RAISE EXCEPTION
        'Ecommerce bloqueado: NF já existe para pedido plataforma %',
        NEW.numero_pedido;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_ecommerce_if_nf_exists
BEFORE INSERT ON sales_data
FOR EACH ROW
EXECUTE FUNCTION public.block_ecommerce_if_nf_exists();

-- 3. AFTER INSERT: Delete ecommerce duplicate after NF is persisted
CREATE OR REPLACE FUNCTION public.delete_ecommerce_if_nf()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.fonte_dados = 'nf'
     AND NEW.numero_pedido_plataforma IS NOT NULL THEN

    DELETE FROM sales_data
    WHERE fonte_dados = 'ecommerce'
      AND numero_pedido = NEW.numero_pedido_plataforma
      AND cliente_email = NEW.cliente_email;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_delete_ecommerce_if_nf
AFTER INSERT ON sales_data
FOR EACH ROW
EXECUTE FUNCTION public.delete_ecommerce_if_nf();
