-- Space Points loyalty system

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL UNIQUE,
  customer_name  TEXT,
  customer_email TEXT,
  points         INTEGER NOT NULL DEFAULT 0,
  total_spent    NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  points      INTEGER NOT NULL,        -- positive = earn, negative = redeem
  type        TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'adjust')),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE loyalty_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Admins only (uses service role in API routes — no anon/user access needed for now)
CREATE POLICY "admin_all_loyalty_accounts"    ON loyalty_accounts    FOR ALL USING (auth.jwt() ->> 'is_admin' = 'true');
CREATE POLICY "admin_all_loyalty_transactions" ON loyalty_transactions FOR ALL USING (auth.jwt() ->> 'is_admin' = 'true');

-- Allow authenticated users to read their own account by phone
CREATE POLICY "user_read_own_loyalty" ON loyalty_accounts
  FOR SELECT USING (
    customer_phone = (
      SELECT phone FROM profiles WHERE id = auth.uid()
    )
  );
