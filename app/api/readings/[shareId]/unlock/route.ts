import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createServerSupabase } from '@/lib/supabase'
import { isPaymentsEnabled } from '@/lib/paymentFlags'
import { SAJU_UNLOCK_NYANG } from '@/lib/pricing'
import { withPaidGeneration } from '@/lib/sajuAccess'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const { shareId } = await params
  if (!shareId || shareId.length < 8) {
    return NextResponse.json({ error: '풀이를 찾을 수 없습니다' }, { status: 404 })
  }

  const supabase = createServerSupabase()
  const { data: reading, error } = await supabase
    .from('readings')
    .select('share_id, user_id, is_paid, ai_result')
    .eq('share_id', shareId)
    .maybeSingle()

  if (error || !reading) {
    return NextResponse.json({ error: '풀이를 찾을 수 없습니다' }, { status: 404 })
  }
  if (reading.user_id !== userId) {
    return NextResponse.json({ error: '이 풀이의 전체보기를 구매할 수 없습니다' }, { status: 403 })
  }
  if (reading.is_paid === true) {
    return NextResponse.json({
      ok: true,
      alreadyPaid: true,
      paymentsEnabled: isPaymentsEnabled(),
      nyang: SAJU_UNLOCK_NYANG,
    })
  }

  if (!isPaymentsEnabled()) {
    return NextResponse.json({
      ok: false,
      alreadyPaid: false,
      paymentsEnabled: false,
      error: '결제가 아직 활성화되지 않아 전체보기를 구매할 수 없어요.',
    }, { status: 403 })
  }

  const { data: deducted, error: deductError } = await supabase.rpc('deduct_yeobjeun', {
    p_user_id: userId,
    p_amount: SAJU_UNLOCK_NYANG,
  })
  const balance = Number(deducted)
  if (deductError || !Number.isFinite(balance) || balance < 0) {
    return NextResponse.json({
      ok: false,
      error: '엽전이 부족해요. 2냥이 필요합니다.',
      paymentsEnabled: true,
    }, { status: 402 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('readings')
    .update({
      is_paid: true,
      ai_result: withPaidGeneration(reading.ai_result, { status: 'pending', startedAt: Date.now() }),
    })
    .eq('share_id', shareId)
    .eq('user_id', userId)
    .eq('is_paid', false)
    .select('share_id')
    .maybeSingle()

  if (updateError || !updated) {
    await supabase.rpc('refund_yeobjeun', { p_user_id: userId, p_amount: SAJU_UNLOCK_NYANG })
    return NextResponse.json({
      ok: true,
      alreadyPaid: true,
      paymentsEnabled: true,
      nyang: SAJU_UNLOCK_NYANG,
    })
  }

  return NextResponse.json({
    ok: true,
    alreadyPaid: false,
    paymentsEnabled: true,
    nyang: SAJU_UNLOCK_NYANG,
    balance,
  })
}
