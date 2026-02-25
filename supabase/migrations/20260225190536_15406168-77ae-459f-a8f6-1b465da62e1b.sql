
-- Etapa 1: Ingesta Fiscal (NF) - Adicionar campos fiscais à sales_data

-- 1. Novos campos fiscais
ALTER TABLE public.sales_data
  ADD COLUMN IF NOT EXISTS id_nota text,
  ADD COLUMN IF NOT EXISTS numero_nota text,
  ADD COLUMN IF NOT EXISTS serie text,
  ADD COLUMN IF NOT EXISTS chave_acesso text,
  ADD COLUMN IF NOT EXISTS valor_produtos numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_desconto numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_nota numeric,
  ADD COLUMN IF NOT EXISTS total_faturado numeric,
  ADD COLUMN IF NOT EXISTS peso_liquido numeric,
  ADD COLUMN IF NOT EXISTS peso_bruto numeric,
  ADD COLUMN IF NOT EXISTS regime_tributario text,
  ADD COLUMN IF NOT EXISTS natureza_operacao text,
  ADD COLUMN IF NOT EXISTS cfop text,
  ADD COLUMN IF NOT EXISTS ncm text,
  ADD COLUMN IF NOT EXISTS frete_por_conta text,
  ADD COLUMN IF NOT EXISTS municipio text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS data_emissao_nf date,
  ADD COLUMN IF NOT EXISTS data_saida_nf date,
  ADD COLUMN IF NOT EXISTS fonte_dados text DEFAULT 'ecommerce',
  ADD COLUMN IF NOT EXISTS segmento_cliente text;

-- 2. Tornar numero_pedido nullable
ALTER TABLE public.sales_data ALTER COLUMN numero_pedido DROP NOT NULL;

-- 3. Remover constraint UNIQUE global de numero_pedido
ALTER TABLE public.sales_data DROP CONSTRAINT IF EXISTS sales_data_numero_pedido_key;

-- 4. Índice parcial para ecommerce (unicidade por pedido apenas para fonte ecommerce)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_pedido_ecommerce
  ON public.sales_data (numero_pedido)
  WHERE numero_pedido IS NOT NULL AND fonte_dados = 'ecommerce';

-- 5. Índice composto para NF (unicidade por nota + série)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_nota_serie
  ON public.sales_data (numero_nota, serie)
  WHERE numero_nota IS NOT NULL AND serie IS NOT NULL;

-- 6. Índice de performance por data
CREATE INDEX IF NOT EXISTS idx_sales_data_venda
  ON public.sales_data (data_venda);
