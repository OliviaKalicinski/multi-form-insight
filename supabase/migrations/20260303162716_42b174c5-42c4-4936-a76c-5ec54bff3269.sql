
-- Natureza: renomear constraint + adicionar Seeding
ALTER TABLE operational_orders DROP CONSTRAINT chk_natureza;
ALTER TABLE operational_orders ADD CONSTRAINT chk_operational_orders_natureza
  CHECK (natureza_pedido IN ('B2C','B2B','B2B2C','Seeding'));

-- Valor: default seguro + CHECK > 0
ALTER TABLE operational_orders ALTER COLUMN valor_total_informado SET DEFAULT 0.01;
ALTER TABLE operational_orders ADD CONSTRAINT chk_valor_total_positive
  CHECK (valor_total_informado > 0);

-- Destinatário (coexiste com customer_id)
ALTER TABLE operational_orders
  ADD COLUMN destinatario_nome text,
  ADD COLUMN destinatario_documento text,
  ADD COLUMN destinatario_email text,
  ADD COLUMN destinatario_telefone text,
  ADD COLUMN destinatario_endereco text,
  ADD COLUMN destinatario_bairro text,
  ADD COLUMN destinatario_cidade text,
  ADD COLUMN destinatario_cep text;

-- Fiscal
ALTER TABLE operational_orders
  ADD COLUMN tipo_nf text CHECK (tipo_nf IN ('venda','bonificacao','remessa','nao_aplicavel')),
  ADD COLUMN nf_pendente boolean DEFAULT false;

-- DELETE policy em items (para edit flow)
CREATE POLICY "Authenticated can delete operational_order_items"
  ON operational_order_items FOR DELETE TO authenticated USING (true);
