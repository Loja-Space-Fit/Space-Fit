-- Adiciona coluna de estoque à tabela bundles para controle de disponibilidade
ALTER TABLE bundles
  ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 999;
