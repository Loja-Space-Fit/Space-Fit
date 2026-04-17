-- =============================================================================
-- Space Fit - Schema principal do banco de dados
-- =============================================================================
-- Execute no Supabase: Dashboard -> SQL Editor -> New query -> Cole e execute
--
-- Ordem importa: tabelas referenciadas por FK devem existir antes das que
-- as referenciam. Segue a sequencia: categorias -> produtos -> pedidos -> etc.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABELAS
-- =============================================================================

-- Categorias organizam o catalogo em secoes (Roupas, Suplementos, Acessorios).
-- display_order controla a ordem de exibicao no menu — sem isso dependiamos
-- da data de criacao, que nao faz sentido pro usuario final.
CREATE TABLE IF NOT EXISTS categories (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT        NOT NULL,
  slug          TEXT        NOT NULL UNIQUE,
  description   TEXT,
  image_url     TEXT,
  active        BOOLEAN     DEFAULT TRUE,
  display_order INT         DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Produtos sao o coracao da loja. compare_price serve para mostrar
-- o "de R$ X por R$ Y" — so aparece se for maior que price.
-- images e sizes sao arrays porque um produto pode ter varias fotos e tamanhos.
CREATE TABLE IF NOT EXISTS products (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id   UUID         REFERENCES categories(id) ON DELETE SET NULL,
  name          TEXT         NOT NULL,
  slug          TEXT         NOT NULL UNIQUE,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL,
  compare_price NUMERIC(10,2),                 -- preco original (riscado)
  stock         INT          DEFAULT 0,
  images        TEXT[]       DEFAULT '{}',
  sizes         TEXT[]       DEFAULT '{}',
  active        BOOLEAN      DEFAULT TRUE,
  featured      BOOLEAN      DEFAULT FALSE,    -- aparece na home
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Avaliacoes de clientes. approved = false por padrao para evitar spam —
-- o admin precisa aprovar antes de aparecer na pagina do produto.
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating        INT  CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  approved      BOOLEAN     DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Banners da home. display_order define a sequencia no carrossel.
CREATE TABLE IF NOT EXISTS banners (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT,
  subtitle      TEXT,
  image_url     TEXT        NOT NULL,
  link          TEXT,
  active        BOOLEAN     DEFAULT TRUE,
  display_order INT         DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Cupons de desconto. type pode ser 'percent' (ex: 10% off) ou 'fixed' (ex: R$ 20 off).
-- uses_count e incrementado a cada uso — max_uses null = sem limite.
-- expires_at null = nao expira.
CREATE TABLE IF NOT EXISTS coupons (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT          NOT NULL UNIQUE,
  type        TEXT          NOT NULL CHECK (type IN ('percent', 'fixed')),
  value       NUMERIC(10,2) NOT NULL,
  min_order   NUMERIC(10,2) DEFAULT 0,   -- valor minimo do pedido para usar
  max_uses    INT,                        -- null = ilimitado
  uses_count  INT           DEFAULT 0,
  active      BOOLEAN       DEFAULT TRUE,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- Pedidos. address e items ficam em JSONB porque a estrutura pode variar
-- (diferentes campos de endereco, diferentes produtos com tamanhos distintos).
-- mp_payment_id e mp_preference_id sao para o Mercado Pago — ficam null
-- enquanto o pagamento nao for integrado.
CREATE TABLE IF NOT EXISTS orders (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number    TEXT          UNIQUE,               -- gerado pelo trigger abaixo
  user_id         UUID          REFERENCES auth.users(id),  -- null para compras sem login
  customer_name   TEXT          NOT NULL,
  customer_phone  TEXT          NOT NULL,
  customer_email  TEXT,
  address         JSONB,
  items           JSONB         NOT NULL,
  subtotal        NUMERIC(10,2) NOT NULL,
  discount        NUMERIC(10,2) DEFAULT 0,
  shipping        NUMERIC(10,2) DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL,
  payment_method  TEXT          NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'pickup')),
  payment_status  TEXT          DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected', 'refunded')),
  order_status    TEXT          DEFAULT 'pending' CHECK (order_status IN ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled')),
  coupon_code     TEXT,
  mp_payment_id   TEXT,
  mp_preference_id TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- Programa de fidelidade: cada cliente tem uma conta com pontos acumulados.
-- Usamos o telefone como chave porque o cliente pode nao ter conta no site.
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_phone TEXT          NOT NULL UNIQUE,
  customer_name  TEXT,
  points         INT           DEFAULT 0,
  total_spent    NUMERIC(10,2) DEFAULT 0,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

-- Historico de pontos ganhos e resgatados por pedido.
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_phone   TEXT        NOT NULL,
  order_id         UUID        REFERENCES orders(id),
  points_earned    INT         DEFAULT 0,
  points_redeemed  INT         DEFAULT 0,
  description      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Kits/Combos: agrupamento de produtos vendidos juntos com preco especial.
CREATE TABLE IF NOT EXISTS bundles (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT          NOT NULL,
  slug        TEXT          NOT NULL UNIQUE,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL,
  image_url   TEXT,
  active      BOOLEAN       DEFAULT TRUE,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- Itens que compoem cada kit. quantity = quantas unidades do produto entram no kit.
CREATE TABLE IF NOT EXISTS bundle_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_id  UUID REFERENCES bundles(id)  ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity   INT  DEFAULT 1
);

-- Planos de assinatura recorrente (ex: Whey todo mes).
CREATE TABLE IF NOT EXISTS subscription_plans (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT          NOT NULL,
  description TEXT,
  product_id  UUID          REFERENCES products(id),
  price       NUMERIC(10,2) NOT NULL,
  interval    TEXT          DEFAULT 'monthly' CHECK (interval IN ('monthly', 'quarterly', 'yearly')),
  active      BOOLEAN       DEFAULT TRUE,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- Assinaturas ativas de clientes.
CREATE TABLE IF NOT EXISTS subscriptions (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id           UUID        REFERENCES subscription_plans(id),
  customer_name     TEXT        NOT NULL,
  customer_phone    TEXT        NOT NULL,
  customer_email    TEXT,
  status            TEXT        DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  next_billing_date DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FUNCOES E TRIGGERS
-- =============================================================================

-- Gera o numero de pedido no formato SF-2025-000001.
-- Usamos uma sequence separada para garantir unicidade mesmo com insercoes
-- concorrentes — uuid seria mais seguro mas menos legivel pelo admin.
CREATE SEQUENCE IF NOT EXISTS sequencia_pedidos START 1;

CREATE OR REPLACE FUNCTION gerar_numero_pedido()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'SF-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('sequencia_pedidos')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER definir_numero_pedido
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION gerar_numero_pedido();

-- Atualiza updated_at automaticamente em qualquer UPDATE.
-- Funcao generica reusada por varios triggers abaixo.
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER atualizar_produtos
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE OR REPLACE TRIGGER atualizar_pedidos
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Regra geral: o publico ve o que e necessario para navegar na loja.
-- Escrita passa pelo service_role (backend) que bypassa RLS por design.

ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;

-- Leitura publica: apenas registros ativos/aprovados aparecem na loja
CREATE POLICY "catalogo: categorias ativas"       ON categories          FOR SELECT USING (active = TRUE);
CREATE POLICY "catalogo: produtos ativos"         ON products            FOR SELECT USING (active = TRUE);
CREATE POLICY "catalogo: banners ativos"          ON banners             FOR SELECT USING (active = TRUE);
CREATE POLICY "catalogo: reviews aprovados"       ON reviews             FOR SELECT USING (approved = TRUE);
CREATE POLICY "catalogo: kits ativos"             ON bundles             FOR SELECT USING (active = TRUE);
CREATE POLICY "catalogo: itens de kit"            ON bundle_items        FOR SELECT USING (TRUE);
CREATE POLICY "catalogo: planos de assinatura"    ON subscription_plans  FOR SELECT USING (active = TRUE);

-- Clientes podem criar pedidos e avaliacoes sem precisar de conta
CREATE POLICY "clientes: criar pedido"    ON orders  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "clientes: criar avaliacao" ON reviews FOR INSERT WITH CHECK (TRUE);

-- =============================================================================
-- DADOS DE EXEMPLO (SEED)
-- =============================================================================

INSERT INTO categories (name, slug, description, display_order) VALUES
  ('Roupas',       'roupas',       'Camisetas, shorts, leggings e muito mais para o seu treino', 1),
  ('Suplementos',  'suplementos',  'Whey protein, creatina, pre-treino e outros suplementos',    2),
  ('Acessorios',   'acessorios',   'Luvas, cintos, garrafinhas, faixas e acessorios para treino', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, compare_price, stock, sizes, featured)
SELECT id, 'Camiseta Space Fit Dry-Fit', 'camiseta-space-fit-dry-fit',
  'Camiseta tecnologica de alta performance com tecido dry-fit que afasta o suor do corpo, mantendo voce seco e confortavel durante todo o treino.',
  89.90, 119.90, 50, ARRAY['P','M','G','GG','XGG'], TRUE
FROM categories WHERE slug = 'roupas' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, compare_price, stock, sizes, featured)
SELECT id, 'Shorts Space Fit Pro', 'shorts-space-fit-pro',
  'Short masculino com bolsos laterais, cintura elastica e tecido leve. Perfeito para treinos intensos e corridas.',
  79.90, 99.90, 35, ARRAY['P','M','G','GG'], TRUE
FROM categories WHERE slug = 'roupas' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, compare_price, stock, sizes, featured)
SELECT id, 'Legging Space Fit Feminina', 'legging-space-fit-feminina',
  'Legging feminina com cos alto e tecido sculpt que molda o corpo. Tecido macio, elastico e resistente para qualquer tipo de treino.',
  129.90, 159.90, 40, ARRAY['P','M','G','GG'], TRUE
FROM categories WHERE slug = 'roupas' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, compare_price, stock, featured)
SELECT id, 'Whey Protein 900g', 'whey-protein-900g',
  'Whey Protein concentrado com 22g de proteina por dose. Disponivel nos sabores Chocolate, Baunilha e Morango. Ideal para recuperacao muscular pos-treino.',
  149.90, 189.90, 80, TRUE
FROM categories WHERE slug = 'suplementos' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, compare_price, stock)
SELECT id, 'Creatina Monohidratada 300g', 'creatina-monohidratada-300g',
  'Creatina pura monohidratada, sem sabor. Aumenta forca, potencia e performance nos treinos de alta intensidade. 3g por dose.',
  89.90, 109.90, 60
FROM categories WHERE slug = 'suplementos' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, stock)
SELECT id, 'Pre-Treino Space Energy 300g', 'pre-treino-space-energy-300g',
  'Pre-treino com cafeina, beta-alanina e citrulina. Explosao de energia e foco para treinos extremos. Sabor Laranja.',
  119.90, 45
FROM categories WHERE slug = 'suplementos' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
-- =====================================================
-- SPACE FIT - Schema Completo do Banco de Dados
-- Execute este SQL no painel do Supabase:
-- Dashboard → SQL Editor → New query → Cole e Execute
-- =====================================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELAS PRINCIPAIS
-- =====================================================

-- Categorias de produtos
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  compare_price NUMERIC(10,2),
  stock INT DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  sizes TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Avaliações de produtos
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Banners da página inicial
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link TEXT,
  active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cupons de desconto
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value NUMERIC(10,2) NOT NULL,
  min_order NUMERIC(10,2) DEFAULT 0,
  max_uses INT,
  uses_count INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  address JSONB,
  items JSONB NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  shipping NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'pickup')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected', 'refunded')),
  order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled')),
  coupon_code TEXT,
  mp_payment_id TEXT,
  mp_preference_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FUNCIONALIDADES OPCIONAIS
