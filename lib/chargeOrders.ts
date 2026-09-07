import { randomUUID } from 'crypto'
import { createServerSupabase } from './supabase'
import { getSalePackage, totalNyang, type ChargePackage } from './chargePackages'
import { sanitizeAudit, type AuditEvent } from './paymentAudit'
import { shouldGrantForTossStatus, shouldSkipGrantForTossStatus, type GrantResult } from './chargeGrant'
import { tossConfirmPayment, tossGetPayment } from './tossClient'
import type { TossPaymentSummary } from './tossAuth'

export type ChargeOrderRow = {
  order_id: string
  user_id: string
  package_id: string
  package_version: string
  amount_krw: number
  currency: string
  paid_nyang: number
  bonus_nyang: number
  status: string
  grant_status: string
  payment_key: string | null
  va_secret: string | null
}

export function newChargeOrderId() {
  return `yj_${randomUUID().replace(/-/g, '')}`
}

export async function createChargeOrder(userId: string, packageId: unknown) {
  const pkg = getSalePackage(packageId)
  if (!pkg) return { ok: false as const, status: 400, error: '판매 중인 패키지가 아닙니다' }
  const supabase = createServerSupabase()
  const orderId = newChargeOrderId()
  const { error } = await supabase.from('charge_orders').insert({
    order_id: orderId,
    user_id: userId,
    package_id: pkg.id,
    package_version: pkg.version,
    amount_krw: pkg.amountKrw,
    currency: pkg.currency,
    paid_nyang: pkg.paidNyang,
    bonus_nyang: pkg.bonusNyang,
    status: 'pending',
    grant_status: 'none',
  })
  if (error) {
    console.error(JSON.stringify({ tag: 'charge', phase: 'create_order', code: error.code }))
    return { ok: false as const, status: 503, error: '주문을 저장할 수 없습니다' }
  }
  return { ok: true as const, orderId, pkg }
}

export async function loadChargeOrder(orderId: string): Promise<ChargeOrderRow | null> {
  const supabase = createServerSupabase()
  const { data } = await supabase.from('charge_orders').select('*').eq('order_id', orderId).maybeSingle()
  return data as ChargeOrderRow | null
}

async function writeAudit(event: AuditEvent) {
  try {
    const supabase = createServerSupabase()
    const row = sanitizeAudit(event)
    const { error } = await supabase.from('payment_audit_events').insert({
      source: row.source,
      event_id: row.eventId,
      order_id: row.orderId,
      payment_key: row.paymentKey,
      payment_status: row.paymentStatus,
      amount: row.amount,
      currency: row.currency,
      verification_ok: row.verificationOk,
      verification_method: row.verificationMethod,
      process_result: row.processResult,
      failure_reason: row.failureReason,
    })
    if (error && error.code !== '23505') {
      console.error(JSON.stringify({ tag: 'charge', phase: 'audit_write', code: error.code }))
    }
  } catch {
    console.error(JSON.stringify({ tag: 'charge', phase: 'audit_write', code: 'throw' }))
  }
}

export async function grantChargeOrder(orderId: string): Promise<GrantResult> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase.rpc('grant_yeobjeun_charge', { p_order_id: orderId })
  if (error) {
    console.error(JSON.stringify({ tag: 'charge', phase: 'grant', code: error.code }))
    return { ok: false, code: 'failed', message: '지급 처리에 실패했습니다' }
  }
  const row = data as { ok?: boolean; code?: string; paid_nyang?: number; bonus_nyang?: number }
  if (row?.code === 'already_granted') {
    return { ok: true, code: 'already_granted', paidNyang: row.paid_nyang, bonusNyang: row.bonus_nyang }
  }
  if (row?.code === 'granted' && row.ok) {
    return { ok: true, code: 'granted', paidNyang: row.paid_nyang, bonusNyang: row.bonus_nyang }
  }
  return { ok: false, code: 'failed', message: row?.code || '지급 실패' }
}

async function markPaid(order: ChargeOrderRow, payment: TossPaymentSummary, vaSecret?: string | null) {
  const supabase = createServerSupabase()
  await supabase.from('charge_orders').update({
    status: payment.status === 'WAITING_FOR_DEPOSIT' ? 'waiting_deposit' : 'paid',
    payment_key: payment.paymentKey,
    paid_at: payment.status === 'DONE' ? new Date().toISOString() : null,
    va_secret: vaSecret ?? order.va_secret,
  }).eq('order_id', order.order_id)
}

