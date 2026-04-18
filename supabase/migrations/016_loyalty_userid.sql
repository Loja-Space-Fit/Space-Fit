-- Vincula loyalty_accounts ao user_id (auth.users) em vez de depender do telefone.
-- Isso garante que os pontos sempre encontrem o usuário correto, independente
-- de como o telefone foi formatado no pedido.

-- 1. Adiciona coluna user_id
ALTER TABLE loyalty_accounts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Torna customer_phone opcional (mantém dados históricos)
ALTER TABLE loyalty_accounts
  ALTER COLUMN customer_phone DROP NOT NULL;

-- 3. Índice único em user_id (quando preenchido)
CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_accounts_user_id
  ON loyalty_accounts(user_id)
  WHERE user_id IS NOT NULL;

-- 4. Atualiza política de leitura: usuário lê sua própria conta por user_id
DROP POLICY IF EXISTS "user_read_own_loyalty" ON loyalty_accounts;
CREATE POLICY "user_read_own_loyalty" ON loyalty_accounts
  FOR SELECT USING (user_id = auth.uid());
