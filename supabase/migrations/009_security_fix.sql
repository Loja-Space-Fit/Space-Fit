-- =============================================================================
-- Space Fit - 009: Correção de segurança nas policies de RLS
-- =============================================================================
-- EXECUTE NO SUPABASE: Dashboard → SQL Editor → New query → Run
--
-- PROBLEMA CRÍTICO ENCONTRADO:
--   As policies em 002_admin_policies.sql usam:
--     USING (auth.role() = 'authenticated')
--   Em Supabase, auth.role() = 'authenticated' significa QUALQUER usuário
--   logado — inclusive clientes comuns. Isso permite que um cliente:
--     ✗ Edite ou delete produtos
--     ✗ Veja pedidos de todos os outros clientes
--     ✗ Leia telefone, endereço e flag is_admin de qualquer usuário
--     ✗ Crie, edite ou apague cupons
--     ✗ Faça upload ou delete imagens de produtos no Storage
--
-- SOLUÇÃO:
--   1. Criar função auxiliar is_admin() que lê is_admin na tabela profiles
--   2. Remover todas as policies inseguras
--   3. Recriar policies usando is_admin() como guard real
--   4. Corrigir policies de Storage
--   5. Adicionar índices para performance do RLS
-- =============================================================================


-- =============================================================================
-- PASSO 1: Função auxiliar is_admin()
-- =============================================================================
-- SECURITY DEFINER: a função executa com os privilégios do dono (postgres),
-- não do caller — necessário para ler profiles sem acionar o próprio RLS
-- e evitar recursão infinita.
-- SET search_path = public: impede SQL injection via manipulação de search_path.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND is_admin = TRUE
  );
$$;

-- Revoga acesso público e libera apenas para roles relevantes
REVOKE ALL    ON FUNCTION is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO service_role;


-- =============================================================================
-- PASSO 2: Remover policies INSEGURAS (auth.role() = 'authenticated')
-- =============================================================================

-- Bloco 1 de 002_admin_policies.sql
DROP POLICY IF EXISTS "admin: gerenciar categorias"               ON categories;
DROP POLICY IF EXISTS "admin: gerenciar produtos"                 ON products;
DROP POLICY IF EXISTS "admin: gerenciar banners"                  ON banners;
DROP POLICY IF EXISTS "admin: gerenciar cupons"                   ON coupons;
DROP POLICY IF EXISTS "admin: gerenciar pedidos"                  ON orders;
DROP POLICY IF EXISTS "admin: gerenciar avaliacoes"               ON reviews;
DROP POLICY IF EXISTS "admin: gerenciar contas de fidelidade"     ON loyalty_accounts;
DROP POLICY IF EXISTS "admin: gerenciar transacoes de fidelidade" ON loyalty_transactions;
DROP POLICY IF EXISTS "admin: gerenciar kits"                     ON bundles;
DROP POLICY IF EXISTS "admin: gerenciar itens de kit"             ON bundle_items;
DROP POLICY IF EXISTS "admin: gerenciar planos de assinatura"     ON subscription_plans;
DROP POLICY IF EXISTS "admin: gerenciar assinaturas de clientes"  ON subscriptions;

-- Bloco 2 de 002_admin_policies.sql (policies duplicadas com nome diferente)
DROP POLICY IF EXISTS "Admins podem gerenciar categorias" ON categories;
DROP POLICY IF EXISTS "Admins podem gerenciar produtos"   ON products;
DROP POLICY IF EXISTS "Admins podem gerenciar banners"    ON banners;
DROP POLICY IF EXISTS "Admins podem gerenciar cupons"     ON coupons;
DROP POLICY IF EXISTS "Admins podem gerenciar pedidos"    ON orders;
DROP POLICY IF EXISTS "Admins podem gerenciar reviews"    ON reviews;

-- De 003_user_auth.sql (bloco 1)
DROP POLICY IF EXISTS "perfil: admin ve todos"      ON profiles;

-- De 003_user_auth.sql (bloco 2 - duplicata)
DROP POLICY IF EXISTS "Admins veem todos os perfis" ON profiles;

-- Storage: policies inseguras que só exigem 'authenticated'
DROP POLICY IF EXISTS "imagens: upload restrito a admins"   ON storage.objects;
DROP POLICY IF EXISTS "imagens: edicao restrita a admins"   ON storage.objects;
DROP POLICY IF EXISTS "imagens: exclusao restrita a admins" ON storage.objects;
DROP POLICY IF EXISTS "Admins fazem upload de imagens"      ON storage.objects;
DROP POLICY IF EXISTS "Admins deletam imagens"              ON storage.objects;

