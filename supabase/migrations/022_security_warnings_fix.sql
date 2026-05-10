-- =============================================================================
-- Space Fit - 022: Correção dos avisos do Supabase Security Advisor
-- =============================================================================
-- Execute no Supabase: Dashboard → SQL Editor → New query → Run
--
-- Corrige os seguintes avisos:
--   ① Function Search Path Mutable                    (3 funções)
--   ② RLS Policy Always True                          (6 tabelas)
--   ③ Public Bucket Allows Listing                    (storage.product-images)
--   ④ Public/Signed-In Can Execute SECURITY DEFINER   (7 funções)
--
-- ⚠️  Leaked Password Protection: ativar MANUALMENTE em:
--     Supabase Dashboard → Authentication → Settings → Password Strength
-- =============================================================================


-- =============================================================================
-- ① Function Search Path Mutable
-- Sem SET search_path = public, um atacante poderia criar um schema com
-- funções homônimas (ex: now(), nextval()) para manipular o comportamento.
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.order_number := 'SF-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('order_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_franchise_content_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- ② RLS Policy Always True
-- As policies "service_write_*" usavam USING (true) WITH CHECK (true),
-- permitindo que qualquer usuário autenticado fizesse escrita.
-- Substituídas por is_admin() (função já criada em 009_security_fix.sql).
-- =============================================================================

DROP POLICY IF EXISTS "service_write_plans"    ON academy_plans;
DROP POLICY IF EXISTS "service_write_hours"    ON academy_hours;
DROP POLICY IF EXISTS "service_write_shipping" ON shipping_rates;
DROP POLICY IF EXISTS "service_write_settings" ON store_settings;
DROP POLICY IF EXISTS "admin_write_plans"      ON academy_plans;
DROP POLICY IF EXISTS "admin_write_hours"      ON academy_hours;
DROP POLICY IF EXISTS "admin_write_shipping"   ON shipping_rates;
DROP POLICY IF EXISTS "admin_write_settings"   ON store_settings;

CREATE POLICY "admin_write_plans"
  ON academy_plans FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_write_hours"
  ON academy_hours FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_write_shipping"
  ON shipping_rates FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_write_settings"
  ON store_settings FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- orders: mantém guest checkout mas adiciona validação mínima
-- Dropa todos os nomes possíveis criados nas migrations anteriores
DROP POLICY IF EXISTS "clientes: criar pedido"       ON orders;
DROP POLICY IF EXISTS "clientes criar pedido"        ON orders;
DROP POLICY IF EXISTS "Clientes podem criar pedidos" ON orders;
DROP POLICY IF EXISTS "clientes: criar pedido"       ON orders;
CREATE POLICY "clientes: criar pedido"
  ON orders FOR INSERT
  WITH CHECK (
    customer_name  IS NOT NULL AND
    customer_phone IS NOT NULL AND
    items          IS NOT NULL AND
    total          > 0
  );

-- reviews: mantém avaliação pública mas valida campos obrigatórios
DROP POLICY IF EXISTS "clientes: criar avaliacao"         ON reviews;
DROP POLICY IF EXISTS "clientes criar avaliacao"          ON reviews;
DROP POLICY IF EXISTS "Clientes podem criar avaliacoes"   ON reviews;
DROP POLICY IF EXISTS "Clientes podem criar reviews"      ON reviews;
CREATE POLICY "clientes: criar avaliacao"
  ON reviews FOR INSERT
  WITH CHECK (
    product_id IS NOT NULL AND
    rating BETWEEN 1 AND 5
  );


-- =============================================================================
-- ③ Public Bucket Allows Listing
-- Remove o SELECT público que permitia listar TODOS os arquivos do bucket
-- via storage API (enumeration). As imagens continuam acessíveis via URL
-- direta pois o bucket tem public = true — o que muda é apenas a listagem.
-- Só admins precisam listar arquivos (gerenciador de imagens no painel).
-- =============================================================================

DROP POLICY IF EXISTS "imagens: leitura publica"     ON storage.objects;
DROP POLICY IF EXISTS "Imagens de produtos públicas" ON storage.objects;
DROP POLICY IF EXISTS "storage: leitura publica"     ON storage.objects;
DROP POLICY IF EXISTS "storage: admin lista imagens" ON storage.objects;

CREATE POLICY "storage: admin lista imagens"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images' AND is_admin());


-- =============================================================================
-- ④ Public/Signed-In Can Execute SECURITY DEFINER Function
--
-- Regra: funções SECURITY DEFINER que são chamadas APENAS por triggers ou
-- via service_role não devem ser executáveis por usuários comuns.
--
-- is_admin(): remove SECURITY DEFINER (não é necessário — o usuário autenticado
-- já pode ler seu próprio perfil via RLS "perfil: usuario ve o proprio").
-- Sem SECURITY DEFINER, o warning "Signed-In Can Execute SECURITY DEFINER"
-- desaparece. O GRANT TO authenticated continua pois as policies RLS precisam
-- chamar is_admin() no contexto do usuário.
-- =============================================================================

-- is_admin(): mantém SECURITY DEFINER (necessário para evitar recursão infinita
-- no RLS — sem ele, a função tenta ler profiles, aciona RLS, que chama is_admin()
-- novamente → stack overflow). O aviso "Signed-In Can Execute SECURITY DEFINER"
-- para esta função é esperado e aceitável — é o padrão recomendado pelo Supabase.
-- Removemos apenas o acesso de PUBLIC/anon.

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

REVOKE ALL    ON FUNCTION is_admin() FROM PUBLIC;
REVOKE ALL    ON FUNCTION is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO service_role;

-- Funções de trigger: chamadas apenas pelo engine do PostgreSQL,
-- não precisam de execute para public nem authenticated.
REVOKE ALL ON FUNCTION criar_perfil_novo_usuario() FROM PUBLIC;
REVOKE ALL ON FUNCTION criar_perfil_novo_usuario() FROM anon;
REVOKE ALL ON FUNCTION criar_perfil_novo_usuario() FROM authenticated;
GRANT  EXECUTE ON FUNCTION criar_perfil_novo_usuario() TO service_role;

REVOKE ALL ON FUNCTION handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION handle_new_user() FROM authenticated;
GRANT  EXECUTE ON FUNCTION handle_new_user() TO service_role;

-- Funções admin RPC: chamadas via createServiceClient() (service_role),
-- não precisam de execute para usuários autenticados.
REVOKE ALL ON FUNCTION run_cleanup()           FROM PUBLIC;
REVOKE ALL ON FUNCTION run_cleanup()           FROM anon;
REVOKE ALL ON FUNCTION run_cleanup()           FROM authenticated;
GRANT  EXECUTE ON FUNCTION run_cleanup()       TO service_role;

REVOKE ALL ON FUNCTION top_produtos(INT)       FROM PUBLIC;
REVOKE ALL ON FUNCTION top_produtos(INT)       FROM anon;
REVOKE ALL ON FUNCTION top_produtos(INT)       FROM authenticated;
GRANT  EXECUTE ON FUNCTION top_produtos(INT)   TO service_role;

REVOKE ALL ON FUNCTION vendas_diarias(INT)     FROM PUBLIC;
REVOKE ALL ON FUNCTION vendas_diarias(INT)     FROM anon;
REVOKE ALL ON FUNCTION vendas_diarias(INT)     FROM authenticated;
GRANT  EXECUTE ON FUNCTION vendas_diarias(INT) TO service_role;
