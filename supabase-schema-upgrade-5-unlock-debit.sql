-- ==============================
-- 사주 전체보기 1냥 차감 (upgrade-4 적용 후 실행)
-- Preview가 Production DB를 공유할 수 있으므로 이 파일만으로 고객 잔액을 바꾸지 않는다.
-- ==============================

ALTER TABLE yeobjeun_ledger ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE yeobjeun_ledger ADD COLUMN IF NOT EXISTS share_id TEXT;
ALTER TABLE yeobjeun_ledger ADD COLUMN IF NOT EXISTS bucket TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_yeobjeun_ledger_share_kind
  ON yeobjeun_ledger(share_id, entry_kind) WHERE share_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS yeobjeun_unlocks (
  share_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  nyang INTEGER NOT NULL DEFAULT 1,
  unclassified_nyang INTEGER NOT NULL DEFAULT 0,
  paid_nyang INTEGER NOT NULL DEFAULT 0,
  bonus_nyang INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  restored_at TIMESTAMPTZ
);

ALTER TABLE yeobjeun_unlocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_all_yeobjeun_unlocks" ON yeobjeun_unlocks;
CREATE POLICY "deny_all_yeobjeun_unlocks" ON yeobjeun_unlocks FOR ALL USING (false) WITH CHECK (false);
REVOKE ALL ON TABLE yeobjeun_unlocks FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE yeobjeun_unlocks TO service_role;

CREATE OR REPLACE FUNCTION spend_yeobjeun_unlock(p_share_id text, p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r readings%ROWTYPE;
  u users%ROWTYPE;
  unclassified integer;
  need integer := 1;
  take_unc integer := 0;
  take_paid integer := 0;
  take_bonus integer := 0;
BEGIN
  SELECT * INTO r FROM readings WHERE share_id = p_share_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  IF r.user_id IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;
  IF r.is_paid THEN
    RETURN jsonb_build_object('ok', true, 'code', 'already_unlocked');
  END IF;
  IF r.ai_result IS NULL OR length(trim(r.ai_result::text)) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'empty_result');
  END IF;

  SELECT * INTO u FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM yeobjeun_ledger
    WHERE share_id = p_share_id AND entry_kind = 'unlock_debit'
  ) THEN
    UPDATE readings SET is_paid = true WHERE share_id = p_share_id AND is_paid = false;
    RETURN jsonb_build_object('ok', true, 'code', 'already_unlocked');
  END IF;

  IF u.yeobjeun_balance < 1 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'insufficient');
  END IF;

  INSERT INTO yeobjeun_unlocks (share_id, user_id, nyang)
  VALUES (p_share_id, p_user_id, 1)
  ON CONFLICT (share_id) DO NOTHING;

  unclassified := GREATEST(0, u.yeobjeun_balance - u.yeobjeun_paid_balance - u.yeobjeun_bonus_balance);
  take_unc := LEAST(unclassified, need);
  need := need - take_unc;
  IF need > 0 THEN
    IF u.yeobjeun_paid_balance >= need AND u.yeobjeun_bonus_balance = 0 THEN
      take_paid := need;
      need := 0;
    ELSIF u.yeobjeun_bonus_balance >= need AND u.yeobjeun_paid_balance = 0 THEN
      take_bonus := need;
      need := 0;
    ELSE
      -- 임시 회계: 유상 다음 보너스. 보너스 우선 정책이 아님.
      take_paid := LEAST(u.yeobjeun_paid_balance, need);
      need := need - take_paid;
      IF need > 0 THEN
        IF u.yeobjeun_bonus_balance < need THEN
          RETURN jsonb_build_object('ok', false, 'code', 'insufficient');
        END IF;
        take_bonus := need;
        need := 0;
      END IF;
    END IF;
  END IF;

  UPDATE yeobjeun_unlocks
  SET unclassified_nyang = take_unc, paid_nyang = take_paid, bonus_nyang = take_bonus
  WHERE share_id = p_share_id;

  INSERT INTO yeobjeun_ledger (user_id, order_id, share_id, entry_kind, amount, bucket)
  VALUES (p_user_id, NULL, p_share_id, 'unlock_debit', 1, CASE
    WHEN take_unc = 1 THEN 'unclassified'
    WHEN take_paid = 1 THEN 'paid'
    WHEN take_bonus = 1 THEN 'bonus'
    ELSE 'mixed'
  END);

  UPDATE users
  SET
    yeobjeun_balance = yeobjeun_balance - 1,
    yeobjeun_paid_balance = yeobjeun_paid_balance - take_paid,
    yeobjeun_bonus_balance = yeobjeun_bonus_balance - take_bonus
  WHERE id = p_user_id;

  UPDATE readings SET is_paid = true WHERE share_id = p_share_id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'unlocked',
    'unclassified_nyang', take_unc,
    'paid_nyang', take_paid,
    'bonus_nyang', take_bonus,
    'total', u.yeobjeun_balance - 1,
    'paid', u.yeobjeun_paid_balance - take_paid,
    'bonus', u.yeobjeun_bonus_balance - take_bonus
  );
END;
$$;

CREATE OR REPLACE FUNCTION restore_yeobjeun_unlock(p_share_id text, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u yeobjeun_unlocks%ROWTYPE;
  r readings%ROWTYPE;
BEGIN
  SELECT * INTO u FROM yeobjeun_unlocks WHERE share_id = p_share_id FOR UPDATE;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM yeobjeun_ledger WHERE share_id = p_share_id AND entry_kind = 'unlock_restore') THEN
      RETURN jsonb_build_object('ok', true, 'code', 'already_restored');
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'restore_refused');
  END IF;

  SELECT * INTO r FROM readings WHERE share_id = p_share_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  -- 결과가 이미 있으면 열람이 제공된 것으로 보고 자동 복구하지 않음.
  IF r.ai_result IS NOT NULL AND length(trim(r.ai_result::text)) >= 8 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'restore_refused');
  END IF;

  UPDATE users
  SET
    yeobjeun_balance = yeobjeun_balance + 1,
    yeobjeun_paid_balance = yeobjeun_paid_balance + u.paid_nyang,
    yeobjeun_bonus_balance = yeobjeun_bonus_balance + u.bonus_nyang
  WHERE id = u.user_id;

  INSERT INTO yeobjeun_ledger (user_id, order_id, share_id, entry_kind, amount, bucket)
  VALUES (u.user_id, NULL, p_share_id, 'unlock_restore', 1, 'restore');

  UPDATE readings SET is_paid = false WHERE share_id = p_share_id;
  DELETE FROM yeobjeun_unlocks WHERE share_id = p_share_id;

  RETURN jsonb_build_object('ok', true, 'code', 'restored');
END;
$$;

REVOKE ALL ON FUNCTION spend_yeobjeun_unlock(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION spend_yeobjeun_unlock(text, text) TO service_role;
REVOKE ALL ON FUNCTION restore_yeobjeun_unlock(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION restore_yeobjeun_unlock(text, text) TO service_role;
