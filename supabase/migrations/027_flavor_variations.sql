-- Adiciona suporte a sabores e variações (sabor × tamanho) no sistema de produtos.
--
-- Lógica de estoques após esta migration:
--   - Produto simples (sem tamanho, sem sabor): usa coluna `stock`
--   - Produto com tamanho apenas:               usa `size_stock` JSONB  (comportamento existente)
--   - Produto com sabor apenas:                 usa `flavor_stock` JSONB
--   - Produto com tamanho E sabor:              usa tabela `product_variations`
--     (size_stock e flavor_stock ficam vazios; stock = soma das variações)

-- 1. Novas colunas na tabela products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS flavors      TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS flavor_stock JSONB   NOT NULL DEFAULT '{}';

COMMENT ON COLUMN products.flavors IS
  'Lista de sabores disponíveis. Ex: ["Chocolate", "Morango", "Baunilha"]';
COMMENT ON COLUMN products.flavor_stock IS
  'Estoque por sabor — usado APENAS quando o produto tem sabor e NÃO tem tamanho. '
  'Ex: {"Chocolate": 15, "Morango": 8}. Vazio quando o produto também possui tamanho '
  '(nesse caso o estoque fica em product_variations) ou quando não possui sabor.';

-- 2. Tabela de variações (combinação tamanho × sabor)
--    Usada SOMENTE quando o produto possui tamanho E sabor simultaneamente.
CREATE TABLE IF NOT EXISTS product_variations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size       TEXT        NOT NULL,
  flavor     TEXT        NOT NULL,
  stock      INT         NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_variation UNIQUE (product_id, size, flavor)
);

COMMENT ON TABLE product_variations IS
  'Estoque por variação (combinação tamanho + sabor) para produtos que possuem ambos. '
  'Cada linha representa uma combinação única e seu estoque independente.';

CREATE INDEX IF NOT EXISTS idx_product_variations_product_id
  ON product_variations (product_id);

-- 3. Função e trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_product_variations_updated_at
  BEFORE UPDATE ON product_variations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;

-- Leitura pública (necessário para a loja exibir estoque por variação)
CREATE POLICY "Leitura publica de product_variations"
  ON product_variations FOR SELECT
  USING (true);

-- Admin (usuário autenticado) pode gerenciar
CREATE POLICY "admin: gerenciar product_variations"
  ON product_variations FOR ALL
  USING     (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
