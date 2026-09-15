import { SAJU_UNLOCK_NYANG } from './pricing'

export type DebitBuckets = {
  unclassified: number
  paid: number
  bonus: number
}

export type BalanceSnap = {
  total: number
  paid: number
  bonus: number
}

/**
 * 유상·보너스가 둘 다 남아 1냥을 어느 쪽에서 뗄지는 운영 미결정.
 * 이 값은 환불/회수 정책이 아니라, 잔액 컬럼 합이 총잔액과 맞게 남기기 위한 임시 회계다.
 * 보너스 우선을 정책으로 채택하지 않는다.
 */
export const ACCOUNTING_TIEBREAK = 'paid_then_bonus' as const

export function unclassifiedRemainder(b: BalanceSnap) {
  return Math.max(0, b.total - b.paid - b.bonus)
}

/** 1냥 차감 배분. 구분 불명 잔액을 먼저 쓴다. */
export function chooseDebitBuckets(b: BalanceSnap, amount = SAJU_UNLOCK_NYANG): DebitBuckets | null {
  if (amount <= 0 || b.total < amount) return null
  const unclassified = unclassifiedRemainder(b)
  let need = amount
  const out: DebitBuckets = { unclassified: 0, paid: 0, bonus: 0 }

  const takeUnc = Math.min(unclassified, need)
  out.unclassified = takeUnc
  need -= takeUnc
  if (need === 0) return out

  const paidLeft = b.paid
  const bonusLeft = b.bonus
  if (paidLeft >= need && bonusLeft === 0) {
    out.paid = need
    return out
  }
  if (bonusLeft >= need && paidLeft === 0) {
    out.bonus = need
    return out
  }
  if (ACCOUNTING_TIEBREAK === 'paid_then_bonus') {
    const takePaid = Math.min(paidLeft, need)
    out.paid = takePaid
    need -= takePaid
    if (need > 0) {
      if (bonusLeft < need) return null
      out.bonus = need
    }
    return out
  }
  return null
}

export type SpendCode =
  | 'unlocked'
  | 'already_unlocked'
  | 'insufficient'
  | 'not_found'
  | 'forbidden'
  | 'empty_result'
  | 'restored'
  | 'already_restored'
  | 'restore_refused'
  | 'failed'

export type SpendResult = {
  ok: boolean
  code: SpendCode
  buckets?: DebitBuckets
  balance?: BalanceSnap
  message?: string
}

type ReadingRow = {
  shareId: string
  userId: string
  isPaid: boolean
  hasResult: boolean
  restored: boolean
}

/** 테스트용: unique(share_id) + 잔액 차감을 한 트랜잭션처럼 묶는다. */
export class InMemorySpendStore {
  unlocks = new Map<string, DebitBuckets>()
  restored = new Set<string>()
  balances = new Map<string, BalanceSnap>()
  readings = new Map<string, ReadingRow>()
  lock = Promise.resolve()

  seedUser(userId: string, balance: BalanceSnap) {
    this.balances.set(userId, { ...balance })
  }

  seedReading(row: ReadingRow) {
    this.readings.set(row.shareId, { ...row })
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

  async unlock(shareId: string, userId: string): Promise<SpendResult> {
    return this.withLock(() => {
      const reading = this.readings.get(shareId)
      if (!reading) return { ok: false, code: 'not_found' }
      if (reading.userId !== userId) return { ok: false, code: 'forbidden' }
      if (reading.isPaid || this.unlocks.has(shareId)) {
        reading.isPaid = true
        return { ok: true, code: 'already_unlocked', balance: this.balances.get(userId) }
      }
      if (!reading.hasResult) return { ok: false, code: 'empty_result' }
      const bal = this.balances.get(userId) ?? { total: 0, paid: 0, bonus: 0 }
      const buckets = chooseDebitBuckets(bal)
      if (!buckets) return { ok: false, code: 'insufficient', balance: bal }
      this.unlocks.set(shareId, buckets)
      this.balances.set(userId, {
        total: bal.total - SAJU_UNLOCK_NYANG,
        paid: bal.paid - buckets.paid,
        bonus: bal.bonus - buckets.bonus,
      })
      reading.isPaid = true
      return { ok: true, code: 'unlocked', buckets, balance: this.balances.get(userId) }
    })
  }

  async restore(shareId: string, reason: 'generation_failed' | 'empty_result'): Promise<SpendResult> {
    return this.withLock(() => {
      const reading = this.readings.get(shareId)
      if (!reading) return { ok: false, code: 'not_found' }
      if (this.restored.has(shareId)) return { ok: true, code: 'already_restored' }
      const buckets = this.unlocks.get(shareId)
      if (!buckets) return { ok: false, code: 'restore_refused', message: 'no_unlock' }
      if (reading.hasResult && reason !== 'generation_failed') {
        return { ok: false, code: 'restore_refused', message: 'content_already_delivered' }
      }
      if (reading.hasResult && reason === 'generation_failed') {
        return { ok: false, code: 'restore_refused', message: 'content_already_delivered' }
      }
      const bal = this.balances.get(reading.userId) ?? { total: 0, paid: 0, bonus: 0 }
      this.balances.set(reading.userId, {
        total: bal.total + SAJU_UNLOCK_NYANG,
        paid: bal.paid + buckets.paid,
        bonus: bal.bonus + buckets.bonus,
      })
      reading.isPaid = false
      this.restored.add(shareId)
      this.unlocks.delete(shareId)
      return { ok: true, code: 'restored', buckets, balance: this.balances.get(reading.userId) }
    })
  }
}
