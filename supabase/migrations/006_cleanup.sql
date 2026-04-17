-- =============================================================================
-- Space Fit - Rotina de limpeza e otimizacao do banco
-- =============================================================================
-- Execute no Supabase: Dashboard -> SQL Editor -> New query -> Run
--
-- Este arquivo faz duas coisas:
--   1. Cria indices para acelerar as queries mais frequentes do painel admin
--   2. Cria a funcao run_cleanup() chamada pelo botao "Limpeza" no dashboard
--
-- A funcao e restrita ao service_role por seguranca — ela deleta dados reais
-- e nao deve ser acessivel por usuarios comuns ou anonimos.
-- =============================================================================

-- =============================================================================
-- INDICES DE PERFORMANCE
-- =============================================================================

-- Busca de pedidos pendentes antigos (usada na limpeza e no dashboard)
CREATE INDEX IF NOT EXISTS idx_pedidos_status_data
  ON orders(order_status, created_at);

-- Filtragem por status de pagamento (frequente no painel de pedidos)
CREATE INDEX IF NOT EXISTS idx_pedidos_pagamento
  ON orders(payment_status);

-- Busca de cupons expirados (usada na limpeza e na validacao de cupons)
CREATE INDEX IF NOT EXISTS idx_cupons_validade_ativo
  ON coupons(expires_at, active);

-- Busca de avaliacoes nao aprovadas (usada na limpeza e no painel de reviews)
CREATE INDEX IF NOT EXISTS idx_reviews_aprovado_data
  ON reviews(approved, created_at);

-- =============================================================================
-- FUNCAO: run_cleanup()
-- =============================================================================

CREATE OR REPLACE FUNCTION run_cleanup()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pedidos_excluidos    INT := 0;
  cupons_desativados   INT := 0;
  avaliacoes_excluidas INT := 0;
BEGIN

  -- 1. Remover pedidos abandonados
  --    Sao pedidos que ficaram como "pending" por mais de 30 dias sem
  --    nenhum pagamento — provavelmente o cliente desistiu no meio do caminho.
  --    Usamos CTE para capturar o COUNT sem uma segunda query.
  WITH excluidos AS (
    DELETE FROM orders
    WHERE order_status  = 'pending'
      AND payment_status = 'pending'
      AND created_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO pedidos_excluidos FROM excluidos;

  -- 2. Desativar cupons com validade vencida
  --    Nao deletamos para manter o historico — pedidos antigos podem
  --    referenciar o codigo do cupom e precisamos saber que ele existiu.
  UPDATE coupons
    SET active = false
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND active = true;

  GET DIAGNOSTICS cupons_desativados = ROW_COUNT;

  -- 3. Remover avaliacoes nao aprovadas com mais de 60 dias
  --    Se nao foram aprovadas em 60 dias, provavelmente sao spam ou
  --    ficaram esquecidas na fila de moderacao.
  WITH excluidas AS (
    DELETE FROM reviews
    WHERE approved   = false
      AND created_at < NOW() - INTERVAL '60 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO avaliacoes_excluidas FROM excluidas;

  -- Retorna um resumo do que foi feito para exibir no painel
  RETURN jsonb_build_object(
    'deleted_orders',      pedidos_excluidos,
    'deactivated_coupons', cupons_desativados,
    'deleted_reviews',     avaliacoes_excluidas,
    'executed_at',         NOW()
  );

END;
$$;

-- Garante que apenas o service_role (backend) pode executar esta funcao.
-- Usuarios anonimos e autenticados nao tem permissao — a API do Next.js
-- valida o is_admin antes de chamar, mas esta camada e o backstop final.
REVOKE ALL    ON FUNCTION run_cleanup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION run_cleanup() TO service_role;
