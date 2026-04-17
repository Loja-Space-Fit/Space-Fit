-- Adiciona coluna is_admin na tabela profiles caso nao exista.
-- A migration 003_user_auth.sql ja declarava essa coluna, mas pode nao ter
-- sido aplicada em ambientes existentes criados antes dela.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Para liberar acesso ao painel admin para um usuario, execute no SQL Editor:
--
--   UPDATE profiles
--   SET is_admin = true
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'seu-email@aqui.com');
