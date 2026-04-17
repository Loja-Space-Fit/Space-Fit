-- Marca categorias que exibem kits/combos em vez de produtos individuais.
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS is_bundle_category BOOLEAN DEFAULT FALSE;
