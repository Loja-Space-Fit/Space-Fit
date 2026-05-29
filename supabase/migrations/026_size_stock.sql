-- Adiciona coluna size_stock para estoque independente por tamanho
-- Produtos sem tamanho continuam usando a coluna `stock` normalmente.
-- Produtos com tamanho usam este JSONB: {"P": 5, "M": 3, "G": 0, "GG": 2}
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS size_stock JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN products.size_stock IS
  'Estoque por tamanho. Ex: {"P": 5, "M": 3, "G": 0, "GG": 2}. '
  'Objeto vazio significa que o produto nao usa estoque por tamanho (usa coluna stock).';