export async function confirmChargeOrder(input: {
  orderId: string
  paymentKey: string
  clientAmount: number
  userId: string
  source: 'confirm' | 'webhook' | 'grant_retry'
  eventId?: string | null
}) {
  const order = await loadChargeOrder(input.orderId)
  if (!order) {
    await writeAudit({
      source: input.source,
      eventId: input.eventId,
      orderId: input.orderId,
      paymentKey: input.paymentKey,
      verificationOk: false,
      verificationMethod: 'order_lookup',
      processResult: 'rejected',
      failureReason: 'order_not_found',
    })
    return { ok: false as const, status: 404, error: '주문을 찾을 수 없습니다' }
  }
  if ((input.source === 'confirm' || input.source === 'grant_retry') && order.user_id !== input.userId) {
    await writeAudit({
      source: input.source,
      eventId: input.eventId,
      orderId: input.orderId,
      paymentKey: input.paymentKey,
      verificationOk: false,
      verificationMethod: 'user_match',
      processResult: 'rejected',
      failureReason: 'user_mismatch',
    })
    return { ok: false as const, status: 403, error: '주문 소유자가 아닙니다' }
  }
  if ((input.source === 'confirm' || input.source === 'grant_retry') && input.clientAmount !== order.amount_krw) {
    await writeAudit({
      source: input.source,
      eventId: input.eventId,
      orderId: order.order_id,
      paymentKey: input.paymentKey,
      amount: input.clientAmount,
      currency: order.currency,
      verificationOk: false,
      verificationMethod: 'stored_amount',
      processResult: 'rejected',
      failureReason: 'amount_mismatch',
    })
    return { ok: false as const, status: 400, error: '결제 금액이 주문과 다릅니다' }
  }

  if (order.grant_status === 'granted') {
    await writeAudit({
      source: input.source,
      eventId: input.eventId,
      orderId: order.order_id,
      paymentKey: order.payment_key,
      paymentStatus: 'DONE',
      amount: order.amount_krw,
      currency: order.currency,
      verificationOk: true,
      verificationMethod: 'grant_status',
      processResult: 'already_granted',
    })
    return {
      ok: true as const,
      already: true,
      paidNyang: order.paid_nyang,
      bonusNyang: order.bonus_nyang,
      totalNyang: order.paid_nyang + order.bonus_nyang,
    }
  }

  let payment: TossPaymentSummary
  if (order.status === 'paid' && order.payment_key) {
    const queried = await tossGetPayment(order.payment_key)
    if (!queried.ok) {
      await writeAudit({
        source: input.source,
        eventId: input.eventId,
        orderId: order.order_id,
        paymentKey: order.payment_key,
        verificationOk: false,
        verificationMethod: 'query_api',
        processResult: 'failed',
        failureReason: 'query_failed',
      })
      return { ok: false as const, status: 502, error: '결제 상태를 확인하지 못했습니다', retryGrant: true }
    }
    payment = queried.payment
  } else if (input.source === 'grant_retry' && order.payment_key) {
    const queried = await tossGetPayment(order.payment_key)
    if (!queried.ok) return { ok: false as const, status: 502, error: '결제 상태를 확인하지 못했습니다', retryGrant: true }
    payment = queried.payment
  } else if (input.source === 'webhook') {
    const queried = await tossGetPayment(input.paymentKey)
    if (!queried.ok) {
      await writeAudit({
        source: 'webhook',
        eventId: input.eventId,
        orderId: order.order_id,
        paymentKey: input.paymentKey,
        verificationOk: false,
        verificationMethod: 'query_api',
        processResult: 'rejected',
        failureReason: 'query_failed',
      })
      return { ok: false as const, status: 502, error: '웹훅 결제 조회 실패' }
    }
    payment = queried.payment
  } else {
    const confirmed = await tossConfirmPayment({
      paymentKey: input.paymentKey,
      orderId: order.order_id,
      amount: order.amount_krw,
    })
    if (!confirmed.ok) {
      await writeAudit({
        source: input.source,
        eventId: input.eventId,
        orderId: order.order_id,
        paymentKey: input.paymentKey,
        amount: order.amount_krw,
        currency: order.currency,
        verificationOk: false,
        verificationMethod: 'confirm_api',
        processResult: 'rejected',
        failureReason: confirmed.code || confirmed.message,
      })
      return { ok: false as const, status: confirmed.status, error: confirmed.message }
    }
    payment = confirmed.payment
  }

  if (payment.orderId !== order.order_id || payment.totalAmount !== order.amount_krw || payment.currency !== order.currency) {
    await writeAudit({
      source: input.source,
      eventId: input.eventId,
      orderId: order.order_id,
      paymentKey: payment.paymentKey,
      paymentStatus: payment.status,
      amount: payment.totalAmount,
      currency: payment.currency,
      verificationOk: false,
      verificationMethod: 'query_api',
      processResult: 'rejected',
      failureReason: 'toss_order_mismatch',
    })
    return { ok: false as const, status: 400, error: '결제 정보가 주문과 다릅니다' }
  }

  if (shouldSkipGrantForTossStatus(payment.status)) {
    const supabase = createServerSupabase()
    await supabase.from('charge_orders').update({ status: payment.status.toLowerCase(), payment_key: payment.paymentKey }).eq('order_id', order.order_id)
    await writeAudit({
      source: input.source,
      eventId: input.eventId,
      orderId: order.order_id,
      paymentKey: payment.paymentKey,
      paymentStatus: payment.status,
      amount: payment.totalAmount,
      currency: payment.currency,
      verificationOk: true,
      verificationMethod: 'query_api',
      processResult: 'not_granted',
      failureReason: payment.status,
    })
    return { ok: false as const, status: 400, error: '결제가 완료되지 않았습니다' }
  }

  await markPaid(order, payment, payment.secret)

  if (payment.status === 'WAITING_FOR_DEPOSIT') {
    await writeAudit({
      source: input.source,
      eventId: input.eventId,
      orderId: order.order_id,
      paymentKey: payment.paymentKey,
      paymentStatus: payment.status,
      amount: payment.totalAmount,
      currency: payment.currency,
      verificationOk: true,
      verificationMethod: input.source === 'webhook' ? 'query_api' : 'confirm_api',
      processResult: 'waiting_deposit',
    })
    return { ok: true as const, waitingDeposit: true, paidNyang: 0, bonusNyang: 0, totalNyang: 0 }
  }

  if (!shouldGrantForTossStatus(payment.status)) {
    await writeAudit({
      source: input.source,
      eventId: input.eventId,
      orderId: order.order_id,
      paymentKey: payment.paymentKey,
      paymentStatus: payment.status,
      amount: payment.totalAmount,
      currency: payment.currency,
      verificationOk: true,
      verificationMethod: 'query_api',
      processResult: 'ignored_status',
    })
    return { ok: false as const, status: 409, error: '지급할 수 없는 결제 상태입니다', retryGrant: false }
  }

  const granted = await grantChargeOrder(order.order_id)
  await writeAudit({
    source: input.source,
    eventId: input.eventId,
    orderId: order.order_id,
    paymentKey: payment.paymentKey,
    paymentStatus: payment.status,
    amount: payment.totalAmount,
    currency: payment.currency,
    verificationOk: true,
    verificationMethod: input.source === 'webhook' ? 'query_api' : 'confirm_api',
    processResult: granted.code,
    failureReason: granted.ok ? null : granted.message,
  })

  if (granted.ok && granted.code === 'granted') {
    const { recordShareFunnel } = await import('./shareFunnel')
    await recordShareFunnel({ event: 'purchase_complete' })
  }

  if (!granted.ok) {
    return {
      ok: false as const,
      status: 500,
      error: '결제는 완료됐지만 엽전 지급에 실패했습니다. 다시 청구하지 말고 지급만 재시도하세요.',
      retryGrant: true,
      paidNyang: order.paid_nyang,
      bonusNyang: order.bonus_nyang,
    }
  }

  return {
    ok: true as const,
    already: granted.code === 'already_granted',
    paidNyang: order.paid_nyang,
    bonusNyang: order.bonus_nyang,
        totalNyang: order.paid_nyang + order.bonus_nyang,
  }
}

