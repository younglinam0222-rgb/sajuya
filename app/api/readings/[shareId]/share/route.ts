import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createServerSupabase } from '@/lib/supabase'
import { rejectCrossSiteCookieMutation } from '@/lib/requestGuard'
import { loadShareSettings, upsertShare } from '@/lib/shareDb'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.sub) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  const { shareId } = await params
  const settings = await loadShareSettings(shareId, token.sub)
  return NextResponse.json({ settings: settings ?? { enabled: false, includePersonal: false, displayName: '친구', publicPath: null } })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const csrf = rejectCrossSiteCookieMutation(req)
  if (csrf) return csrf
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.sub) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  const { shareId } = await params
  const body = await req.json().catch(() => ({}))
  const action = body.action
  if (action !== 'enable' && action !== 'disable' && action !== 'reissue' && action !== 'update') {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }
  const supabase = createServerSupabase()
  const { data: reading } = await supabase
    .from('readings')
    .select('share_id, user_id, is_paid')
    .eq('share_id', shareId)
    .maybeSingle()
  if (!reading) return NextResponse.json({ error: '풀이를 찾을 수 없습니다' }, { status: 404 })
  if (reading.user_id !== token.sub) return NextResponse.json({ error: '이 풀이를 공유할 수 없습니다' }, { status: 403 })

  const result = await upsertShare({
    shareId,
    userId: token.sub,
    isPaid: !!reading.is_paid,
    action,
    includePersonal: typeof body.includePersonal === 'boolean' ? body.includePersonal : undefined,
    displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
  })
  if (!result.ok) {
    const status = result.code === 'not_purchased' ? 402 : result.code === 'forbidden' ? 403 : 500
    return NextResponse.json({
      error: result.code === 'not_purchased' ? '구매한 결과만 공유할 수 있어요' : '공유 설정을 저장할 수 없습니다',
      code: result.code,
    }, { status })
  }
  return NextResponse.json({ success: true, settings: result.settings })
}
