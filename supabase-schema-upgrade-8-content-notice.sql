-- 콘텐츠 안내 1회 확인 기록
-- Preview/테스트 DB에만 적용. Production DB에는 적용하지 말 것.

CREATE TABLE IF NOT EXISTS content_notice_acks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notice_version TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, notice_version)
);

CREATE INDEX IF NOT EXISTS idx_content_notice_acks_user
  ON content_notice_acks (user_id);

ALTER TABLE content_notice_acks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_notice_acks_deny_all" ON content_notice_acks;
CREATE POLICY "content_notice_acks_deny_all"
  ON content_notice_acks
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 접근은 서버의 SUPABASE_SERVICE_ROLE_KEY 만 사용한다.
-- 과거 동의 기록을 소급 생성하지 않는다.