-- =====================================================

-- Programa de Fidelidade
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_phone TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  points INT DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_phone TEXT NOT NULL,
  order_id UUID REFERENCES orders(id),
  points_earned INT DEFAULT 0,
  points_redeemed INT DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kits / Combos
CREATE TABLE IF NOT EXISTS bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bundle_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_id UUID REFERENCES bundles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1
);

-- Planos de Assinatura
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  product_id UUID REFERENCES products(id),
  price NUMERIC(10,2) NOT NULL,
  interval TEXT DEFAULT 'monthly' CHECK (interval IN ('monthly', 'quarterly', 'yearly')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES subscription_plans(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  next_billing_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Gerar número de pedido automático (ex: SF-2024-001234)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'SF-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('order_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS order_seq START 1;

CREATE OR REPLACE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) — Proteção de Dados
-- =====================================================

ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;

-- Leitura pública (catálogo da loja)
CREATE POLICY "Leitura publica de categorias ativas"
  ON categories FOR SELECT USING (active = TRUE);

CREATE POLICY "Leitura publica de produtos ativos"
  ON products FOR SELECT USING (active = TRUE);

CREATE POLICY "Leitura publica de banners ativos"
  ON banners FOR SELECT USING (active = TRUE);

CREATE POLICY "Leitura publica de reviews aprovados"
  ON reviews FOR SELECT USING (approved = TRUE);

CREATE POLICY "Leitura publica de bundles ativos"
  ON bundles FOR SELECT USING (active = TRUE);

CREATE POLICY "Leitura publica de bundle items"
  ON bundle_items FOR SELECT USING (TRUE);

CREATE POLICY "Leitura publica de planos ativos"
  ON subscription_plans FOR SELECT USING (active = TRUE);

-- Inserção pública (clientes podem criar pedidos e avaliações)
CREATE POLICY "Clientes podem criar pedidos"
  ON orders FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Clientes podem criar reviews"
  ON reviews FOR INSERT WITH CHECK (TRUE);

-- Service Role tem acesso total (usado pelo backend/admin)
-- (service_role bypassa RLS por padrão no Supabase)

-- =====================================================
-- DADOS DE EXEMPLO (SEED)
-- =====================================================

INSERT INTO categories (name, slug, description, display_order) VALUES
  ('Roupas', 'roupas', 'Camisetas, shorts, leggings e muito mais para o seu treino', 1),
  ('Suplementos', 'suplementos', 'Whey protein, creatina, pré-treino e outros suplementos', 2),
  ('Acessórios', 'acessorios', 'Luvas, cintos, garrafinhas, faixas e acessórios para treino', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, compare_price, stock, sizes, featured)
SELECT id, 'Camiseta Space Fit Dry-Fit', 'camiseta-space-fit-dry-fit',
  'Camiseta tecnológica de alta performance com tecido dry-fit que afasta o suor do corpo, mantendo você seco e confortável durante todo o treino.',
  89.90, 119.90, 50, ARRAY['P','M','G','GG','XGG'], TRUE
FROM categories WHERE slug = 'roupas' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, compare_price, stock, sizes, featured)
SELECT id, 'Shorts Space Fit Pro', 'shorts-space-fit-pro',
  'Short masculino com bolsos laterais, cintura elástica e tecido leve. Perfeito para treinos intensos e corridas.',
  79.90, 99.90, 35, ARRAY['P','M','G','GG'], TRUE
