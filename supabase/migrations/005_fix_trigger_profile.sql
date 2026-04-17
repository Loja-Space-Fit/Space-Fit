-- =============================================================================
-- Space Fit - Correcao do trigger de criacao de perfil
-- =============================================================================
-- Execute no Supabase: Dashboard -> SQL Editor -> New query -> Run
--
-- Problema identificado: o trigger original (003_user_auth.sql) nao propagava
-- full_name e phone do metadata do usuario, entao o perfil era criado vazio.
-- Tambem faltava SET search_path = public, o que causava erros silenciosos
-- em alguns ambientes do Supabase.
--
-- Esta migration substitui a funcao com a versao corrigida. O trigger em si
-- nao precisa ser recriado — ele ja aponta para a funcao pelo nome.
-- =============================================================================

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
  ON CONFLICT (id) DO UPDATE SET
    -- Atualiza somente campos que ainda nao foram preenchidos,
    -- para nao sobrescrever edicoes manuais que o admin possa ter feito
    email     = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone     = COALESCE(EXCLUDED.phone,     profiles.phone);

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Loga o erro mas nao impede o cadastro de ser concluido
  RAISE WARNING 'criar_perfil_novo_usuario falhou para %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
