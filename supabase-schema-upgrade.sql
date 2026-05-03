-- ==============================
-- 사주야 업그레이드 스키마 (추가분)
-- 기존 supabase-schema.sql 실행 후 이것도 실행하세요
-- ==============================

-- readings 테이블에 occupation_id 컬럼 추가
ALTER TABLE readings ADD COLUMN IF NOT EXISTS occupation_id TEXT DEFAULT 'general';

-- API 응답 캐싱 테이블
CREATE TABLE IF NOT EXISTS reading_cache (
  hash TEXT PRIMARY KEY,
  result TEXT NOT NULL,
  occupation_id TEXT NOT NULL DEFAULT 'general',
  character_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 캐시 조회 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_cache_occupation ON reading_cache(occupation_id);
CREATE INDEX IF NOT EXISTS idx_cache_character ON reading_cache(character_id);
CREATE INDEX IF NOT EXISTS idx_cache_created ON reading_cache(created_at);

-- RLS: 서비스 롤만 접근
ALTER TABLE reading_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only for cache" ON reading_cache USING (false);

-- ==============================
-- 캐시 통계 뷰 (모니터링용)
-- ==============================
CREATE OR REPLACE VIEW cache_stats AS
SELECT
  occupation_id,
  character_id,
  COUNT(*) as cached_count,
  MIN(created_at) as oldest_cache,
  MAX(created_at) as newest_cache
FROM reading_cache
GROUP BY occupation_id, character_id
ORDER BY cached_count DESC;

-- ==============================
-- 30일 이상 캐시 자동 삭제 (Supabase Cron)
-- Supabase → Database → Extensions → pg_cron 활성화 후
-- ==============================
-- SELECT cron.schedule(
--   'cleanup-old-cache',
--   '0 3 * * *',
--   'DELETE FROM reading_cache WHERE created_at < NOW() - INTERVAL ''30 days'''
-- );
