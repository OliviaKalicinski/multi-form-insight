-- Tabela para dados de vendas (pedidos)
CREATE TABLE public.sales_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT NOT NULL UNIQUE,
  data_venda TIMESTAMPTZ NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL,
  valor_frete NUMERIC(12,2) DEFAULT 0,
  canal TEXT,
  status TEXT,
  cliente_email TEXT,
  cliente_nome TEXT,
  cidade TEXT,
  estado TEXT,
  forma_envio TEXT,
  produtos JSONB NOT NULL,
  cupom TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para dados de anúncios
CREATE TABLE public.ads_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data TEXT NOT NULL,
  campanha TEXT,
  conjunto TEXT,
  anuncio TEXT,
  impressoes INTEGER DEFAULT 0,
  cliques INTEGER DEFAULT 0,
  gasto NUMERIC(12,2) DEFAULT 0,
  conversoes INTEGER DEFAULT 0,
  receita NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(data, campanha, conjunto, anuncio)
);

-- Tabela para dados de seguidores
CREATE TABLE public.followers_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data TEXT NOT NULL UNIQUE,
  total_seguidores INTEGER DEFAULT 0,
  novos_seguidores INTEGER DEFAULT 0,
  unfollows INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para dados de marketing
CREATE TABLE public.marketing_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data TEXT NOT NULL,
  metrica TEXT,
  valor NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(data, metrica)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_data ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (sem autenticação por enquanto)
CREATE POLICY "Allow all access to sales_data" ON public.sales_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to ads_data" ON public.ads_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to followers_data" ON public.followers_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to marketing_data" ON public.marketing_data FOR ALL USING (true) WITH CHECK (true);