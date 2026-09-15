import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createServerSupabase } from '@/lib/supabase'

const supabase = createServerSupabase()

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('readings')
    .select('id, share_id, character_id, created_at, saju_data, is_paid, product, access_verified')
    .eq('user_id', token.sub)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: '보관함을 불러오지 못했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ readings: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } })
}
