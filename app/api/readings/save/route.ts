import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    const { characterId, occupationId, sajuData, aiResult, isPaid } = await req.json()

    const shareId = randomUUID().replace(/-/g, '').slice(0, 12)

    const { error } = await supabase.from('readings').insert({
      share_id: shareId,
      user_id: token?.sub ?? null,
      user_email: token?.email ?? null,
      character_id: characterId,
      occupation_id: occupationId ?? 'general',
      saju_data: JSON.stringify(sajuData),
      ai_result: aiResult,
      is_paid: isPaid ?? false,
    })

    if (error) throw error

    return NextResponse.json({ shareId })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }
}
