-- Tabela de regiões/unidades da academia
CREATE TABLE IF NOT EXISTS academy_regions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value         TEXT NOT NULL UNIQUE,   -- slug ex: 'conceicao', 'guaira'
  label         TEXT NOT NULL,          -- nome exibido ex: 'Conceição das Alagoas'
  state         TEXT NOT NULL,          -- UF ex: 'MG'
  address       TEXT NOT NULL DEFAULT '',
  display_order INT  NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE academy_regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_regions" ON academy_regions FOR SELECT USING (true);
CREATE POLICY "admin_all_regions"   ON academy_regions FOR ALL  USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Seed com as duas unidades existentes
INSERT INTO academy_regions (value, label, state, address, display_order) VALUES
  ('conceicao', 'Conceição das Alagoas', 'MG', 'R. Veríssimo, 500 - Centro, Conceição das Alagoas - MG, 38120-000', 1),
  ('guaira',    'Guaíra',               'SP', 'Av. Acácia Guairense, 1466 - Jardim Alegria, Guaíra - SP, 14791-286', 2)
ON CONFLICT (value) DO NOTHING;
