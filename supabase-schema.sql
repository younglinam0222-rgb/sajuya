-- ==============================
-- 사주야 Supabase 데이터베이스 스키마
-- Supabase SQL Editor에 그대로 붙여넣고 실행하세요
-- ==============================

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,              -- NextAuth user ID
  email TEXT,
  name TEXT,
  image TEXT,
  yeobjeun_balance INTEGER DEFAULT 0 NOT NULL,  -- 엽전 잔고
  streak_days INTEGER DEFAULT 0 NOT NULL,        -- 연속 출석일
  last_visit DATE,                               -- 마지막 출석일
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 풀이 결과 테이블
CREATE TABLE IF NOT EXISTS readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  share_id TEXT UNIQUE NOT NULL,    -- 공유용 고유 ID
  saju_data JSONB NOT NULL,         -- 사주 입력 데이터
  character_id TEXT NOT NULL,       -- 사용한 캐릭터
  ai_result TEXT,                   -- AI 풀이 결과 (JSON 문자열)
  is_paid BOOLEAN DEFAULT FALSE,    -- 결제 여부
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 결제 테이블
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reading_id UUID REFERENCES readings(id) ON DELETE SET NULL,
  order_id TEXT UNIQUE NOT NULL,    -- 주문 ID (중복 결제 방지)
  toss_payment_key TEXT,            -- 토스페이먼츠 키
  amount INTEGER NOT NULL DEFAULT 990,
  status TEXT DEFAULT 'pending',    -- pending | done | failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_readings_share_id ON readings(share_id);
CREATE INDEX IF NOT EXISTS idx_readings_user_id ON readings(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

-- RLS (Row Level Security) 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- users: 자신의 데이터만 읽기/쓰기 가능
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id);

-- readings: 공유 ID로 누구나 읽기, 서비스 롤만 쓰기
CREATE POLICY "Anyone can read readings by share_id" ON readings FOR SELECT USING (true);

-- payments: 서비스 롤만 접근
CREATE POLICY "Service role only" ON payments USING (false);

-- ==============================
-- 테스트 데이터 (선택사항)
-- ==============================
-- INSERT INTO users (id, name, yeobjeun_balance) VALUES ('test-user-1', '테스트유저', 3);
