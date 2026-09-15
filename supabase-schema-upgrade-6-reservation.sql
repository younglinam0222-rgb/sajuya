-- 전체보기 예약·만료 (upgrade-4,5 이후). Preview가 Production DB를 공유할 수 있어 여기서 고객 잔액을 바꾸지 않는다.

CREATE TABLE IF NOT EXISTS saju_fullview_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  job_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  unclassified_nyang INTEGER NOT NULL DEFAULT 0,
  paid_nyang INTEGER NOT NULL DEFAULT 0,
  bonus_nyang INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fullview_one_open
  ON saju_fullview_reservations(share_id)
  WHERE status IN ('reserved', 'generating', 'completed');

CREATE INDEX IF NOT EXISTS idx_fullview_expire
  ON saju_fullview_reservations(expires_at)
  WHERE status IN ('reserved', 'generating');

CREATE TABLE IF NOT EXISTS reservation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_rate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_user_action_time
  ON api_rate_events(user_id, action, created_at DESC);

ALTER TABLE saju_fullview_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_fullview_res" ON saju_fullview_reservations FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "deny_all_res_events" ON reservation_events FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "deny_all_rate_events" ON api_rate_events FOR ALL USING (false) WITH CHECK (false);
REVOKE ALL ON TABLE saju_fullview_reservations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE reservation_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE api_rate_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE saju_fullview_reservations TO service_role;
GRANT ALL ON TABLE reservation_events TO service_role;
GRANT ALL ON TABLE api_rate_events TO service_role;

-- 기존 share_id+entry_kind 유일 제약은 만료 후 재예약 차감을 막으므로 종류별로 나눈다.
DROP INDEX IF EXISTS idx_yeobjeun_ledger_share_kind;
CREATE UNIQUE INDEX IF NOT EXISTS idx_yeobjeun_ledger_unlock_debit
  ON yeobjeun_ledger(share_id) WHERE entry_kind = 'unlock_debit';
CREATE UNIQUE INDEX IF NOT EXISTS idx_yeobjeun_ledger_unlock_restore
  ON yeobjeun_ledger(share_id) WHERE entry_kind = 'unlock_restore';
