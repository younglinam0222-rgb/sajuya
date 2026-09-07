import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { isChargeOrderId } from '@/lib/chargePackages'
import { confirmChargeOrder, loadChargeOrder } from '@/lib/chargeOrders'

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.sub) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }
    const { orderId } = await req.json()
    if (typeof orderId !== 'string' || !isChargeOrderId(orderId)) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 400 })
    }
    const order = await loadChargeOrder(orderId)
    if (!order || order.user_id !== token.sub) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 })
    }
    if (!order.payment_key) {
      return NextResponse.json({ error: '아직 승인된 결제가 없습니다' }, { status: 409 })
    }
    const result = await confirmChargeOrder({
      orderId,
      paymentKey: order.payment_key,
      clientAmount: order.amount_krw,
      userId: token.sub,
      source: 'grant_retry',
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error, retryGrant: result.retryGrant === true }, { status: result.status })
    }
    return NextResponse.json({
      success: true,
      paidNyang: result.paidNyang,
      bonusNyang: result.bonusNyang,
      totalNyang: result.totalNyang,
      already: result.already === true,
    })
  } catch (e) {
    console.error(JSON.stringify({ tag: 'charge', phase: 'grant_retry', err: e instanceof Error ? e.message : 'error' }))
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
