-- R37 · Modelo Financeiro (Fotografia Operacional → Financeiro)
--
-- Solicitação Bruno 04/05: trazer pra dentro do dashboard os 4 KPIs
-- estratégicos que hoje vivem em planilha (Caixa, Runway, EBITDA, Folha)
-- + DRE simplificado e fluxo de caixa.
--
-- Acesso restrito ao owner: RLS + frontend route guard. Outras pessoas
-- (Beatriz, Olivier, etc) não veem nem o item no menu nem conseguem ler
-- pelo Supabase. Pra adicionar outro user no futuro, basta editar a
-- expressão das policies (auth.email() IN (...)).
--
-- Dados iniciais: extraídos da planilha "Realizado Março 2026 + projetado v4"
-- (DRE 2025 + Projeção 2026, 24 meses, cutover realizado vs projetado em
-- 2026-05). Bruno pode editar os números via UI a partir daí.

CREATE TABLE IF NOT EXISTS public.financial_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes date NOT NULL UNIQUE,
  is_projecao boolean DEFAULT false,

  -- Receita Bruta por canal
  receita_b2b numeric(14,2) DEFAULT 0,
  receita_b2c numeric(14,2) DEFAULT 0,
  receita_b2b2c numeric(14,2) DEFAULT 0,
  receita_bruta_total numeric(14,2) DEFAULT 0,

  -- Linhas DRE
  impostos_vendas numeric(14,2) DEFAULT 0,
  receita_liquida numeric(14,2) DEFAULT 0,
  custos_pessoal_op numeric(14,2) DEFAULT 0,
  custos_fixos numeric(14,2) DEFAULT 0,
  custos_variaveis numeric(14,2) DEFAULT 0,
  custos_operacionais_total numeric(14,2) DEFAULT 0,
  lucro_bruto numeric(14,2) DEFAULT 0,
  despesas_pessoal_adm numeric(14,2) DEFAULT 0,
  despesas_marketing numeric(14,2) DEFAULT 0,
  despesas_op_adm_total numeric(14,2) DEFAULT 0,

  -- Resultado
  ebitda numeric(14,2) DEFAULT 0,
  receitas_financeiras numeric(14,2) DEFAULT 0,
  despesas_financeiras numeric(14,2) DEFAULT 0,
  resultado_financeiro numeric(14,2) DEFAULT 0,
  lucro_antes_impostos numeric(14,2) DEFAULT 0,
  lucro_liquido numeric(14,2) DEFAULT 0,

  -- Caixa por banco (saldo final do mês)
  caixa_total numeric(14,2) DEFAULT 0,
  caixa_letsfly_proprio numeric(14,2) DEFAULT 0,
  caixa_xp numeric(14,2) DEFAULT 0,
  caixa_cresol numeric(14,2) DEFAULT 0,
  caixa_itau numeric(14,2) DEFAULT 0,
  caixa_bb numeric(14,2) DEFAULT 0,
  caixa_letsfly_editais numeric(14,2) DEFAULT 0,
  caixa_bb_finep numeric(14,2) DEFAULT 0,
  caixa_bradesco numeric(14,2) DEFAULT 0,

  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.financial_monthly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can read financial_monthly" ON public.financial_monthly;
DROP POLICY IF EXISTS "Owner can write financial_monthly" ON public.financial_monthly;

CREATE POLICY "Owner can read financial_monthly"
  ON public.financial_monthly FOR SELECT
  TO authenticated
  USING (auth.email() = 'multedob@gmail.com');

CREATE POLICY "Owner can write financial_monthly"
  ON public.financial_monthly FOR ALL
  TO authenticated
  USING (auth.email() = 'multedob@gmail.com')
  WITH CHECK (auth.email() = 'multedob@gmail.com');

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_financial_monthly_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_touch_financial_monthly ON public.financial_monthly;
CREATE TRIGGER trg_touch_financial_monthly
  BEFORE UPDATE ON public.financial_monthly
  FOR EACH ROW EXECUTE FUNCTION public.touch_financial_monthly_updated_at();