CREATE UNIQUE INDEX IF NOT EXISTS idx_yeobjeun_ledger_fullview_job
  ON yeobjeun_ledger(order_id, entry_kind)
  WHERE entry_kind IN ('fullview_debit', 'fullview_restore') AND order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION try_api_rate(
  p_user_id text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF p_user_id IS NULL OR p_action IS NULL OR p_limit IS NULL OR p_window_seconds IS NULL THEN
    RETURN false;
  END IF;
  DELETE FROM api_rate_events
  WHERE created_at < NOW() - make_interval(secs => GREATEST(p_window_seconds, 60) * 4);

  INSERT INTO api_rate_events (user_id, action) VALUES (p_user_id, p_action);
  SELECT COUNT(*) INTO n
  FROM api_rate_events
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at >= NOW() - make_interval(secs => p_window_seconds);
  RETURN n <= p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION reserve_fullview(
  p_share_id text,
  p_user_id text,
  p_ttl_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r readings%ROWTYPE;
  u users%ROWTYPE;
  open_row saju_fullview_reservations%ROWTYPE;
  ttl integer := GREATEST(60, LEAST(COALESCE(p_ttl_seconds, 600), 3600));
  unclassified integer;
  need integer := 1;
  take_unc integer := 0;
  take_paid integer := 0;
  take_bonus integer := 0;
  new_job text;
BEGIN
  PERFORM expire_fullview_due();

  SELECT * INTO r FROM readings WHERE share_id = p_share_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  IF r.user_id IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;
  IF r.is_paid THEN
    RETURN jsonb_build_object('ok', true, 'code', 'already_completed');
  END IF;
  IF r.ai_result IS NULL OR length(trim(r.ai_result::text)) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'empty_result');
  END IF;

  SELECT * INTO open_row
  FROM saju_fullview_reservations
  WHERE share_id = p_share_id AND status IN ('reserved', 'generating', 'completed')
  FOR UPDATE;
  IF FOUND THEN
    IF open_row.status = 'completed' THEN
      RETURN jsonb_build_object('ok', true, 'code', 'already_completed', 'job_id', open_row.job_id);
    END IF;
    IF open_row.expires_at > NOW() THEN
      RETURN jsonb_build_object(
        'ok', true,
        'code', 'reused',
        'job_id', open_row.job_id,
        'expires_at', open_row.expires_at,
        'status', open_row.status
      );
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM saju_fullview_reservations
    WHERE user_id = p_user_id
      AND share_id IS DISTINCT FROM p_share_id
      AND status IN ('reserved', 'generating')
      AND expires_at > NOW()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'busy');
  END IF;

  SELECT * INTO u FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  IF u.yeobjeun_balance < 1 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'insufficient');
  END IF;

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

  new_job := replace(gen_random_uuid()::text, '-', '');

  UPDATE users
  SET
    yeobjeun_balance = yeobjeun_balance - 1,
    yeobjeun_paid_balance = yeobjeun_paid_balance - take_paid,
    yeobjeun_bonus_balance = yeobjeun_bonus_balance - take_bonus
  WHERE id = p_user_id;

  INSERT INTO saju_fullview_reservations (
    share_id, user_id, job_id, status, expires_at,
    unclassified_nyang, paid_nyang, bonus_nyang
  ) VALUES (
    p_share_id, p_user_id, new_job, 'reserved', NOW() + make_interval(secs => ttl),
    take_unc, take_paid, take_bonus
  );

  INSERT INTO yeobjeun_ledger (user_id, order_id, share_id, entry_kind, amount, bucket)
  VALUES (p_user_id, new_job, p_share_id, 'fullview_debit', 1, CASE
    WHEN take_unc = 1 THEN 'unclassified'
    WHEN take_paid = 1 THEN 'paid'
    WHEN take_bonus = 1 THEN 'bonus'
    ELSE 'mixed'
  END);
  INSERT INTO reservation_events (job_id, event_type, reason) VALUES (new_job, 'reserved', 'reserve');

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'reserved',
    'job_id', new_job,
    'expires_at', NOW() + make_interval(secs => ttl),
    'total', u.yeobjeun_balance - 1,
    'paid', u.yeobjeun_paid_balance - take_paid,
    'bonus', u.yeobjeun_bonus_balance - take_bonus
  );
END;
$$;

CREATE OR REPLACE FUNCTION start_fullview_job(p_share_id text, p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r saju_fullview_reservations%ROWTYPE;
  new_job text;
BEGIN
  PERFORM expire_fullview_due();
  SELECT * INTO r
  FROM saju_fullview_reservations
  WHERE share_id = p_share_id AND user_id = p_user_id AND status IN ('reserved', 'generating')
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'no_reservation');
  END IF;
  IF r.expires_at <= NOW() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'expired');
  END IF;
  new_job := replace(gen_random_uuid()::text, '-', '');
  UPDATE saju_fullview_reservations
  SET job_id = new_job, status = 'generating'
  WHERE id = r.id AND status IN ('reserved', 'generating') AND expires_at > NOW();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'lost_race');
  END IF;
  INSERT INTO reservation_events (job_id, event_type, reason)
  VALUES (new_job, 'job_bumped', 'prev:' || r.job_id);
  RETURN jsonb_build_object('ok', true, 'code', 'generating', 'job_id', new_job, 'expires_at', r.expires_at, 'prev_job_id', r.job_id);
END;
$$;

CREATE OR REPLACE FUNCTION expire_fullview_due()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r saju_fullview_reservations%ROWTYPE;
  n INTEGER := 0;
