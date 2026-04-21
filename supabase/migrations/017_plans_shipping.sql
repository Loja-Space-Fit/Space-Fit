-- Planos da academia (por região/unidade)
CREATE TABLE IF NOT EXISTS academy_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region        TEXT NOT NULL,           -- 'conceicao' | 'guaira'
  name          TEXT NOT NULL,           -- Ex: 'Mensal', 'Trimestral'
  period_label  TEXT NOT NULL,           -- Ex: 'Por mês', '3x sem juros'
  price         NUMERIC(10,2) NOT NULL,
  price_total   NUMERIC(10,2),           -- preço total (para planos parcelados)
  installments  INTEGER DEFAULT 1,
  highlight     BOOLEAN DEFAULT FALSE,   -- plano destaque
  features      TEXT[],                  -- lista de benefícios
  active        BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Horários de funcionamento por região
CREATE TABLE IF NOT EXISTS academy_hours (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region        TEXT NOT NULL,
  day_label     TEXT NOT NULL,           -- 'Seg à Sex', 'Sábado', etc.
  hours         TEXT NOT NULL,           -- '05h às 22h' | 'Fechado'
  display_order INTEGER DEFAULT 1
);

-- Taxas de frete por estado (UF)
CREATE TABLE IF NOT EXISTS shipping_rates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uf          CHAR(2) NOT NULL UNIQUE,  -- 'MG', 'SP', etc.
  state_name  TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  min_days    INTEGER DEFAULT 3,
  max_days    INTEGER DEFAULT 7
);

-- Frete grátis acima desse valor (configuração global)
CREATE TABLE IF NOT EXISTS store_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO store_settings (key, value) VALUES
  ('free_shipping_threshold', '299.00'),
  ('origin_cep', '38700000')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE academy_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_hours   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings  ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "public_read_plans"    ON academy_plans   FOR SELECT USING (true);
CREATE POLICY "public_read_hours"    ON academy_hours   FOR SELECT USING (true);
CREATE POLICY "public_read_shipping" ON shipping_rates  FOR SELECT USING (true);
CREATE POLICY "public_read_settings" ON store_settings  FOR SELECT USING (true);

-- Escrita apenas service role (admin via API)
CREATE POLICY "service_write_plans"    ON academy_plans   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_write_hours"    ON academy_hours   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_write_shipping" ON shipping_rates  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_write_settings" ON store_settings  FOR ALL USING (true) WITH CHECK (true);

-- Dados iniciais dos planos — Conceição das Alagoas
INSERT INTO academy_plans (region, name, period_label, price, price_total, installments, highlight, display_order) VALUES
  ('conceicao', 'Mensal',      'Por mês',     129.90, NULL,   1, false, 1),
  ('conceicao', 'Trimestral',  '3x sem juros',123.33, 369.99, 3, false, 2),
  ('conceicao', 'Semestral',   '6x sem juros',119.90, 719.40, 6, false, 3),
  ('conceicao', 'Anual',       '12x sem juros',109.90,1318.80,12,false, 4),
  ('conceicao', 'Premium Anual','Anual • 12x sem juros',149.90,1798.80,12,true,5);

-- Dados iniciais dos planos — Guaíra
INSERT INTO academy_plans (region, name, period_label, price, price_total, installments, highlight, display_order) VALUES
  ('guaira', 'Mensal',      'Por mês',     149.90, NULL,    1, false, 1),
  ('guaira', 'Trimestral',  '3x sem juros',139.90, 419.70,  3, false, 2),
  ('guaira', 'Semestral',   '6x sem juros',129.90, 779.40,  6, false, 3),
  ('guaira', 'Anual',       '12x sem juros',119.90,1438.80, 12,false, 4),
  ('guaira', 'Premium Anual','Anual • 12x sem juros',170.00,2040.00,12,true,5);

-- Planos família e casal (ambas regiões)
INSERT INTO academy_plans (region, name, period_label, price, highlight, features, display_order) VALUES
  ('conceicao','Família','+ acima de 3 pessoas',129.90,false,'{"Acima de 3 pessoas"}',6),
  ('conceicao','Casal','Por pessoa',139.90,false,'{"2 pessoas"}',7),
  ('guaira','Família','+ acima de 3 pessoas',129.90,false,'{"Acima de 3 pessoas"}',6),
  ('guaira','Casal','Por pessoa',139.90,false,'{"2 pessoas"}',7);

-- Features do plano premium
UPDATE academy_plans SET features = ARRAY[
  'Acesso ilimitado em todas as unidades',
  'Cadeira de massagem',
  'Armários personalizados',
  'Avaliação física'
] WHERE name = 'Premium Anual';

-- Horários — Conceição das Alagoas
INSERT INTO academy_hours (region, day_label, hours, display_order) VALUES
  ('conceicao', 'Seg à Sex',  '05h às 22h', 1),
  ('conceicao', 'Sábado',     '08h às 17h', 2),
  ('conceicao', 'Domingo',    'Fechado',    3),
  ('conceicao', 'Feriados',   '07h às 13h', 4);

-- Horários — Guaíra
INSERT INTO academy_hours (region, day_label, hours, display_order) VALUES
  ('guaira', 'Seg à Sex',  '05h às 22h', 1),
  ('guaira', 'Sábado',     '08h às 17h', 2),
  ('guaira', 'Domingo',    'Fechado',    3),
  ('guaira', 'Feriados',   '07h às 13h', 4);

-- Tabela de fretes por estado (valores médios Correios)
INSERT INTO shipping_rates (uf, state_name, price, min_days, max_days) VALUES
  ('AC','Acre',             45.90,10,15),
  ('AL','Alagoas',          32.90, 6,10),
  ('AM','Amazonas',         45.90,10,15),
  ('AP','Amapá',            45.90,10,15),
  ('BA','Bahia',            28.90, 5, 9),
  ('CE','Ceará',            30.90, 6,10),
  ('DF','Distrito Federal', 22.90, 4, 7),
  ('ES','Espírito Santo',   18.90, 3, 5),
  ('GO','Goiás',            18.90, 3, 5),
  ('MA','Maranhão',         32.90, 7,11),
  ('MG','Minas Gerais',     14.90, 2, 4),
  ('MS','Mato Grosso do Sul',20.90,4, 7),
  ('MT','Mato Grosso',      24.90, 5, 8),
  ('PA','Pará',             38.90, 8,12),
  ('PB','Paraíba',          32.90, 6,10),
  ('PE','Pernambuco',       30.90, 6, 9),
  ('PI','Piauí',            32.90, 6,10),
  ('PR','Paraná',           18.90, 3, 5),
  ('RJ','Rio de Janeiro',   19.90, 3, 6),
  ('RN','Rio Grande do Norte',32.90,6,10),
  ('RO','Rondônia',         38.90, 8,12),
  ('RR','Roraima',          45.90,10,15),
  ('RS','Rio Grande do Sul', 22.90,4, 7),
  ('SC','Santa Catarina',   20.90, 3, 6),
  ('SE','Sergipe',          30.90, 5, 9),
  ('SP','São Paulo',        16.90, 2, 4),
  ('TO','Tocantins',        28.90, 5, 8)
ON CONFLICT (uf) DO NOTHING;
