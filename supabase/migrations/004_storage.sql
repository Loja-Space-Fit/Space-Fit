-- =============================================================================
-- Space Fit - Bucket de armazenamento para imagens de produtos
-- =============================================================================
-- Execute no Supabase: Dashboard -> SQL Editor -> New query -> Run
--
-- Usamos um bucket publico para que as URLs das imagens funcionem direto
-- no <img> sem precisar de URLs assinadas. O limite de 5MB por arquivo
-- e suficiente para imagens de produto otimizadas.
-- MIME types aceitos: apenas imagens — sem PDFs, videos ou executaveis.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5 MB por arquivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Qualquer visitante pode visualizar as imagens dos produtos (loja publica)
CREATE POLICY "imagens: leitura publica"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Apenas admins autenticados podem fazer upload de novas imagens
CREATE POLICY "imagens: upload restrito a admins"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- Apenas admins autenticados podem atualizar imagens existentes
CREATE POLICY "imagens: edicao restrita a admins"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images');

-- Apenas admins autenticados podem deletar imagens
-- (importante: o frontend deve deletar do storage antes de deletar o produto)
CREATE POLICY "imagens: exclusao restrita a admins"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');
-- =====================================================
-- SPACE FIT - Bucket de imagens de produtos
-- Execute no Supabase: SQL Editor → New query → Run
-- =====================================================

-- Criar bucket público para imagens de produtos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Qualquer pessoa pode ver as imagens (loja pública)
CREATE POLICY "Imagens de produtos públicas"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Só usuários autenticados (admins) podem fazer upload
CREATE POLICY "Admins fazem upload de imagens"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- Só usuários autenticados podem deletar
CREATE POLICY "Admins deletam imagens"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');
