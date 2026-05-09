-- =============================================================================
-- Space Fit - 023: Corrigir acesso anônimo às policies RLS
-- =============================================================================
-- PROBLEMA:
--   Em 009_security_fix.sql, a função is_admin() só tem EXECUTE para a role
--   'authenticated'. Quando um usuário deslogado (role 'anon') consulta tabelas
--   como banners, categorias ou produtos, o PostgreSQL precisa avaliar a policy
--   "admin: gerenciar *" que chama is_admin() — e como anon não tem permissão
--   de execução, a query inteira falha e retorna vazio.
--
-- SOLUÇÃO:
--   Conceder EXECUTE em is_admin() para anon. É seguro porque:
--     • A função é SECURITY DEFINER (acessa profiles com privilégios de postgres)
--     • Para anon, auth.uid() retorna NULL → WHERE id = NULL → sempre retorna false
--     • Não há risco de escalonamento de privilégios
--
-- EXECUTE NO SUPABASE: Dashboard → SQL Editor → New query → Run
-- =============================================================================

GRANT EXECUTE ON FUNCTION is_admin() TO anon;
