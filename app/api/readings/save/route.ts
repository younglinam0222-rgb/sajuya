import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function withSaveMeta(aiResult: unknown, isComplete: boolean, requestId?: unknown, sajuData?: { form?: { personalQuestion?: unknown } }) {
  if (typeof aiResult !== 'string') return aiResult
  try {
    const parsed = JSON.parse(aiResult)
    if (!parsed || typeof parsed !== 'object') return aiResult
    const fallbackQ = typeof sajuData?.form?.personalQuestion === 'string' ? sajuData.form.personalQuestion.trim() : ''
    if (parsed.personalAnswer && typeof parsed.personalAnswer === 'object') {
      const pa = parsed.personalAnswer as { question?: unknown; answer?: unknown }
      if ((!pa.question || typeof pa.question !== 'string' || !pa.question.trim()) && fallbackQ) {
        parsed.personalAnswer = { ...pa, question: fallbackQ }
      }
    }
    parsed._meta = {
      ...(typeof parsed._meta === 'object' && parsed._meta ? parsed._meta : {}),
      isComplete: !!isComplete,
      requestId: typeof requestId === 'string' ? requestId : null,
      savedAt: Date.now(),
    }
    return JSON.stringify(parsed)
  } catch {
    return aiResult
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    const { characterId, occupationId, sajuData, aiResult, isPaid, shareId: existingShareId, requestId, isComplete } = await req.json()
    const storedResult = withSaveMeta(aiResult, !!isComplete, requestId, sajuData)

    if (typeof existingShareId === 'string' && existingShareId.length >= 8 && existingShareId.length <= 32) {
      if (!token?.sub) {
        return NextResponse.json({ error: '저장 재시도는 로그인 후 가능합니다' }, { status: 401 })
      }
      const { data, error } = await supabase
        .from('readings')
        .update({
          character_id: characterId,
          occupation_id: occupationId ?? 'general',
          saju_data: sajuData,
          ai_result: storedResult,
          is_paid: isPaid ?? false,
        })
        .eq('share_id', existingShareId)
        .eq('user_id', token.sub)
        .select('share_id')
        .single()

      if (error || !data) throw error ?? new Error('기존 저장본을 찾지 못함')
      return NextResponse.json({ shareId: data.share_id, updated: true, isComplete: !!isComplete })
    }

    const shareId = randomUUID().replace(/-/g, '').slice(0, 12)

    const { error } = await supabase.from('readings').insert({
      share_id:     shareId,
      user_id:      token?.sub   ?? null,
      user_email:   token?.email ?? null,
      character_id: characterId,
      occupation_id: occupationId ?? 'general',
      saju_data:    sajuData,
      ai_result:    storedResult,
      is_paid:      isPaid ?? false,
    })

    if (error) throw error
    return NextResponse.json({ shareId, updated: false, isComplete: !!isComplete })
  } catch (e) {
    console.error('[사주궁] 저장 실패:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }
}