-- Também dropa as novas policies (idempotência — permite rodar o script múltiplas vezes)
DROP POLICY IF EXISTS "admin: gerenciar categorias"               ON categories;
DROP POLICY IF EXISTS "admin: gerenciar produtos"                 ON products;
DROP POLICY IF EXISTS "admin: gerenciar banners"                  ON banners;
DROP POLICY IF EXISTS "cupons: leitura publica"                   ON coupons;
DROP POLICY IF EXISTS "admin: gerenciar cupons"                   ON coupons;
DROP POLICY IF EXISTS "admin: gerenciar pedidos"                  ON orders;
DROP POLICY IF EXISTS "admin: gerenciar avaliacoes"               ON reviews;
DROP POLICY IF EXISTS "admin: gerenciar contas de fidelidade"     ON loyalty_accounts;
DROP POLICY IF EXISTS "admin: gerenciar transacoes de fidelidade" ON loyalty_transactions;
DROP POLICY IF EXISTS "admin: gerenciar kits"                     ON bundles;
DROP POLICY IF EXISTS "admin: gerenciar itens de kit"             ON bundle_items;
DROP POLICY IF EXISTS "admin: gerenciar planos de assinatura"     ON subscription_plans;
DROP POLICY IF EXISTS "admin: gerenciar assinaturas"              ON subscriptions;
DROP POLICY IF EXISTS "admin: gerenciar assinaturas de clientes"  ON subscriptions;
DROP POLICY IF EXISTS "perfil: usuario ve o proprio"              ON profiles;
DROP POLICY IF EXISTS "perfil: usuario edita o proprio"           ON profiles;
DROP POLICY IF EXISTS "perfil: admin ve todos"                    ON profiles;
DROP POLICY IF EXISTS "admin: ver todos os perfis"                ON profiles;
DROP POLICY IF EXISTS "admin: editar perfis"                      ON profiles;
DROP POLICY IF EXISTS "storage: leitura publica"                  ON storage.objects;
DROP POLICY IF EXISTS "storage: upload admin"                     ON storage.objects;
DROP POLICY IF EXISTS "storage: edicao admin"                     ON storage.objects;
DROP POLICY IF EXISTS "storage: exclusao admin"                   ON storage.objects;
DROP POLICY IF EXISTS "storage: admin insere imagens"             ON storage.objects;
DROP POLICY IF EXISTS "storage: admin atualiza imagens"           ON storage.objects;
DROP POLICY IF EXISTS "storage: admin deleta imagens"             ON storage.objects;


-- =============================================================================
-- PASSO 3: Recriar policies usando is_admin() como guard real
-- =============================================================================

