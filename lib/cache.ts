// lib/cache.ts
// Claude API 응답 캐싱 시스템
// 동일 사주+직업+캐릭터 조합은 DB에서 재사용 → API 비용 70% 절감

import { createServerSupabase } from '@/lib/supabase'
import { createHash } from 'crypto'

export interface CacheKey {
  sajuHash: string   // 사주팔자 데이터 해시
  occupationId: string
  characterId: string
}

export interface CachedReading {
  hash: string
  result: string       // JSON 문자열
  created_at: string
}

// 캐시 키 생성 (사주데이터 + 직업 + 캐릭터 조합)
export function buildCacheHash(
  sajuData: Record<string, unknown>,
  occupationId: string,
  characterId: string
): string {
  const key = JSON.stringify({
    // 만세력 핵심 데이터만 (생년월일시+성별)
    yearPillar: sajuData.yearPillar,
    monthPillar: sajuData.monthPillar,
    dayPillar: sajuData.dayPillar,
    hourPillar: sajuData.hourPillar,
    animal: sajuData.animal,
    occupation: occupationId,
    character: characterId,
  })
  return createHash('md5').update(key).digest('hex')
}

// 캐시 조회
export async function getCachedReading(hash: string): Promise<string | null> {
  try {
    const supabase = createServerSupabase()
    const { data, error } = await supabase
      .from('reading_cache')
      .select('result, created_at')
      .eq('hash', hash)
      .single()

    if (error || !data) return null

    // TTL 체크: 30일 이상 된 캐시는 무효화
    const createdAt = new Date(data.created_at)
    const now = new Date()
    const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays > 30) {
      // 만료된 캐시 삭제 (비동기, 응답 기다리지 않음)
      supabase.from('reading_cache').delete().eq('hash', hash)
      return null
    }

    return data.result
  } catch {
    return null
  }
}

// 캐시 저장
export async function setCachedReading(
  hash: string,
  result: string,
  occupationId: string,
  characterId: string
): Promise<void> {
  try {
    const supabase = createServerSupabase()
    await supabase.from('reading_cache').upsert({
      hash,
      result,
      occupation_id: occupationId,
      character_id: characterId,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    // 캐시 저장 실패는 조용히 넘어감 (핵심 기능 아님)
    console.error('Cache save error:', err)
  }
}

// 특정 캐릭터/직업 캐시 전체 초기화 (프롬프트 업데이트 시)
export async function clearCache(
  characterId?: string,
  occupationId?: string
): Promise<void> {
  const supabase = createServerSupabase()
  let query = supabase.from('reading_cache').delete()
  if (characterId) query = query.eq('character_id', characterId)
  if (occupationId) query = query.eq('occupation_id', occupationId)
  await query
}
