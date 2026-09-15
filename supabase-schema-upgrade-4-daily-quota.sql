-- ==============================
-- 사주궁 업그레이드 스키마 4 — 오늘의 운세 일 1회 무료 이용
-- 기존 supabase-schema.sql, supabase-schema-upgrade.sql,
-- supabase-schema-upgrade-3-daily.sql 실행 후 이것도 실행하세요
-- ==============================

-- 로그인 사용자 × KST 날짜의 무료 슬롯을 원자적으로 확보한다.
-- daily_readings(완성 결과 캐시)와 분리: 생성 중/실패를 가짜 결과로 채우지 않기 위함.
CREATE TABLE IF NOT EXISTS daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,                 -- 요청 접수 시각의 KST 날짜. 자정 넘긴 완료도 이 날짜.
  kind TEXT NOT NULL CHECK (kind IN ('free', 'paid')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  request_id TEXT NOT NULL,                 -- 같은 요청 중복 전송 방지
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                   -- pending 만료. 서버 중단 시 생성 중이 영구히 남지 않게 함
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  nyang_charged INTEGER NOT NULL DEFAULT 0 CHECK (nyang_charged >= 0),
  refunded BOOLEAN NOT NULL DEFAULT FALSE,
  character_id TEXT,
  manse_data JSONB,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 무료: 사용자+날짜당 pending|completed 1건만. failed는 재시도 가능.
CREATE UNIQUE INDEX IF NOT EXISTS daily_usage_one_free_active
  ON daily_usage (user_id, usage_date)
  WHERE kind = 'free' AND status IN ('pending', 'completed');

-- 유료 행은 이 인덱스에 안 걸리므로 무료 기록을 덮어쓰지 않는다.
CREATE UNIQUE INDEX IF NOT EXISTS daily_usage_request_id
  ON daily_usage (request_id);

CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date
  ON daily_usage (user_id, usage_date);

CREATE INDEX IF NOT EXISTS idx_daily_usage_pending_expires
  ON daily_usage (expires_at)
  WHERE status = 'pending';

ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only for daily_usage" ON daily_usage;
CREATE POLICY "Service role only for daily_usage" ON daily_usage USING (false);

-- 만료된 pending을 실패 처리. 유료면 환급 1회만.
CREATE OR REPLACE FUNCTION expire_stale_daily_usage(p_now TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  n INTEGER := 0;
BEGIN
  FOR r IN
    SELECT id, user_id, kind, nyang_charged, refunded, status
    FROM daily_usage
    WHERE (status = 'pending' AND expires_at IS NOT NULL AND expires_at < p_now)
       OR (kind = 'paid' AND nyang_charged > 0 AND refunded = FALSE AND status = 'failed')
    FOR UPDATE
  LOOP
    IF r.status = 'pending' THEN
      UPDATE daily_usage
      SET status = 'failed', failed_at = p_now, expires_at = NULL
      WHERE id = r.id;
    END IF;

    IF r.kind = 'paid' AND r.nyang_charged > 0 AND r.refunded = FALSE THEN
      UPDATE users
      SET yeobjeun_balance = yeobjeun_balance + r.nyang_charged
      WHERE id = r.user_id;
      UPDATE daily_usage SET refunded = TRUE WHERE id = r.id;
    END IF;

    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- 잔액 원자 차감. 부족하면 -1.
CREATE OR REPLACE FUNCTION deduct_yeobjeun(p_user_id TEXT, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  UPDATE users
  SET yeobjeun_balance = yeobjeun_balance - p_amount
  WHERE id = p_user_id AND yeobjeun_balance >= p_amount
  RETURNING yeobjeun_balance INTO new_balance;
  IF new_balance IS NULL THEN
    RETURN -1;
  END IF;
  RETURN new_balance;
END;
$$;

-- 환급. 호출 측에서 daily_usage.refunded 로 중복 환급을 막는다.
CREATE OR REPLACE FUNCTION refund_yeobjeun(p_user_id TEXT, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  UPDATE users
  SET yeobjeun_balance = yeobjeun_balance + p_amount
  WHERE id = p_user_id
  RETURNING yeobjeun_balance INTO new_balance;
  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;
  RETURN new_balance;
END;
$$;

-- 유료 이용 1건을 잔액 복구와 refunded 플래그를 같은 트랜잭션에서 처리.
CREATE OR REPLACE FUNCTION refund_daily_usage(p_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  SELECT user_id, nyang_charged
    INTO r
  FROM daily_usage
  WHERE id = p_id
    AND kind = 'paid'
    AND nyang_charged > 0
    AND refunded = FALSE
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  UPDATE daily_usage SET refunded = TRUE WHERE id = p_id;
  UPDATE users
  SET yeobjeun_balance = yeobjeun_balance + r.nyang_charged
  WHERE id = r.user_id;
  RETURN r.nyang_charged;
END;
$$;