export async function confirmDepositCallback(input: {
  orderId: string
  paymentKey: string
  status: string
  secret: string
  eventId?: string | null
}) {
  const order = await loadChargeOrder(input.orderId)
  if (!order) {
    await writeAudit({
      source: 'webhook',
      eventId: input.eventId,
      orderId: input.orderId,
      paymentKey: input.paymentKey,
      paymentStatus: input.status,
      verificationOk: false,
      verificationMethod: 'deposit_secret',
      processResult: 'rejected',
      failureReason: 'order_not_found',
    })
    return { ok: false as const, status: 404 }
  }
  if (!order.va_secret || order.va_secret !== input.secret) {
    await writeAudit({
      source: 'webhook',
      eventId: input.eventId,
      orderId: order.order_id,
      paymentKey: input.paymentKey,
      paymentStatus: input.status,
      verificationOk: false,
      verificationMethod: 'deposit_secret',
      processResult: 'rejected',
      failureReason: 'secret_mismatch',
    })
    return { ok: false as const, status: 401 }
  }
  const queried = await tossGetPayment(input.paymentKey || order.payment_key || '')
  if (!queried.ok) return { ok: false as const, status: 502 }
  return confirmChargeOrder({
    orderId: order.order_id,
    paymentKey: queried.payment.paymentKey,
    clientAmount: order.amount_krw,
    userId: order.user_id,
    source: 'webhook',
    eventId: input.eventId,
  })
}

export function packageView(pkg: ChargePackage) {
  return {
    id: pkg.id,
    name: pkg.name,
    amountKrw: pkg.amountKrw,
    listPriceKrw: pkg.listPriceKrw,
    discountKrw: pkg.discountKrw,
    paidNyang: pkg.paidNyang,
    bonusNyang: pkg.bonusNyang,
    totalNyang: totalNyang(pkg),
  }
}
