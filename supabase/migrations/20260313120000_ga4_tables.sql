-- ═══════════════════════════════════════════════════════════════════════════
-- ARQUIVO 1/5 — Executar primeiro no Supabase SQL Editor
-- https://supabase.com/dashboard/project/hqpupwtddwcvakhhjvcq/sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Sessões por dia e fonte de tráfego
CREATE TABLE IF NOT EXISTS ga4_sessions (
  id               BIGSERIAL PRIMARY KEY,
  date             DATE NOT NULL,
  source_medium    TEXT NOT NULL,
  sessions         INTEGER DEFAULT 0,
  users            INTEGER DEFAULT 0,
  new_users        INTEGER DEFAULT 0,
  transactions     INTEGER DEFAULT 0,
  purchase_revenue NUMERIC(12,2) DEFAULT 0,
  add_to_carts     INTEGER DEFAULT 0,
  checkouts        INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ga4_sessions_uq UNIQUE (date, source_medium)
);

CREATE INDEX IF NOT EXISTS ga4_sessions_date_idx   ON ga4_sessions(date);
CREATE INDEX IF NOT EXISTS ga4_sessions_source_idx ON ga4_sessions(source_medium);

-- 2. Produtos por dia
CREATE TABLE IF NOT EXISTS ga4_products (
  id                   BIGSERIAL PRIMARY KEY,
  date                 DATE NOT NULL,
  item_name            TEXT NOT NULL,
  items_viewed         INTEGER DEFAULT 0,
  items_added_to_cart  INTEGER DEFAULT 0,
  items_purchased      INTEGER DEFAULT 0,
  item_revenue         NUMERIC(12,2) DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ga4_products_uq UNIQUE (date, item_name)
);

CREATE INDEX IF NOT EXISTS ga4_products_date_idx ON ga4_products(date);
CREATE INDEX IF NOT EXISTS ga4_products_item_idx ON ga4_products(item_name);

-- 3. Comportamento por dia (dispositivo, localização, páginas)
CREATE TABLE IF NOT EXISTS ga4_behavior (
  id                  BIGSERIAL PRIMARY KEY,
  date                DATE NOT NULL,
  dimension_type      TEXT NOT NULL, -- 'device' | 'city' | 'landing_page' | 'day_of_week' | 'hour'
  dimension_value     TEXT NOT NULL,
  sessions            INTEGER DEFAULT 0,
  users               INTEGER DEFAULT 0,
  new_users           INTEGER DEFAULT 0,
  bounce_rate         NUMERIC(5,2) DEFAULT 0,
  avg_session_duration NUMERIC(10,2) DEFAULT 0,
  transactions        INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ga4_behavior_uq UNIQUE (date, dimension_type, dimension_value)
);

CREATE INDEX IF NOT EXISTS ga4_behavior_date_idx ON ga4_behavior(date);
CREATE INDEX IF NOT EXISTS ga4_behavior_type_idx ON ga4_behavior(dimension_type);

-- RLS
ALTER TABLE ga4_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga4_products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga4_behavior  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_ga4_sessions"  ON ga4_sessions  FOR SELECT USING (true);
CREATE POLICY "write_ga4_sessions" ON ga4_sessions  FOR ALL    USING (auth.role() = 'service_role');
CREATE POLICY "read_ga4_products"  ON ga4_products  FOR SELECT USING (true);
CREATE POLICY "write_ga4_products" ON ga4_products  FOR ALL    USING (auth.role() = 'service_role');
CREATE POLICY "read_ga4_behavior"  ON ga4_behavior  FOR SELECT USING (true);
CREATE POLICY "write_ga4_behavior" ON ga4_behavior  FOR ALL    USING (auth.role() = 'service_role');
