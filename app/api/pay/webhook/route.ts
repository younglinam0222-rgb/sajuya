import { NextRequest, NextResponse } from 'next/server'
import { confirmChargeOrder, confirmDepositCallback } from '@/lib/chargeOrders'
import { isChargeOrderId } from '@/lib/chargePackages'

export async function POST(req: NextRequest) {
  const raw = await req.text()
  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const eventId = req.headers.get('tosspayments-webhook-transmission-id')
    || (typeof body.eventId === 'string' ? body.eventId : null)
  const eventType = typeof body.eventType === 'string' ? body.eventType : ''

  try {
    if (eventType === 'PAYMENT_STATUS_CHANGED' || !eventType && body.data) {
      const data = (body.data && typeof body.data === 'object' ? body.data : body) as Record<string, unknown>
      const orderId = typeof data.orderId === 'string' ? data.orderId : ''
      const paymentKey = typeof data.paymentKey === 'string' ? data.paymentKey : ''
      if (!isChargeOrderId(orderId) || !paymentKey) {
        return NextResponse.json({ ok: true, ignored: true })
      }
      const result = await confirmChargeOrder({
        orderId,
        paymentKey,
        clientAmount: 0,
        userId: '',
        source: 'webhook',
        eventId,
      })
      if (!result.ok && result.status >= 500) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    if (eventType === 'DEPOSIT_CALLBACK' || typeof body.secret === 'string') {
      const orderId = typeof body.orderId === 'string' ? body.orderId : ''
      const secret = typeof body.secret === 'string' ? body.secret : ''
      const status = typeof body.status === 'string' ? body.status : ''
      const paymentKey = typeof body.paymentKey === 'string' ? body.paymentKey : ''
      if (!isChargeOrderId(orderId) || !secret) {
        return NextResponse.json({ ok: true, ignored: true })
      }
      const result = await confirmDepositCallback({
        orderId,
        paymentKey,
        status,
        secret,
        eventId,
      })
      if (!result.ok && 'status' in result && result.status >= 500) {
        return NextResponse.json({ error: 'deposit handle failed' }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true, ignored: true })
  } catch (e) {
    console.error(JSON.stringify({ tag: 'pay', phase: 'webhook', err: e instanceof Error ? e.message : 'error' }))
    return NextResponse.json({ error: 'webhook error' }, { status: 500 })
  }
}
