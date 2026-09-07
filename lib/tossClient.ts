import { isTossAlreadyProcessed, summarizeTossPayment, tossBasicAuth, type TossPaymentSummary } from './tossAuth'

function secret() {
  const key = process.env.TOSS_SECRET_KEY
  if (!key) throw new Error('toss_secret_missing')
  return key
}

export async function tossConfirmPayment(input: {
  paymentKey: string
  orderId: string
  amount: number
}): Promise<{ ok: true; payment: TossPaymentSummary; already: boolean } | { ok: false; status: number; code?: string; message: string }> {
  const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: tossBasicAuth(secret()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  const raw = await res.json() as Record<string, unknown>
  if (!res.ok) {
    if (isTossAlreadyProcessed(raw.code)) {
      const queried = await tossGetPayment(input.paymentKey)
      if (queried.ok) return { ok: true, payment: queried.payment, already: true }
    }
    return {
      ok: false,
      status: res.status,
      code: typeof raw.code === 'string' ? raw.code : undefined,
      message: typeof raw.message === 'string' ? raw.message : '결제 승인 실패',
    }
  }
  const payment = summarizeTossPayment(raw)
  if (!payment) return { ok: false, status: 502, message: '결제 응답 파싱 실패' }
  return { ok: true, payment, already: false }
}

export async function tossGetPayment(paymentKey: string): Promise<{ ok: true; payment: TossPaymentSummary } | { ok: false; message: string }> {
  const res = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`, {
    headers: { Authorization: tossBasicAuth(secret()) },
  })
  const raw = await res.json() as Record<string, unknown>
  if (!res.ok) {
    return { ok: false, message: typeof raw.message === 'string' ? raw.message : '결제 조회 실패' }
  }
  const payment = summarizeTossPayment(raw)
  if (!payment) return { ok: false, message: '결제 조회 파싱 실패' }
  return { ok: true, payment }
}

export async function tossGetPaymentByOrderId(orderId: string): Promise<{ ok: true; payment: TossPaymentSummary } | { ok: false; message: string }> {
  const res = await fetch(`https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: tossBasicAuth(secret()) },
  })
  const raw = await res.json() as Record<string, unknown>
  if (!res.ok) {
    return { ok: false, message: typeof raw.message === 'string' ? raw.message : '주문 결제 조회 실패' }
  }
  const payment = summarizeTossPayment(raw)
  if (!payment) return { ok: false, message: '주문 결제 조회 파싱 실패' }
  return { ok: true, payment }
}
