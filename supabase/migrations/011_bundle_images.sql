-- Adiciona coluna images (array de URLs) na tabela de bundles/kits
ALTER TABLE bundles
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
