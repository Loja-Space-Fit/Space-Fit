-- Add banner customization fields
ALTER TABLE banners ADD COLUMN IF NOT EXISTS highlighted_words INTEGER[] DEFAULT '{}';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS highlight_color TEXT DEFAULT '#b2ea0f';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS button_text TEXT DEFAULT 'Comprar Agora';
