import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createServerSupabase } from '@/lib/supabase'
import { redactUnpaidReading } from '@/lib/readingAccess'
import { expireFullviewDue, loadOpenReservation } from '@/lib/fullviewDb'

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

    const isOwner = data.user_id === token.sub
    const reservation = isOwner ? await loadOpenReservation(shareId, token.sub) : null
    const payload = isOwner && data.is_paid ? data : redactUnpaidReading(data)
    return NextResponse.json({
      ...payload,
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