FROM categories WHERE slug = 'roupas' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, compare_price, stock, sizes, featured)
SELECT id, 'Legging Space Fit Feminina', 'legging-space-fit-feminina',
  'Legging feminina com cós alto e tecido sculpt que molda o corpo. Tecido macio, elástico e resistente para qualquer tipo de treino.',
  129.90, 159.90, 40, ARRAY['P','M','G','GG'], TRUE
FROM categories WHERE slug = 'roupas' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, compare_price, stock, featured)
SELECT id, 'Whey Protein 900g', 'whey-protein-900g',
  'Whey Protein concentrado com 22g de proteína por dose. Disponível nos sabores Chocolate, Baunilha e Morango. Ideal para recuperação muscular pós-treino.',
  149.90, 189.90, 80, TRUE
FROM categories WHERE slug = 'suplementos' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, compare_price, stock)
SELECT id, 'Creatina Monohidratada 300g', 'creatina-monohidratada-300g',
  'Creatina pura monohidratada, sem sabor. Aumenta força, potência e performance nos treinos de alta intensidade. 3g por dose.',
  89.90, 109.90, 60
FROM categories WHERE slug = 'suplementos' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, stock)
SELECT id, 'Pré-Treino Space Energy 300g', 'pre-treino-space-energy-300g',
  'Pré-treino com cafeína, beta-alanina e citrulina. Explosão de energia e foco para treinos extremos. Sabor Laranja.',
  99.90, 45
