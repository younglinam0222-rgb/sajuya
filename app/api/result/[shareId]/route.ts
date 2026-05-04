import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }  // ← Promise 추가
) {
  try {
    const { shareId } = await params  // ← await 추가

    const { data, error } = await supabaseAdmin
      .from('readings')
      .select('*')
      .eq('share_id', shareId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '풀이를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
