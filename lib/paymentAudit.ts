export type AuditEvent = {
  source: 'confirm' | 'webhook' | 'grant_retry'
  eventId?: string | null
  orderId?: string | null
  paymentKey?: string | null
  paymentStatus?: string | null
  amount?: number | null
  currency?: string | null
  verificationOk: boolean
  verificationMethod: string
  processResult: string
  failureReason?: string | null
}

export function sanitizeAudit(event: AuditEvent): AuditEvent {
  return {
    source: event.source,
    eventId: event.eventId ?? null,
    orderId: event.orderId ?? null,
    paymentKey: event.paymentKey ?? null,
    paymentStatus: event.paymentStatus ?? null,
    amount: event.amount ?? null,
    currency: event.currency ?? null,
    verificationOk: event.verificationOk,
    verificationMethod: event.verificationMethod,
    processResult: event.processResult,
    failureReason: event.failureReason ? String(event.failureReason).slice(0, 180) : null,
  }
}

export function adminAuditAuthorized(headerKey: string | null, envKey: string | undefined) {
  if (!envKey || envKey.length < 16) return false
  if (!headerKey) return false
  if (headerKey.length !== envKey.length) return false
  let mismatch = 0
  for (let i = 0; i < envKey.length; i++) {
    mismatch |= headerKey.charCodeAt(i) ^ envKey.charCodeAt(i)
  }
  return mismatch === 0
}
