import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createServerSupabase } from '@/lib/supabase'
import { redactUnpaidReading } from '@/lib/readingAccess'
import { expireFullviewDue, loadOpenReservation } from '@/lib/fullviewDb'
import { loadShareSettings } from '@/lib/shareDb'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.sub) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { shareId } = await params
    await expireFullviewDue()

    const supabase = createServerSupabase()
    const { data, error } = await supabase
      .from('readings')
      .select('*')
      .eq('share_id', shareId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '풀이를 찾을 수 없습니다' }, { status: 404 })
    }

    if (data.user_id !== token.sub) {
      return NextResponse.json({ error: '풀이를 찾을 수 없습니다' }, { status: 404 })
    }
    const reservation = await loadOpenReservation(shareId, token.sub)
    const share = await loadShareSettings(shareId, token.sub)
    const payload = data.is_paid ? data : redactUnpaidReading(data)
    return NextResponse.json({
      ...payload,
      share: share ?? { enabled: false, includePersonal: false, displayName: '친구', publicPath: null },
      reservation: reservation
        ? {
            jobId: reservation.job_id,
            status: reservation.status,
            expiresAt: reservation.expires_at,
            reservedAt: reservation.reserved_at,
            completedAt: reservation.completed_at,
            releasedAt: reservation.released_at,
            releaseReason: reservation.release_reason,
          }
        : null,
    })
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
