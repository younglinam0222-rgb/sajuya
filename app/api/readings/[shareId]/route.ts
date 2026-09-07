import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { publicReadingPayload, viewerAccess } from '@/lib/sajuAccess'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { shareId } = await params
    const { data, error } = await supabaseAdmin
      .from('readings')
      .select('share_id, user_id, character_id, created_at, is_paid, saju_data, ai_result')
      .eq('share_id', shareId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '풀이를 찾을 수 없습니다' }, { status: 404 })
    }

    const viewerId = (session.user as { id?: string } | undefined)?.id ?? null
    const access = viewerAccess(data.user_id, viewerId, data.is_paid === true)
    return NextResponse.json(publicReadingPayload(data, access))
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