BEGIN
  FOR r IN
    SELECT * FROM saju_fullview_reservations
    WHERE status IN ('reserved', 'generating') AND expires_at <= NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE saju_fullview_reservations
    SET status = 'expired', released_at = NOW(), release_reason = 'expired'
    WHERE id = r.id AND status IN ('reserved', 'generating');
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    UPDATE users
    SET
      yeobjeun_balance = yeobjeun_balance + 1,
      yeobjeun_paid_balance = yeobjeun_paid_balance + r.paid_nyang,
      yeobjeun_bonus_balance = yeobjeun_bonus_balance + r.bonus_nyang
    WHERE id = r.user_id;
    INSERT INTO yeobjeun_ledger (user_id, order_id, share_id, entry_kind, amount, bucket)
    VALUES (r.user_id, r.job_id, r.share_id, 'fullview_restore', 1, 'expire');
    INSERT INTO reservation_events (job_id, event_type, reason) VALUES (r.job_id, 'expired', 'expired');
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION complete_fullview(p_job_id text, p_ai_result text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r saju_fullview_reservations%ROWTYPE;
BEGIN
  SELECT * INTO r FROM saju_fullview_reservations WHERE job_id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unknown_job');
  END IF;
  IF r.status = 'completed' THEN
    RETURN jsonb_build_object('ok', true, 'code', 'already_completed');
  END IF;
  IF r.status IN ('reserved', 'generating') AND r.expires_at <= NOW() THEN
    UPDATE saju_fullview_reservations
    SET status = 'expired', released_at = NOW(), release_reason = 'expired_on_complete'
    WHERE id = r.id AND status IN ('reserved', 'generating');
    IF FOUND THEN
      UPDATE users
      SET
        yeobjeun_balance = yeobjeun_balance + 1,
        yeobjeun_paid_balance = yeobjeun_paid_balance + r.paid_nyang,
        yeobjeun_bonus_balance = yeobjeun_bonus_balance + r.bonus_nyang
      WHERE id = r.user_id;
      INSERT INTO yeobjeun_ledger (user_id, order_id, share_id, entry_kind, amount, bucket)
      VALUES (r.user_id, r.job_id, r.share_id, 'fullview_restore', 1, 'expire');
      INSERT INTO reservation_events (job_id, event_type, reason) VALUES (p_job_id, 'expired', 'expired_on_complete');
    END IF;
    INSERT INTO reservation_events (job_id, event_type, reason) VALUES (p_job_id, 'late_complete_discarded', 'expired_on_complete');
    RETURN jsonb_build_object('ok', false, 'code', 'discarded');
  END IF;
  IF r.status NOT IN ('reserved', 'generating') THEN
    INSERT INTO reservation_events (job_id, event_type, reason) VALUES (p_job_id, 'late_complete_discarded', r.status);
    RETURN jsonb_build_object('ok', false, 'code', 'discarded');
  END IF;

  UPDATE saju_fullview_reservations
  SET status = 'completed', completed_at = NOW()
  WHERE id = r.id AND status IN ('reserved', 'generating');
  IF NOT FOUND THEN
    INSERT INTO reservation_events (job_id, event_type, reason) VALUES (p_job_id, 'late_complete_discarded', 'lost_race');
    RETURN jsonb_build_object('ok', false, 'code', 'discarded');
  END IF;

  UPDATE readings SET is_paid = true, ai_result = p_ai_result WHERE share_id = r.share_id AND user_id = r.user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reading update failed for completed reservation';
  END IF;
  INSERT INTO reservation_events (job_id, event_type) VALUES (p_job_id, 'completed');
  RETURN jsonb_build_object('ok', true, 'code', 'completed');
END;
$$;

REVOKE ALL ON FUNCTION expire_fullview_due() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION complete_fullview(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION reserve_fullview(text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION start_fullview_job(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION try_api_rate(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION expire_fullview_due() TO service_role;
GRANT EXECUTE ON FUNCTION complete_fullview(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION reserve_fullview(text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION start_fullview_job(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION try_api_rate(text, text, integer, integer) TO service_role;