-- ── Seed inicial (24 meses: jan/2025 - dez/2026) ─────────────────
INSERT INTO public.financial_monthly (mes, is_projecao, receita_b2b, receita_b2c, receita_b2b2c, receita_bruta_total, impostos_vendas, receita_liquida, custos_pessoal_op, custos_fixos, custos_variaveis, custos_operacionais_total, lucro_bruto, despesas_pessoal_adm, despesas_marketing, despesas_op_adm_total, ebitda, receitas_financeiras, despesas_financeiras, resultado_financeiro, lucro_antes_impostos, lucro_liquido, caixa_total, caixa_letsfly_proprio, caixa_xp, caixa_cresol, caixa_itau, caixa_bb, caixa_letsfly_editais, caixa_bb_finep, caixa_bradesco) VALUES
  ('2025-01-01', false, 16576.6, 0, 0, 16576.6, -2864.38, 13712.22, -26732.27, -59039.74, -7313.15, -66352.89, -52640.67, -69370.05, -22400.35, -100806.62, -153447.29, 47643.65, -10203.36, 37440.29, -116007, -127248.74, 1824105.51, 460792.17, 405027.38, 43806.46, -98.87, 12057.2, 1363313.34, 2463504.07, 30000),
  ('2025-02-01', false, 24856.58, 1841.56, 0, 26698.14, -623.3, 26074.84, -23111.69, -49836.81, -12450.37, -62287.18, -36212.34, -70855.96, -28717, -111820.19, -148032.53, 39706.31, -10954.36, 28751.95, -119280.58, -128258.07, 1714147.06, 417287.18, 363683.85, 41786.45, -240.32, 12057.2, 1292767.46, 1955442.69, 30000),
  ('2025-03-01', false, 2209.6, 3120.03, 0, 5329.63, -1003.89, 4325.74, -22170.18, -50612.35, -11869.26, -62481.61, -58155.87, -65968.18, -18864.26, -101902.85, -160058.72, 32613.53, -10968.07, 21645.46, -138413.26, -141836.74, 1631617.42, 399956.35, 272133.43, 44211.33, 75122.33, 8489.26, 1219904.12, 1458499.29, 30000),
  ('2025-04-01', false, 18666.4, 2922.91, 1640, 23229.31, -217.83, 23011.48, -15723.4, -50566.55, -3212.33, -53778.88, -30767.4, -65664.71, -31959.27, -111318.97, -136596.37, 33810.41, -10577.25, 23233.16, -113363.21, -126795.66, 1763408.81, 627117.79, 274762.03, 75100.3, 268841.6, 8413.86, 1127510.63, 1366105.8, 30000),
  ('2025-05-01', false, 28312.91, 4242.6, 1196.68, 33752.19, -957.57, 32794.62, -22938.08, -49980.77, -18982.49, -68963.26, -36168.64, -68299.03, -34164.26, -130866.97, -167035.61, 24064.67, -10040.67, 14024, -153011.61, -156342.57, 1629554.0, 629843.56, 429161.07, 148698.37, 43645.66, 8338.46, 995087.48, 1210066.65, 30000),
  ('2025-06-01', false, 15942.14, 3244.27, 657.22, 19843.63, -1442.79, 18400.84, -24618.48, -53592.71, -7938.63, -61531.34, -43130.5, -70891.35, -36469.46, -122191.14, -165321.64, 34274.52, -10705.33, 23569.19, -141752.45, -144649.54, 1502204.46, 576546.27, 402256.72, 150536.18, 15490.31, 8263.06, 904725.84, 1108418.73, 30000),
  ('2025-07-01', false, 12604.69, 7664.99, 5353.02, 25622.7, -1381.17, 24241.53, -25001.17, -42262.97, -13748.01, -56010.98, -31769.45, -68818.24, -47633.59, -142383.65, -174153.1, 37565.83, -11410.94, 26154.89, -147998.21, -152499.25, 1361953.81, 538322.61, 377755.78, 152231.93, 147.24, 8187.66, 813967.68, 980665.57, 36150),
  ('2025-08-01', false, 16131.55, 8343.41, 5886.65, 30361.61, -1131.47, 29230.14, -22160.74, -62183.97, -13435.88, -75619.85, -46389.71, -71596.43, -15773.22, -108035.2, -154424.91, 31004.92, -10970.01, 20034.91, -134390, -138431.83, 1225799.35, 480257.7, 344142.9, 125304.93, 2697.61, 8112.26, 733326.67, 807428.42, 19000),
  ('2025-09-01', false, 18992.36, 11619.88, 9568.59, 40180.83, -1371.28, 38809.55, -25292.36, -55575.83, -26761.69, -82337.52, -43527.97, -68268.61, -23412.21, -130524.84, -174052.81, 29575.49, -11138.55, 18436.94, -155615.87, -161153.55, 1014097.83, 340122.13, 259482.28, 76735.28, 728.95, 3175.62, 631149.36, 705251.11, 19000),
  ('2025-10-01', false, 14426.34, 13258.76, 4829.22, 32514.32, -1832.31, 30682.01, -21680.05, -58025.14, -31416.17, -89441.31, -58759.3, -68909.98, -24796.46, -118062.18, -176821.48, 27665.58, -10419.33, 17246.25, -159575.23, -163235.44, 949567.89, 362862.27, 311703.05, 50141.77, 1017.45, 0, 516356.28, 590458.03, 19000),
  ('2025-11-01', false, 42330.01, 41751.27, 5941.27, 90022.55, -1523.9, 88498.65, -34323.5, -70007.68, -33171.99, -103179.67, -14681.02, -63320.78, -22892.25, -116706.54, -131387.56, 15562.96, -8975.98, 6586.98, -124800.58, -127809.83, 731509.28, 281286.27, 231669.65, 48599.17, 1017.45, 0, 438671.05, 469671.05, 19000),
  ('2025-12-01', false, 34039.97, 16452.7, 2123.26, 52615.93, -4242.01, 48373.92, -21650.4, -45983.66, -36532.51, -82516.17, -34142.25, -77187.8, -23906.78, -124709.06, -158851.31, 21994.26, -7965.72, 14028.54, -144822.77, -147933.26, 1392055.93, 1051018.13, 890496.32, 53869.99, 106651.82, 0, 353478.25, 384478.25, 19000),
  ('2026-01-01', false, 7729, 16221.08, 2218.99, 26169.07, -2741.16, 23427.91, -27129.07, -55991.41, -11279.05, -67270.46, -43842.55, -84147.33, -16234.47, -143169.18, -187011.73, 19596.72, -9292.83, 10303.89, -176707.84, -180441.93, 1200514.0, 923778.26, 891841.86, 21427.41, 10508.99, 0, 277049.71, 308049.71, 19000),
  ('2026-02-01', false, 16865, 13907.16, 4502.6, 35274.76, -1892.63, 33382.13, -16908.78, -43075.1, -8096.36, -51171.46, -17789.33, -91345.14, -18347.14, -121428.91, -139218.24, 21744.07, -7890.67, 13853.4, -125364.84, -129077.34, 1279558.15, 1063045.23, 849283.59, 11037, 202724.64, 0, 216718.85, 247718.85, 19000),
  ('2026-03-01', false, 12068.5, 16804.44, 3752.14, 32625.08, 0, 32625.08, -18173.87, -52890.76, -26994.83, -79885.59, -47260.51, -71396.49, -15064.4, -141461.76, -188722.27, 24905.14, -6542.24, 18362.9, -170359.37, -175609.1, 1150112.13, 939214.6, 858694.64, 36239.18, 32155.56, 12125.22, 195905.03, 165905.03, 80000),
  ('2026-04-01', false, 12068.5, 36502.68, 3354.95, 51926.13, -4037.61, 47888.52, -18173.87, -52484.24, -16391.17, -68875.41, -20986.89, -71396.49, -20309.97, -149820.31, -170807.2, 20830.6, -6368.29, 14462.31, -156344.89, -161594.62, 1515804.88, 812423.01, 731903.05, 36239.18, 32155.56, 12125.22, 679889.37, 1159889.37, 70000),
  ('2026-05-01', true, 12068.5, 51672.98, 5591.58, 69333.06, -5778.31, 63554.75, -18173.87, -52724.22, -13583.1, -66307.33, -2752.57, -71396.49, -23127.11, -154598.37, -157350.94, 27864.76, -6199.18, 21665.58, -135685.35, -140935.08, 1342269.8, 708387.87, 627867.91, 36239.18, 32155.56, 12125.22, 611889.43, 991889.43, 70000),
  ('2026-06-01', true, 12068.5, 51385.19, 5591.58, 69045.27, -5749.53, 63295.74, -18173.87, -52462.95, -13105.83, -65568.78, -2273.04, -71396.49, -22393.54, -153922.48, -156195.52, 25224.86, -6034.77, 19190.09, -137005.43, -142255.16, 1140414.63, 577460.64, 496940.68, 36239.18, 32155.56, 12125.22, 522461.49, 822461.49, 50000),
  ('2026-07-01', true, 12068.5, 154155.58, 11183.16, 177407.24, -16585.72, 160821.51, -18173.87, -53733.73, -28991.43, -82725.16, 78096.35, -71396.49, -41780.61, -185258.02, -107161.67, 22353.33, -5874.93, 16478.41, -90683.26, -95932.99, 1011881.64, 526181.33, 445661.37, 36239.18, 32155.56, 12125.22, 446707.81, 746707.81, 50000),
  ('2026-08-01', true, 12068.5, 154155.58, 17706.67, 183930.74, -17238.07, 166692.67, -18173.87, -54069.29, -28991.43, -83060.72, 83631.95, -71396.49, -42230.61, -185723.14, -102091.19, 20963.91, -5719.53, 15244.37, -86846.82, -92096.55, 867185.09, 459382.36, 378862.4, 36239.18, 32155.56, 12125.22, 350310.23, 670310.23, 30000),
  ('2026-09-01', true, 12068.5, 205540.77, 17706.67, 235315.94, -24480.39, 210835.55, -18173.87, -58354.73, -41934.23, -100288.96, 110546.59, -71396.49, -52149.15, -221414.36, -110867.77, 19445.7, -5568.46, 13877.24, -96990.53, -102240.26, 725344.83, 398805.01, 318285.05, 36239.18, 32155.56, 12125.22, 270547.32, 590547.32, 30000),
  ('2026-10-01', true, 12068.5, 205540.77, 17706.67, 235315.94, -24480.39, 210835.55, -18173.87, -57629.93, -36934.23, -94564.16, 116271.39, -71396.49, -52599.15, -202093.93, -85822.54, 17960.13, -5421.58, 12538.55, -73283.99, -78533.72, 594211.11, 349612.19, 269092.23, 36239.18, 32155.56, 12125.22, 170106.42, 510106.42, 10000),
  ('2026-11-01', true, 12068.5, 205540.77, 17706.67, 235315.94, -24480.39, 210835.55, -18173.87, -57310.16, -36934.23, -94244.39, 116591.16, -71396.49, -53049.15, -202597.91, -86006.75, 16573.71, -5278.79, 11294.93, -74711.83, -79961.56, 483149.56, 319675.28, 239155.32, 36239.18, 32155.56, 12125.22, 88981.77, 428981.77, 10000),
  ('2026-12-01', true, 12068.5, 205540.77, 17706.67, 235315.94, -24480.39, 210835.55, -18173.87, -57076.15, -36934.23, -94010.38, 116825.17, -71396.49, -53499.15, -202827.38, -86002.21, 15353.06, -5139.96, 10213.1, -75789.11, -81038.84, 371010.72, 289350.65, 208830.69, 36239.18, 32155.56, 12125.22, 7167.57, 347167.57, 10000)
