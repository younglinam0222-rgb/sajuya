import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createServerSupabase } from '@/lib/supabase'
import { rejectCrossSiteCookieMutation } from '@/lib/requestGuard'

/** 생성 실패·빈 결과일 때만 1냥 차감을 되돌린다. 결과가 있으면 거절. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const csrf = rejectCrossSiteCookieMutation(req)
    if (csrf) return csrf
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.sub) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }
    const { shareId } = await params
    const body = await req.json().catch(() => ({}))
    const reason = body.reason === 'generation_failed' ? 'generation_failed' : 'empty_result'
    const supabase = createServerSupabase()
    const { data: reading } = await supabase
      .from('readings')
      .select('user_id')
      .eq('share_id', shareId)
      .maybeSingle()
    if (!reading || reading.user_id !== token.sub) {
      return NextResponse.json({ error: '풀이를 찾을 수 없습니다' }, { status: 404 })
    }
    const { data, error } = await supabase.rpc('restore_yeobjeun_unlock', {
      p_share_id: shareId,
      p_reason: reason,
    })
    if (error) {
      console.error(JSON.stringify({ tag: 'unlock_restore', phase: 'rpc', code: error.code }))
      return NextResponse.json({ error: '복구를 처리할 수 없습니다' }, { status: 503 })
    }
    const row = data as { ok?: boolean; code?: string }
    if (row?.code === 'restored' || row?.code === 'already_restored') {
      return NextResponse.json({ success: true, already: row.code === 'already_restored' })
    }
    return NextResponse.json({ error: '복구할 수 없는 상태입니다', code: row?.code }, { status: 409 })
  } catch (e) {
    console.error(JSON.stringify({ tag: 'unlock_restore', err: e instanceof Error ? e.message : 'error' }))
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
