-- Adiciona coluna de ícone nas categorias
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT;
