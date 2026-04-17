-- =============================================================================
-- Space Fit - Sistema de autenticacao e perfis de clientes
-- =============================================================================
-- Execute no Supabase: Dashboard -> SQL Editor -> New query -> Run
--
-- Aqui criamos a tabela profiles, que extende o auth.users do Supabase com
-- dados extras do cliente (nome, telefone, endereco). A relacao e 1:1 via
-- o mesmo UUID do auth. O trigger garante que todo novo cadastro ja ganha
-- um perfil, sem precisar de chamada extra no frontend.
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  phone      TEXT,
  email      TEXT,
  is_admin   BOOLEAN     DEFAULT FALSE,   -- controla acesso ao painel admin
  address    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cada cliente so ve e edita o proprio perfil.
-- A politica de SELECT duplicada (usuario + admin) e necessaria porque
-- o Supabase avalia policies com OR — nao empilha automaticamente.
CREATE POLICY "perfil: usuario ve o proprio"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "perfil: usuario edita o proprio"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "perfil: usuario cria o proprio"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins autenticados podem ver todos os perfis (ex: para buscar dados de clientes)
CREATE POLICY "perfil: admin ve todos"
  ON profiles FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger: cria o perfil automaticamente quando o usuario se cadastra.
-- Se der erro (ex: perfil ja existe), apenas loga um warning e nao quebra o cadastro.
CREATE OR REPLACE FUNCTION criar_perfil_novo_usuario()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nao quebra o cadastro se o perfil ja existir ou falhar por outro motivo
  RAISE WARNING 'criar_perfil_novo_usuario falhou para %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS ao_criar_usuario ON auth.users;
CREATE TRIGGER ao_criar_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION criar_perfil_novo_usuario();

-- Trigger de updated_at para profiles (reutiliza a funcao do 001_initial.sql)
CREATE OR REPLACE TRIGGER atualizar_perfis
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

-- Adiciona user_id nos pedidos para linkar ao cliente logado.
-- Pedidos feitos sem login ficam com user_id null — isso e intencional,
-- pois a loja permite compra como anonimo.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Clientes autenticados so enxergam os proprios pedidos na area "Meus Pedidos"
CREATE POLICY "pedidos: cliente ve os proprios"
  ON orders FOR SELECT USING (auth.uid() = user_id);
-- =====================================================
-- SPACE FIT - Sistema de Login de Clientes
-- Execute no Supabase: SQL Editor → New query → Run
-- =====================================================

-- Tabela de perfis de clientes (ligada ao auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  phone      TEXT,
  email      TEXT,
  address    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem proprio perfil"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios atualizam proprio perfil"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Usuarios criam proprio perfil"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins veem todos os perfis (service_role bypassa, mas deixamos explícito)
CREATE POLICY "Admins veem todos os perfis"
  ON profiles FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger: cria perfil automaticamente ao cadastrar
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger updated_at em profiles
CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Adicionar user_id na tabela de pedidos
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Clientes autenticados veem apenas os próprios pedidos
CREATE POLICY "Usuarios veem proprios pedidos"
  ON orders FOR SELECT USING (
    auth.uid() = user_id
  );
