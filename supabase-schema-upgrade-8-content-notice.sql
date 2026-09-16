-- 콘텐츠 안내 1회 확인 기록
-- 멱등 적용. DROP TABLE 하지 않으며 기존 users·readings·잔액 행은 변경하지 않는다.
-- 과거 확인 기록을 소급 생성하지 않는다.

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

REVOKE ALL ON TABLE content_notice_acks FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE content_notice_acks TO service_role;

NOTIFY pgrst, 'reload schema';