FROM categories WHERE slug = 'suplementos' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, compare_price, stock)
SELECT id, 'Luvas de Musculação Pro', 'luvas-de-musculacao-pro',
  'Luvas de musculação com proteção de couro sintético, ventilação e suporte de pulso integrado. P, M e G.',
  59.90, 79.90, 30
FROM categories WHERE slug = 'acessorios' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, stock)
SELECT id, 'Garrafa Térmica 1 Litro', 'garrafa-termica-1-litro',
  'Garrafa térmica de aço inox, mantém bebidas geladas até 24h e quentes até 12h. Compartimento extra para suplemento. Cores: preta e verde.',
  79.90, 25
FROM categories WHERE slug = 'acessorios' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, compare_price, stock)
SELECT id, 'Cinto de Couro Para Musculação', 'cinto-de-couro-musculacao',
  'Cinto de couro legítimo para musculação, protege a lombar em exercícios pesados. Fivela de metal duplo. Tamanhos P ao GG.',
  119.90, 149.90, 20
FROM categories WHERE slug = 'acessorios' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO banners (title, subtitle, image_url, active, display_order) VALUES
  ('Treino de Elite', 'Equipamentos e roupas para seus melhores resultados', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80', TRUE, 1),
  ('Suplementos Top', 'Whey, creatina e muito mais com os melhores preços', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=80', TRUE, 2),
  ('Nova Coleção', 'Roupas fitness modernas para arrasar no treino', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1600&q=80', TRUE, 3)
ON CONFLICT DO NOTHING;

INSERT INTO coupons (code, type, value, min_order, max_uses) VALUES
  ('SPACEFIT10', 'percent', 10, 50, 100),
  ('BEMVINDO20', 'fixed', 20, 80, 50)
ON CONFLICT (code) DO NOTHING;

INSERT INTO reviews (product_id, customer_name, rating, comment, approved)
SELECT p.id, 'Carlos Silva', 5, 'Produto incrível! Chegou rápido e a qualidade é excelente. Super recomendo!', TRUE
FROM products p WHERE p.slug = 'whey-protein-900g' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO reviews (product_id, customer_name, rating, comment, approved)
SELECT p.id, 'Ana Beatriz', 5, 'Adorei a legging! Tecido muito confortável e o caimento é perfeito.', TRUE
FROM products p WHERE p.slug = 'legging-space-fit-feminina' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO reviews (product_id, customer_name, rating, comment, approved)
SELECT p.id, 'Ricardo Souza', 4, 'Ótimas luvas, protegem bem as mãos. O suporte de pulso é resistente.', TRUE
FROM products p WHERE p.slug = 'luvas-de-musculacao-pro' LIMIT 1
ON CONFLICT DO NOTHING;
