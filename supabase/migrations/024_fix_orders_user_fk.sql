-- Corrige FK de orders.user_id para permitir exclusão de usuários do auth.
-- Sem ON DELETE SET NULL, o Supabase bloqueia a exclusão com "Database error deleting user".
-- Ao usar SET NULL, o pedido é preservado no histórico mas desvinculado do usuário deletado.

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