-- ---------------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------------
-- Leitura pública já existe ("catalogo: categorias ativas")
-- Admin tem controle total (verificação real de is_admin)
CREATE POLICY "admin: gerenciar categorias"
  ON categories FOR ALL
  USING     (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------------
-- Leitura pública já existe ("catalogo: produtos ativos")
-- Admin pode ver todos (incluindo inativos) e fazer escrita
CREATE POLICY "admin: gerenciar produtos"
  ON products FOR ALL
  USING     (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- BANNERS
-- ---------------------------------------------------------------------------
CREATE POLICY "admin: gerenciar banners"
  ON banners FOR ALL
  USING     (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- COUPONS
-- ---------------------------------------------------------------------------
-- Clientes precisam validar códigos no checkout (SELECT de cupons ativos)
-- Admin tem controle total
CREATE POLICY "cupons: leitura publica"
  ON coupons FOR SELECT
  USING (active = TRUE);

CREATE POLICY "admin: gerenciar cupons"
  ON coupons FOR ALL
  USING     (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------------------------
-- "clientes: criar pedido"        → INSERT WITH CHECK (TRUE) — mantido (guest checkout)
-- "pedidos: cliente ve os proprios" → SELECT USING (auth.uid() = user_id) — mantido
-- Admin vê e gerencia todos os pedidos
CREATE POLICY "admin: gerenciar pedidos"
  ON orders FOR ALL
  USING     (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- REVIEWS
-- ---------------------------------------------------------------------------
-- "catalogo: reviews aprovados" → SELECT USING (approved = TRUE) — mantido
-- "clientes: criar avaliacao"   → INSERT WITH CHECK (TRUE) — mantido
-- Admin aprova, edita ou remove reviews
CREATE POLICY "admin: gerenciar avaliacoes"
  ON reviews FOR ALL
  USING     (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- LOYALTY ACCOUNTS e TRANSACTIONS
-- ---------------------------------------------------------------------------
-- Não têm user_id, então apenas admin acessa via cliente Supabase.
-- Leitura/escrita de clientes vai sempre pelo service_role (backend).
CREATE POLICY "admin: gerenciar contas de fidelidade"
  ON loyalty_accounts FOR ALL
  USING     (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admin: gerenciar transacoes de fidelidade"
  ON loyalty_transactions FOR ALL
  USING     (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- BUNDLES / KITS
-- ---------------------------------------------------------------------------
-- "catalogo: kits ativos" → SELECT USING (active = TRUE) — mantido

-- Corrige o bundle_items: só expõe itens de kits ativos
DROP POLICY IF EXISTS "catalogo: itens de kit" ON bundle_items;
CREATE POLICY "catalogo: itens de kit"
  ON bundle_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bundles
      WHERE bundles.id = bundle_items.bundle_id
        AND bundles.active = TRUE
    )
  );

CREATE POLICY "admin: gerenciar kits"
  ON bundles FOR ALL
  USING     (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admin: gerenciar itens de kit"
  ON bundle_items FOR ALL
  USING     (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- SUBSCRIPTION PLANS e SUBSCRIPTIONS
-- ---------------------------------------------------------------------------
-- "catalogo: planos de assinatura" → SELECT USING (active = TRUE) — mantido
CREATE POLICY "admin: gerenciar planos de assinatura"
  ON subscription_plans FOR ALL
  USING     (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admin: gerenciar assinaturas de clientes"
  ON subscriptions FOR ALL
  USING     (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
-- "perfil: usuario ve o proprio"   → SELECT USING (auth.uid() = id) — mantido
-- "perfil: usuario edita o proprio" → UPDATE USING (auth.uid() = id) — mantido
-- "perfil: usuario cria o proprio"  → INSERT WITH CHECK (auth.uid() = id) — mantido
-- Admin vê todos os perfis (painel de clientes)
CREATE POLICY "admin: ver todos os perfis"
  ON profiles FOR SELECT
  USING (is_admin());

-- Admin pode editar perfis de clientes (ex: corrigir dados, banir usuário)
CREATE POLICY "admin: editar perfis"
  ON profiles FOR UPDATE
  USING (is_admin());


-- =============================================================================
-- PASSO 4: Corrigir policies de Storage (product-images)
-- =============================================================================
-- Leitura pública ("imagens: leitura publica") já está correta — mantida.
-- Escrita restrita a admins reais.

CREATE POLICY "storage: admin insere imagens"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND is_admin()
  );

CREATE POLICY "storage: admin atualiza imagens"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND is_admin()
  );

CREATE POLICY "storage: admin deleta imagens"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND is_admin()
  );


-- =============================================================================
-- PASSO 5: Índices para performance do RLS
-- =============================================================================

-- Índice parcial para lookup de admins (usado em toda chamada is_admin())
-- A PK já indexa id, mas o índice parcial é mais eficiente quando há poucos admins
CREATE INDEX IF NOT EXISTS idx_profiles_admin
  ON profiles(id) WHERE is_admin = TRUE;

-- Índice em orders.user_id — RLS "pedidos: cliente ve os proprios" faz lookup aqui
CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON orders(user_id) WHERE user_id IS NOT NULL;

-- Índice em profiles.email — painel admin busca clientes por email
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON profiles(email);

-- Índice em loyalty_accounts.customer_phone — busca por telefone é frequente
CREATE INDEX IF NOT EXISTS idx_loyalty_phone
  ON loyalty_accounts(customer_phone);


-- =============================================================================
-- RESUMO DAS POLICIES ATIVAS APÓS ESTA MIGRATION
-- =============================================================================
-- categories:          SELECT (ativas, público) | ALL (is_admin)
-- products:            SELECT (ativos, público) | ALL (is_admin)
-- banners:             SELECT (ativos, público) | ALL (is_admin)
-- coupons:             SELECT (ativos, público) | ALL (is_admin)
-- orders:              INSERT (público, guest checkout) | SELECT (próprios, auth) | ALL (is_admin)
-- reviews:             SELECT (aprovadas, público) | INSERT (público) | ALL (is_admin)
-- loyalty_accounts:    ALL (is_admin)
-- loyalty_transactions:ALL (is_admin)
-- bundles:             SELECT (ativos, público) | ALL (is_admin)
-- bundle_items:        SELECT (de kits ativos, público) | ALL (is_admin)
-- subscription_plans:  SELECT (ativos, público) | ALL (is_admin)
-- subscriptions:       ALL (is_admin)
-- profiles:            SELECT/UPDATE (próprio, auth) | INSERT (próprio, auth) | SELECT/UPDATE (is_admin)
-- storage (product-images): SELECT (público) | INSERT/UPDATE/DELETE (is_admin)
-- =============================================================================
