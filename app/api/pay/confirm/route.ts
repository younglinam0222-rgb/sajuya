import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createServerSupabase } from '@/lib/supabase'
import { LEGACY_UNLOCK_PRICE } from '@/lib/pricing'
import { isChargeOrderId, isUnlockOrderId } from '@/lib/chargePackages'
import { confirmChargeOrder } from '@/lib/chargeOrders'

async function confirmUnlock(paymentKey: string, orderId: string, amount: number) {
  if (amount !== LEGACY_UNLOCK_PRICE) {
    return NextResponse.json({ error: '결제 금액이 올바르지 않습니다' }, { status: 400 })
  }
  const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount: LEGACY_UNLOCK_PRICE }),
  })
  const tossData = await tossResponse.json()
  if (!tossResponse.ok) {
    console.error(JSON.stringify({ tag: 'pay', phase: 'unlock_confirm', code: tossData.code }))
    return NextResponse.json({ error: tossData.message || '결제 확인 실패' }, { status: 400 })
  }
  const supabase = createServerSupabase()
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('order_id', orderId)
    .eq('status', 'done')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ success: true, message: '이미 처리된 결제입니다' })
  }
  const { error: payError } = await supabase.from('payments').insert({
    order_id: orderId,
    toss_payment_key: paymentKey,
    amount: LEGACY_UNLOCK_PRICE,
    status: 'done',
  })
  if (payError) {
    if (payError.code === '23505') {
      return NextResponse.json({ success: true, message: '이미 처리된 결제입니다' })
    }
    console.error(JSON.stringify({ tag: 'pay', phase: 'unlock_db', code: payError.code }))
    return NextResponse.json({ error: 'DB 저장 실패' }, { status: 500 })
  }
  const shareId = orderId.split('_')[1]
  if (shareId) {
    await supabase.from('readings').update({ is_paid: true }).eq('share_id', shareId)
  }
  return NextResponse.json({ success: true })
}

export async function POST(req: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = await req.json()
    if (typeof paymentKey !== 'string' || typeof orderId !== 'string' || typeof amount !== 'number') {
      return NextResponse.json({ error: '결제 정보가 올바르지 않습니다' }, { status: 400 })
    }
    if (isChargeOrderId(orderId)) {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
      if (!token?.sub) {
        return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
      }
      const result = await confirmChargeOrder({
        orderId,
        paymentKey,
        clientAmount: amount,
        userId: token.sub,
        source: 'confirm',
      })
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, retryGrant: result.retryGrant === true },
          { status: result.status },
        )
      }
      return NextResponse.json({
        success: true,
        waitingDeposit: result.waitingDeposit === true,
        paidNyang: result.paidNyang,
        bonusNyang: result.bonusNyang,
        totalNyang: result.totalNyang,
        already: result.already === true,
      })
    }
    if (isUnlockOrderId(orderId)) {
      return confirmUnlock(paymentKey, orderId, amount)
    }
    return NextResponse.json({ error: '알 수 없는 주문입니다' }, { status: 400 })
  } catch (error) {
    console.error(JSON.stringify({ tag: 'pay', phase: 'confirm', err: error instanceof Error ? error.message : 'error' }))
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
