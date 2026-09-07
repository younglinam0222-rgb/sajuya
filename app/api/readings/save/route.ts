import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { mergeAiResultForSave } from '@/lib/sajuAccess'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function withSaveMeta(merged: Record<string, unknown>, isComplete: boolean, requestId?: unknown) {
  merged._meta = {
    ...(typeof merged._meta === 'object' && merged._meta ? merged._meta as Record<string, unknown> : {}),
    isComplete: !!isComplete,
    requestId: typeof requestId === 'string' ? requestId : null,
    savedAt: Date.now(),
  }
  return JSON.stringify(merged)
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    const { characterId, occupationId, sajuData, aiResult, shareId: existingShareId, requestId, isComplete } = await req.json()

    if (typeof existingShareId === 'string' && existingShareId.length >= 8 && existingShareId.length <= 32) {
      if (!token?.sub) {
        return NextResponse.json({ error: '저장 재시도는 로그인 후 가능합니다' }, { status: 401 })
      }
      const { data: existing, error: loadError } = await supabase
        .from('readings')
        .select('share_id, is_paid, ai_result')
        .eq('share_id', existingShareId)
        .eq('user_id', token.sub)
        .maybeSingle()
      if (loadError || !existing) {
        return NextResponse.json({ error: '기존 저장본을 찾지 못함' }, { status: 404 })
      }
      const isPaid = existing.is_paid === true
      const merged = mergeAiResultForSave(existing.ai_result, aiResult, isPaid)
      const storedResult = withSaveMeta(merged, !!isComplete, requestId)
      const { data, error } = await supabase
        .from('readings')
        .update({
          character_id: characterId,
          occupation_id: occupationId ?? 'general',
          saju_data: sajuData,
          ai_result: storedResult,
        })
        .eq('share_id', existingShareId)
        .eq('user_id', token.sub)
        .select('share_id')
        .single()

      if (error || !data) throw error ?? new Error('기존 저장본을 찾지 못함')
      return NextResponse.json({ shareId: data.share_id, updated: true, isComplete: !!isComplete, isPaid })
    }

    const shareId = randomUUID().replace(/-/g, '').slice(0, 12)
    const merged = mergeAiResultForSave(null, aiResult, false)
    const storedResult = withSaveMeta(merged, !!isComplete, requestId)

    const { error } = await supabase.from('readings').insert({
      share_id:     shareId,
      user_id:      token?.sub   ?? null,
      user_email:   token?.email ?? null,
      character_id: characterId,
      occupation_id: occupationId ?? 'general',
      saju_data:    sajuData,
      ai_result:    storedResult,
      is_paid:      false,
    })

    if (error) throw error
    return NextResponse.json({ shareId, updated: false, isComplete: !!isComplete, isPaid: false })
  } catch (e) {
    console.error('[사주궁] 저장 실패:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }
}
