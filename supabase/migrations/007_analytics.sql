-- =============================================================================
-- Space Fit - Analytics e performance de queries do painel admin
-- =============================================================================
-- Execute no Supabase: Dashboard -> SQL Editor -> New query -> Run
--
-- Esta migration adiciona a RPC top_produtos() que agrega os JSONB de items
-- de todos os pedidos para calcular os produtos mais vendidos diretamente
-- no banco — muito mais eficiente do que trazer todos os pedidos para o JS
-- quando o volume de pedidos crescer.
--
-- Enquanto o volume for pequeno, o services/admin.ts calcula no servidor.
-- Quando a performance precisar melhorar, trocar por:
--   supabase.rpc('top_produtos', { limite: 5 })
-- =============================================================================

-- =============================================================================
-- RPC: top_produtos(limite INT)
-- =============================================================================
-- Percorre o array JSONB items de cada pedido (nao cancelados) e soma
-- a quantidade e receita por produto. Retorna ordenado por quantidade desc.
--
-- Estrutura esperada de cada item no JSONB:
--   { "product_id": "uuid", "product_name": "...", "quantity": 2, "total_price": 179.80 }

CREATE OR REPLACE FUNCTION top_produtos(limite INT DEFAULT 5)
RETURNS TABLE (
  produto_id        UUID,
  nome              TEXT,
  quantidade_vendida BIGINT,
  receita_gerada    NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (item->>'product_id')::UUID                    AS produto_id,
    MAX(item->>'product_name')                      AS nome,
    SUM((item->>'quantity')::INT)                   AS quantidade_vendida,
    SUM((item->>'total_price')::NUMERIC)            AS receita_gerada
  FROM orders,
       -- Expande o array JSONB items em linhas individuais
       jsonb_array_elements(items) AS item
  WHERE order_status NOT IN ('cancelled', 'pending')
    AND item->>'product_id' IS NOT NULL
  GROUP BY (item->>'product_id')::UUID
  ORDER BY quantidade_vendida DESC
  LIMIT limite;
$$;

-- Apenas o service_role pode chamar — a API valida is_admin antes, mas
-- essa camada protege contra chamadas diretas ao endpoint do Supabase.
REVOKE ALL    ON FUNCTION top_produtos(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION top_produtos(INT) TO service_role;

-- =============================================================================
-- RPC: vendas_diarias(dias INT)
-- =============================================================================
-- Retorna receita e numero de pedidos agrupados por dia.
-- Util para o grafico de linha do dashboard — evita trazer todos os pedidos
-- e agrupar no JS quando o volume crescer.

CREATE OR REPLACE FUNCTION vendas_diarias(dias INT DEFAULT 30)
RETURNS TABLE (
  dia     DATE,
  receita NUMERIC,
  pedidos BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    DATE(created_at)    AS dia,
    SUM(total)          AS receita,
    COUNT(*)            AS pedidos
  FROM orders
  WHERE created_at >= NOW() - (dias || ' days')::INTERVAL
    AND order_status IN ('paid', 'preparing', 'shipped', 'delivered')
  GROUP BY DATE(created_at)
  ORDER BY dia ASC;
$$;

REVOKE ALL    ON FUNCTION vendas_diarias(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vendas_diarias(INT) TO service_role;
