// types/saju.ts

export type Gender = 'male' | 'female'
export type CharacterId = 'baekhalma' | 'doRyeong' | 'gumiho' | 'sinRyeong'

export interface SajuInputForm {
  name: string
  year: number
  month: number
  day: number
  hour: number | null  // null이면 시간 모름
  gender: Gender
  isLunar: boolean
}

export interface ReadingSection {
  id: string
  emoji: string
  title: string
  body: string
}

export interface ReadingResult {
  characterId: CharacterId
  sections: ReadingSection[]
  shareTitle: string
  adContext: string
}

export interface PaymentStatus {
  isPaid: boolean
  yeobjeunBalance: number
}

// Supabase DB 타입
export interface DbUser {
  id: string
  email: string | null
  name: string | null
  image: string | null
  yeobjeun_balance: number
  streak_days: number
  last_visit: string | null
  created_at: string
}

export interface DbReading {
  id: string
  user_id: string | null
  share_id: string
  saju_data: string  // JSON string
  character_id: CharacterId
  ai_result: string  // JSON string
  is_paid: boolean
  created_at: string
}

export interface DbPayment {
  id: string
  user_id: string | null
  reading_id: string | null
  amount: number
  toss_payment_key: string | null
  order_id: string
  status: 'pending' | 'done' | 'failed'
  created_at: string
}
