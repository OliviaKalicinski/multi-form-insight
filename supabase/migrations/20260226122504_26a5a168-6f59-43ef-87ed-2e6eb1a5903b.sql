
-- 1. Tabela sales_data_log (append-only)
CREATE TABLE public.sales_data_log (
  id_log uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_original uuid NOT NULL,
  numero_nota text,
  serie text,
  numero_pedido text,
  payload_completo jsonb NOT NULL,
  substituido_em timestamptz NOT NULL DEFAULT now(),
  upload_id uuid,
  usuario_id uuid,
  arquivo_nome text,
  motivo text DEFAULT 'reupload_idempotente'
);

ALTER TABLE public.sales_data_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert sales_data_log"
  ON public.sales_data_log FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can read sales_data_log"
  ON public.sales_data_log FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE INDEX idx_sdl_numero_pedido ON public.sales_data_log (numero_pedido);
CREATE INDEX idx_sdl_substituido_em ON public.sales_data_log (substituido_em);
CREATE INDEX idx_sdl_upload_id ON public.sales_data_log (upload_id);

-- 2. Colunas extras em upload_history
ALTER TABLE public.upload_history
  ADD COLUMN registros_substituidos integer DEFAULT 0,
  ADD COLUMN pedidos_substituidos text[] DEFAULT '{}';

-- 3. RPC atomica nf_snapshot_and_purge
CREATE OR REPLACE FUNCTION public.nf_snapshot_and_purge(
  p_numero_pedidos text[],
  p_upload_id uuid,
  p_usuario_id uuid,
  p_arquivo_nome text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  purged_count integer;
BEGIN
  -- Guard: array vazio = noop
  IF array_length(p_numero_pedidos, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- 1. Snapshot: copiar registros existentes para o log
  INSERT INTO sales_data_log (
    id_original, numero_nota, serie, numero_pedido,
    payload_completo, upload_id, usuario_id, arquivo_nome, motivo
  )
  SELECT
    id, numero_nota, serie, numero_pedido,
    to_jsonb(sd),
    p_upload_id, p_usuario_id, p_arquivo_nome,
    'reupload_idempotente'
  FROM sales_data sd
  WHERE numero_pedido = ANY(p_numero_pedidos)
    AND fonte_dados = 'nf';

  -- 2. Purge: deletar registros antigos
  DELETE FROM sales_data
  WHERE numero_pedido = ANY(p_numero_pedidos)
    AND fonte_dados = 'nf';

  GET DIAGNOSTICS purged_count = ROW_COUNT;
  RETURN purged_count;
END;
$$;
