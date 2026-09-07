-- 구매 결과 공개 공유. 기존 readings는 기본 비공개. Preview가 Production DB를 공유할 수 있어 여기서 일괄 공개하지 않는다.

CREATE TABLE IF NOT EXISTS reading_public_shares (
  share_id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  include_personal BOOLEAN NOT NULL DEFAULT false,
  display_name TEXT NOT NULL DEFAULT '친구',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_public_shares_token ON reading_public_shares(token);

CREATE TABLE IF NOT EXISTS share_funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  token_prefix TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reading_public_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_public_shares" ON reading_public_shares FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "deny_all_share_funnel" ON share_funnel_events FOR ALL USING (false) WITH CHECK (false);
REVOKE ALL ON TABLE reading_public_shares FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE share_funnel_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE reading_public_shares TO service_role;
GRANT ALL ON TABLE share_funnel_events TO service_role;
