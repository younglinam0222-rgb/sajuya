import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    // ✅ 수정: 로그인 안 하면 결과 내용 자체를 서버에서 내려주지 않음 (프론트 화면만 막는 건 우회 가능)
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { shareId } = await params

    const { data, error } = await supabaseAdmin
      .from('readings')
      .select('*')
      .eq('share_id', shareId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '풀이를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