ON CONFLICT (mes) DO UPDATE SET
  is_projecao = EXCLUDED.is_projecao,
  receita_b2b = EXCLUDED.receita_b2b,
  receita_b2c = EXCLUDED.receita_b2c,
  receita_b2b2c = EXCLUDED.receita_b2b2c,
  receita_bruta_total = EXCLUDED.receita_bruta_total,
  impostos_vendas = EXCLUDED.impostos_vendas,
  receita_liquida = EXCLUDED.receita_liquida,
  custos_pessoal_op = EXCLUDED.custos_pessoal_op,
  custos_fixos = EXCLUDED.custos_fixos,
  custos_variaveis = EXCLUDED.custos_variaveis,
  custos_operacionais_total = EXCLUDED.custos_operacionais_total,
  lucro_bruto = EXCLUDED.lucro_bruto,
  despesas_pessoal_adm = EXCLUDED.despesas_pessoal_adm,
  despesas_marketing = EXCLUDED.despesas_marketing,
  despesas_op_adm_total = EXCLUDED.despesas_op_adm_total,
  ebitda = EXCLUDED.ebitda,
  receitas_financeiras = EXCLUDED.receitas_financeiras,
  despesas_financeiras = EXCLUDED.despesas_financeiras,
  resultado_financeiro = EXCLUDED.resultado_financeiro,
  lucro_antes_impostos = EXCLUDED.lucro_antes_impostos,
  lucro_liquido = EXCLUDED.lucro_liquido,
  caixa_total = EXCLUDED.caixa_total,
  caixa_letsfly_proprio = EXCLUDED.caixa_letsfly_proprio,
  caixa_xp = EXCLUDED.caixa_xp,
  caixa_cresol = EXCLUDED.caixa_cresol,
  caixa_itau = EXCLUDED.caixa_itau,
  caixa_bb = EXCLUDED.caixa_bb,
  caixa_letsfly_editais = EXCLUDED.caixa_letsfly_editais,
  caixa_bb_finep = EXCLUDED.caixa_bb_finep,
  caixa_bradesco = EXCLUDED.caixa_bradesco;
