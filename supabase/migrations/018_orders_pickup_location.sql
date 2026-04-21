-- Adiciona campo de local de retirada ao pedido
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pickup_location TEXT; -- 'conceicao' | 'guaira' | NULL
