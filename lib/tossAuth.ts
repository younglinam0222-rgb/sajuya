export function tossBasicAuth(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`, 'utf8').toString('base64')}`
}

export type TossPaymentSummary = {
  paymentKey: string
  orderId: string
  status: string
  totalAmount: number
  currency: string
  secret?: string | null
}

export function summarizeTossPayment(raw: Record<string, unknown>): TossPaymentSummary | null {
  const paymentKey = typeof raw.paymentKey === 'string' ? raw.paymentKey : ''
  const orderId = typeof raw.orderId === 'string' ? raw.orderId : ''
  const status = typeof raw.status === 'string' ? raw.status : ''
  const totalAmount = typeof raw.totalAmount === 'number' ? raw.totalAmount
    : typeof raw.amount === 'number' ? raw.amount
    : NaN
  const currency = typeof raw.currency === 'string' ? raw.currency : 'KRW'
  if (!paymentKey || !orderId || !status || !Number.isFinite(totalAmount)) return null
  return {
    paymentKey,
    orderId,
    status,
    totalAmount,
    currency,
    secret: typeof raw.secret === 'string' ? raw.secret : null,
  }
}

export function isTossAlreadyProcessed(code: unknown) {
  return code === 'ALREADY_PROCESSED_PAYMENT'
}

export const TOSS_DONE = 'DONE'
export const TOSS_WAITING = 'WAITING_FOR_DEPOSIT'
export const TOSS_CANCELED = 'CANCELED'
export const TOSS_EXPIRED = 'EXPIRED'
export const TOSS_PARTIAL_CANCELED = 'PARTIAL_CANCELED'
export const TOSS_ABORTED = 'ABORTED'
