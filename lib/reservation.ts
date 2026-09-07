import { randomUUID } from 'crypto'
import { SAJU_UNLOCK_NYANG } from './pricing'
import { chooseDebitBuckets, type BalanceSnap, type DebitBuckets } from './yeobjeunSpend'

export type ReservationStatus = 'reserved' | 'generating' | 'completed' | 'expired'

export function reservationTtlMs(envValue = process.env.RESERVATION_TTL_SECONDS) {
  const sec = Number(envValue ?? '600')
  if (!Number.isFinite(sec) || sec < 60 || sec > 3600) return 600_000
  return Math.floor(sec) * 1000
}

export type Reservation = {
  id: string
  shareId: string
  userId: string
  jobId: string
  status: ReservationStatus
  reservedAt: number
  expiresAt: number
  completedAt: number | null
  releasedAt: number | null
  releaseReason: string | null
  buckets: DebitBuckets
}

export class InMemoryReservationStore {
  reservations = new Map<string, Reservation>()
  balances = new Map<string, BalanceSnap>()
  paidShares = new Set<string>()
  owners = new Map<string, string>()
  freeReady = new Set<string>()
  events: { at: number; jobId: string; type: string; reason?: string }[] = []
  now = 0
  lock = Promise.resolve()

  constructor(now = 1_000_000) {
    this.now = now
  }

  private async withLock<T>(fn: () => T): Promise<T> {
    let release: () => void
    const wait = new Promise<void>(resolve => { release = resolve })
    const prev = this.lock
    this.lock = this.lock.then(() => wait)
    await prev
    try {
      return fn()
    } finally {
      release!()
    }
  }

  private activeForShare(shareId: string) {
    return [...this.reservations.values()].find(r =>
      r.shareId === shareId && (r.status === 'reserved' || r.status === 'generating' || r.status === 'completed'),
    )
  }

  async reserve(shareId: string, userId: string, ttlMs = reservationTtlMs('600')) {
    return this.withLock(() => {
      if (this.owners.get(shareId) !== userId) return { ok: false as const, code: 'forbidden' }
      if (this.paidShares.has(shareId)) return { ok: true as const, code: 'already_completed' }
      if (!this.freeReady.has(shareId)) return { ok: false as const, code: 'empty_result' }
      const existing = this.activeForShare(shareId)
      if (existing?.status === 'completed') return { ok: true as const, code: 'already_completed', jobId: existing.jobId }
      if (existing && (existing.status === 'reserved' || existing.status === 'generating') && existing.expiresAt > this.now) {
        const jobId = randomUUID().replace(/-/g, '')
        existing.jobId = jobId
        existing.status = 'generating'
        this.events.push({ at: this.now, jobId, type: 'job_bumped' })
        return { ok: true as const, code: 'reused', jobId, expiresAt: existing.expiresAt }
      }
      if (existing && existing.expiresAt <= this.now) {
        this.expireOne(existing, 'expired_before_new_reserve')
      }
      const bal = this.balances.get(userId) ?? { total: 0, paid: 0, bonus: 0 }
      const buckets = chooseDebitBuckets(bal)
      if (!buckets) return { ok: false as const, code: 'insufficient' }
      this.balances.set(userId, {
        total: bal.total - SAJU_UNLOCK_NYANG,
        paid: bal.paid - buckets.paid,
        bonus: bal.bonus - buckets.bonus,
      })
      const jobId = randomUUID().replace(/-/g, '')
      const row: Reservation = {
        id: randomUUID(),
        shareId,
        userId,
        jobId,
        status: 'reserved',
        reservedAt: this.now,
        expiresAt: this.now + ttlMs,
        completedAt: null,
        releasedAt: null,
        releaseReason: null,
        buckets,
      }
      this.reservations.set(row.id, row)
      this.events.push({ at: this.now, jobId, type: 'reserved' })
      return { ok: true as const, code: 'reserved', jobId, expiresAt: row.expiresAt }
    })
  }

  async complete(jobId: string) {
    return this.withLock(() => {
      const row = [...this.reservations.values()].find(r => r.jobId === jobId)
      if (!row) return { ok: false as const, code: 'unknown_job' }
      if (row.status === 'completed') return { ok: true as const, code: 'already_completed' }
      if ((row.status === 'reserved' || row.status === 'generating') && row.expiresAt <= this.now) {
        this.expireOne(row, 'expired_on_complete')
      }
      if (row.status === 'expired') {
        this.events.push({ at: this.now, jobId, type: 'late_complete_discarded', reason: 'already_expired' })
        return { ok: false as const, code: 'discarded' }
      }
      if (row.status !== 'reserved' && row.status !== 'generating') {
        return { ok: false as const, code: 'discarded' }
      }
      row.status = 'completed'
      row.completedAt = this.now
      this.paidShares.add(row.shareId)
      this.events.push({ at: this.now, jobId, type: 'completed' })
      return { ok: true as const, code: 'completed' }
    })
  }

  async expireDue() {
    return this.withLock(() => {
      let n = 0
      for (const row of this.reservations.values()) {
        if ((row.status === 'reserved' || row.status === 'generating') && row.expiresAt <= this.now) {
          this.expireOne(row, 'expired')
          n += 1
        }
      }
      return n
    })
  }

  private expireOne(row: Reservation, reason: string) {
    if (row.status === 'completed') return
    if (row.status === 'expired') return
    row.status = 'expired'
    row.releasedAt = this.now
    row.releaseReason = reason
    const bal = this.balances.get(row.userId) ?? { total: 0, paid: 0, bonus: 0 }
    this.balances.set(row.userId, {
      total: bal.total + SAJU_UNLOCK_NYANG,
      paid: bal.paid + row.buckets.paid,
      bonus: bal.bonus + row.buckets.bonus,
    })
    this.events.push({ at: this.now, jobId: row.jobId, type: 'expired', reason })
  }
}
