-- ==============================
-- 사주궁 업그레이드 스키마 3 — 일일운세 저장/캐싱
-- 기존 supabase-schema.sql, supabase-schema-upgrade.sql 실행 후 이것도 실행하세요
-- ==============================

-- users 테이블에 마지막으로 입력한 생년월일 프로필 저장
-- (로그인 시 매번 다시 입력 안 하고 재사용하기 위함)
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_profile JSONB;

-- 로그인 사용자의 날짜별 일일운세 캐시
-- 같은 날 재방문 시 재생성 없이 그대로 보여주기 위함
CREATE TABLE IF NOT EXISTS daily_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reading_date DATE NOT NULL,             -- 한국 시간(KST) 기준 날짜
  character_id TEXT NOT NULL,
  manse_data JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reading_date)           -- 하루에 유저당 1건만 저장 (업서트)
);

CREATE INDEX IF NOT EXISTS idx_daily_readings_user_date ON daily_readings(user_id, reading_date);

-- RLS: 서비스 롤만 접근 (API 라우트가 서비스 롤로 읽고 씀)
ALTER TABLE daily_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only for daily_readings" ON daily_readings USING (false);

-- ==============================
-- 30일 이상 지난 일일운세 캐시 자동 삭제 (선택, Supabase Cron)
-- Supabase → Database → Extensions → pg_cron 활성화 후
-- ==============================
-- SELECT cron.schedule(
--   'cleanup-old-daily-readings',
--   '0 4 * * *',
--   'DELETE FROM daily_readings WHERE reading_date < CURRENT_DATE - INTERVAL ''30 days'''
-- );
