-- =============================================================================
-- Space Fit - Politicas de acesso para administradores autenticados
-- =============================================================================
-- Execute no Supabase: Dashboard -> SQL Editor -> New query -> Run
--
-- Contexto: o painel admin roda com o usuario autenticado do Supabase Auth.
-- Aqui garantimos que qualquer usuario autenticado pode gerenciar os dados
-- via painel. Em producao, considere restringir por role especifica de admin
-- em vez de apenas "authenticated", usando a coluna is_admin do profile.
-- =============================================================================

-- Categorias: admin pode criar, editar e remover
CREATE POLICY "admin: gerenciar categorias"
  ON categories FOR ALL
  USING     (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Produtos: admin tem controle total do catalogo
CREATE POLICY "admin: gerenciar produtos"
  ON products FOR ALL
  USING     (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Banners: admin controla o que aparece na home
CREATE POLICY "admin: gerenciar banners"
  ON banners FOR ALL
  USING     (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Cupons: admin cria e desativa cupons de desconto
CREATE POLICY "admin: gerenciar cupons"
  ON coupons FOR ALL
  USING     (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Pedidos: admin ve e atualiza todos os pedidos do sistema
CREATE POLICY "admin: gerenciar pedidos"
  ON orders FOR ALL
  USING     (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Avaliacoes: admin aprova ou remove reviews antes de publicar
CREATE POLICY "admin: gerenciar avaliacoes"
  ON reviews FOR ALL
  USING     (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Fidelidade: admin ve e ajusta pontos de clientes manualmente se necessario
CREATE POLICY "admin: gerenciar contas de fidelidade"
  ON loyalty_accounts FOR ALL
  USING     (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin: gerenciar transacoes de fidelidade"
  ON loyalty_transactions FOR ALL
  USING     (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Kits: admin monta e edita combos de produtos
CREATE POLICY "admin: gerenciar kits"
  ON bundles FOR ALL
  USING     (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin: gerenciar itens de kit"
  ON bundle_items FOR ALL
  USING     (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Assinaturas: admin gerencia planos e assinantes
CREATE POLICY "admin: gerenciar planos de assinatura"
  ON subscription_plans FOR ALL
  USING     (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin: gerenciar assinaturas de clientes"
  ON subscriptions FOR ALL
  USING     (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
-- =====================================================
-- SPACE FIT - Políticas de acesso para admins autenticados
-- Execute no Supabase: SQL Editor → New query → Run
-- =====================================================

-- Categorias
CREATE POLICY "Admins podem gerenciar categorias"
  ON categories FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Produtos
CREATE POLICY "Admins podem gerenciar produtos"
  ON products FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Banners
CREATE POLICY "Admins podem gerenciar banners"
  ON banners FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Cupons
CREATE POLICY "Admins podem gerenciar cupons"
  ON coupons FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Pedidos
CREATE POLICY "Admins podem gerenciar pedidos"
  ON orders FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Reviews
CREATE POLICY "Admins podem gerenciar reviews"
  ON reviews FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Fidelidade
CREATE POLICY "Admins podem gerenciar loyalty_accounts"
  ON loyalty_accounts FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins podem gerenciar loyalty_transactions"
  ON loyalty_transactions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Kits
CREATE POLICY "Admins podem gerenciar bundles"
  ON bundles FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins podem gerenciar bundle_items"
  ON bundle_items FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Assinaturas
CREATE POLICY "Admins podem gerenciar subscription_plans"
  ON subscription_plans FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins podem gerenciar subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
