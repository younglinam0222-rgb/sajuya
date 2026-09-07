import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { SAJU_UNLOCK_NYANG } from '@/lib/pricing'
import { rejectCrossSiteCookieMutation } from '@/lib/requestGuard'
import { localBurstGuard } from '@/lib/requestGuard'
import { reserveFullview, tryUserRate } from '@/lib/fullviewDb'

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
    if (!localBurstGuard(`unlock:${token.sub}`, 5, 60_000)) {
      return NextResponse.json({ error: '요청이 잦아요' }, { status: 429 })
    }
    const rateOk = await tryUserRate(token.sub, 'unlock', 10, 600)
    if (!rateOk) {
      return NextResponse.json({ error: '요청이 잦아요' }, { status: 429 })
    }
    const { shareId } = await params
    if (!shareId || shareId.length < 8) {
      return NextResponse.json({ error: '풀이를 찾을 수 없습니다' }, { status: 400 })
    }
    const row = await reserveFullview(shareId, token.sub)
    if (row.code === 'already_completed') {
      return NextResponse.json({
        success: true,
        already: true,
        nyang: SAJU_UNLOCK_NYANG,
        balance: row.total,
      })
    }
    if (row.code === 'reserved' || row.code === 'reused') {
      return NextResponse.json({
        success: true,
        already: false,
        reserved: true,
        jobId: row.job_id,
        expiresAt: row.expires_at,
        nyang: SAJU_UNLOCK_NYANG,
        balance: row.total,
        reused: row.code === 'reused',
      })
    }
    if (row.code === 'insufficient') {
      return NextResponse.json({ error: '엽전이 부족합니다', code: 'insufficient', need: SAJU_UNLOCK_NYANG }, { status: 402 })
    }
    if (row.code === 'empty_result') {
      return NextResponse.json({ error: '아직 풀이 결과가 없어 차감하지 않습니다' }, { status: 409 })
    }
    if (row.code === 'forbidden') {
      return NextResponse.json({ error: '이 풀이를 열 수 없습니다' }, { status: 403 })
    }
    if (row.code === 'not_found') {
      return NextResponse.json({ error: '풀이를 찾을 수 없습니다' }, { status: 404 })
    }
    if (row.code === 'busy') {
      return NextResponse.json({ error: '다른 전체보기 생성이 진행 중입니다' }, { status: 409 })
    }
    return NextResponse.json({ error: '전체보기에 실패했습니다' }, { status: 500 })
  } catch (e) {
    console.error(JSON.stringify({ tag: 'unlock', err: e instanceof Error ? e.message : 'error' }))
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
