-- ==============================
-- 엽전 충전 주문·지급·감사 기록 (적용은 운영자가 SQL Editor에서 실행)
-- Preview가 Production DB를 공유할 수 있으므로 이 파일만으로 고객 잔액을 바꾸지 않는다.
-- ==============================

ALTER TABLE users ADD COLUMN IF NOT EXISTS yeobjeun_paid_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS yeobjeun_bonus_balance INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN users.yeobjeun_balance IS '표시용 총 잔액. 기존 잔액의 유상/보너스 구성은 추정하지 않는다.';
COMMENT ON COLUMN users.yeobjeun_paid_balance IS '이 컬럼 도입 이후 지급된 유상 엽전. 기존 잔액을 재분류하지 않음.';
COMMENT ON COLUMN users.yeobjeun_bonus_balance IS '이 컬럼 도입 이후 지급된 보너스 엽전. 기존 잔액을 재분류하지 않음.';

CREATE TABLE IF NOT EXISTS charge_orders (
  order_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  package_id TEXT NOT NULL,
  package_version TEXT NOT NULL,
  amount_krw INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KRW',
  paid_nyang INTEGER NOT NULL,
  bonus_nyang INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  grant_status TEXT NOT NULL DEFAULT 'none',
  payment_key TEXT,
  va_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  granted_at TIMESTAMPTZ,
  CONSTRAINT charge_orders_amount_positive CHECK (amount_krw > 0),
  CONSTRAINT charge_orders_nyang_nonneg CHECK (paid_nyang >= 0 AND bonus_nyang >= 0)
);

CREATE INDEX IF NOT EXISTS idx_charge_orders_user ON charge_orders(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_charge_orders_payment_key
  ON charge_orders(payment_key) WHERE payment_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS yeobjeun_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE REFERENCES charge_orders(order_id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  paid_nyang INTEGER NOT NULL,
  bonus_nyang INTEGER NOT NULL,
  payment_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS yeobjeun_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  order_id TEXT NOT NULL REFERENCES charge_orders(order_id) ON DELETE RESTRICT,
  entry_kind TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, entry_kind)
);

CREATE TABLE IF NOT EXISTS payment_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL,
  event_id TEXT,
  order_id TEXT,
  payment_key TEXT,
  payment_status TEXT,
  amount INTEGER,
  currency TEXT,
  verification_ok BOOLEAN,
  verification_method TEXT,
  process_result TEXT NOT NULL,
  failure_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_audit_event_id
  ON payment_audit_events(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_audit_order ON payment_audit_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_received ON payment_audit_events(received_at DESC);

ALTER TABLE charge_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE yeobjeun_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE yeobjeun_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_charge_orders" ON charge_orders;
CREATE POLICY "deny_all_charge_orders" ON charge_orders FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_yeobjeun_grants" ON yeobjeun_grants;
CREATE POLICY "deny_all_yeobjeun_grants" ON yeobjeun_grants FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_yeobjeun_ledger" ON yeobjeun_ledger;
CREATE POLICY "deny_all_yeobjeun_ledger" ON yeobjeun_ledger FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_payment_audit" ON payment_audit_events;
CREATE POLICY "deny_all_payment_audit" ON payment_audit_events FOR ALL USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE charge_orders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE yeobjeun_grants FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE yeobjeun_ledger FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE payment_audit_events FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE charge_orders TO service_role;
GRANT ALL ON TABLE yeobjeun_grants TO service_role;
GRANT ALL ON TABLE yeobjeun_ledger TO service_role;
GRANT ALL ON TABLE payment_audit_events TO service_role;

CREATE OR REPLACE FUNCTION grant_yeobjeun_charge(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o charge_orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM charge_orders WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'order_not_found');
  END IF;

  BEGIN
    INSERT INTO yeobjeun_grants (order_id, user_id, paid_nyang, bonus_nyang, payment_key)
    VALUES (o.order_id, o.user_id, o.paid_nyang, o.bonus_nyang, o.payment_key);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'code', 'already_granted');
  END;

  INSERT INTO yeobjeun_ledger (user_id, order_id, entry_kind, amount)
  VALUES (o.user_id, o.order_id, 'paid_credit', o.paid_nyang);
  IF o.bonus_nyang > 0 THEN
    INSERT INTO yeobjeun_ledger (user_id, order_id, entry_kind, amount)
    VALUES (o.user_id, o.order_id, 'bonus_credit', o.bonus_nyang);
  END IF;

  UPDATE users
  SET
    yeobjeun_balance = yeobjeun_balance + o.paid_nyang + o.bonus_nyang,
    yeobjeun_paid_balance = yeobjeun_paid_balance + o.paid_nyang,
    yeobjeun_bonus_balance = yeobjeun_bonus_balance + o.bonus_nyang
  WHERE id = o.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  UPDATE charge_orders
  SET grant_status = 'granted', granted_at = NOW()
  WHERE order_id = p_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'granted',
    'paid_nyang', o.paid_nyang,
    'bonus_nyang', o.bonus_nyang
  );
END;
$$;

REVOKE ALL ON FUNCTION grant_yeobjeun_charge(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION grant_yeobjeun_charge(text) TO service_role;
