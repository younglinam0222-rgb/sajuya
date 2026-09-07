import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createServerSupabase } from '@/lib/supabase'
import { SAJU_UNLOCK_NYANG } from '@/lib/pricing'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.sub) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }
    const { shareId } = await params
    if (!shareId || shareId.length < 8) {
      return NextResponse.json({ error: '풀이를 찾을 수 없습니다' }, { status: 400 })
    }
    const supabase = createServerSupabase()
    const { data, error } = await supabase.rpc('spend_yeobjeun_unlock', {
      p_share_id: shareId,
      p_user_id: token.sub,
    })
    if (error) {
      console.error(JSON.stringify({ tag: 'unlock', phase: 'rpc', code: error.code }))
      return NextResponse.json({ error: '전체보기를 처리할 수 없습니다' }, { status: 503 })
    }
    const row = data as { ok?: boolean; code?: string; total?: number; paid?: number; bonus?: number }
    if (row?.code === 'already_unlocked' || row?.code === 'unlocked') {
      return NextResponse.json({
        success: true,
        already: row.code === 'already_unlocked',
        nyang: SAJU_UNLOCK_NYANG,
        balance: row.total,
      })
    }
    if (row?.code === 'insufficient') {
      return NextResponse.json({ error: '엽전이 부족합니다', code: 'insufficient', need: SAJU_UNLOCK_NYANG }, { status: 402 })
    }
    if (row?.code === 'empty_result') {
      return NextResponse.json({ error: '아직 풀이 결과가 없어 차감하지 않습니다' }, { status: 409 })
    }
    if (row?.code === 'forbidden') {
      return NextResponse.json({ error: '이 풀이를 열 수 없습니다' }, { status: 403 })
    }
    if (row?.code === 'not_found') {
      return NextResponse.json({ error: '풀이를 찾을 수 없습니다' }, { status: 404 })
    }
    return NextResponse.json({ error: '전체보기에 실패했습니다' }, { status: 500 })
  } catch (e) {
    console.error(JSON.stringify({ tag: 'unlock', err: e instanceof Error ? e.message : 'error' }))
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
