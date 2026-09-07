import {
  DailyQuotaStore,
  DailyUsageRow,
  UniqueViolationError,
} from '@/lib/dailyQuota'

type Reading = { characterId: string; manse: unknown; result: unknown }

/** Postgres 부분 유니크·잔액 차감과 같은 규칙을 메모리에서 재현. 테스트 전용. */
export class MemoryDailyQuotaStore implements DailyQuotaStore {
  rows: DailyUsageRow[] = []
  readings = new Map<string, Reading>()
  balances = new Map<string, number>()
  private chain: Promise<unknown> = Promise.resolve()

  constructor(balances?: Record<string, number>) {
    if (balances) {
      for (const [id, n] of Object.entries(balances)) this.balances.set(id, n)
    }
  }

  private tx<T>(fn: () => T): Promise<T> {
    const run = this.chain.then(() => fn(), () => fn())
    this.chain = run.then(() => undefined, () => undefined)
    return run
  }

  private readingKey(userId: string, usageDate: string) {
    return `${userId}:${usageDate}`
  }

  expireStale(now: Date): Promise<number> {
    return this.tx(() => {
      let n = 0
      for (const row of this.rows) {
        const expiredPending = row.status === 'pending' && row.expires_at && new Date(row.expires_at).getTime() < now.getTime()
        const unpaidFailed = row.kind === 'paid' && row.nyang_charged > 0 && !row.refunded && row.status === 'failed'
        if (!expiredPending && !unpaidFailed) continue
        if (expiredPending) {
          row.status = 'failed'
          row.failed_at = now.toISOString()
          row.expires_at = null
        }
        if (row.kind === 'paid' && row.nyang_charged > 0 && !row.refunded) {
          this.balances.set(row.user_id, (this.balances.get(row.user_id) ?? 0) + row.nyang_charged)
          row.refunded = true
        }
        n += 1
      }
      return n
    })
  }

  getByRequestId(requestId: string): Promise<DailyUsageRow | null> {
    return this.tx(() => this.rows.find(r => r.request_id === requestId) ?? null)
  }

  getActiveFree(userId: string, usageDate: string): Promise<DailyUsageRow | null> {
    return this.tx(() =>
      this.rows.find(r =>
        r.user_id === userId
        && r.usage_date === usageDate
        && r.kind === 'free'
        && (r.status === 'pending' || r.status === 'completed'),
      ) ?? null,
    )
  }

  insert(row: DailyUsageRow): Promise<DailyUsageRow> {
    return this.tx(() => {
      if (this.rows.some(r => r.request_id === row.request_id)) {
        throw new UniqueViolationError('request_id')
      }
      if (row.kind === 'free' && (row.status === 'pending' || row.status === 'completed')) {
        const clash = this.rows.some(r =>
          r.user_id === row.user_id
          && r.usage_date === row.usage_date
          && r.kind === 'free'
          && (r.status === 'pending' || r.status === 'completed'),
        )
        if (clash) throw new UniqueViolationError('free_active')
      }
      const copy = { ...row }
      this.rows.push(copy)
      return copy
    })
  }

  update(id: string, patch: Partial<DailyUsageRow>): Promise<DailyUsageRow> {
    return this.tx(() => {
      const row = this.rows.find(r => r.id === id)
      if (!row) throw new Error('usage not found')
      const next: DailyUsageRow = { ...row, ...patch, id: row.id }
      if (next.kind === 'free' && (next.status === 'pending' || next.status === 'completed')) {
        const clash = this.rows.some(r =>
          r.id !== id
          && r.user_id === next.user_id
          && r.usage_date === next.usage_date
          && r.kind === 'free'
          && (r.status === 'pending' || r.status === 'completed'),
        )
        if (clash) throw new UniqueViolationError('free_active')
      }
      Object.assign(row, next)
      return { ...row }
    })
  }

  deductNyang(userId: string, amount: number) {
    return this.tx(() => {
      const bal = this.balances.get(userId) ?? 0
      if (bal < amount) return { ok: false as const }
      this.balances.set(userId, bal - amount)
      return { ok: true as const, balance: bal - amount }
    })
  }

  refundNyang(userId: string, amount: number) {
    return this.tx(() => {
      this.balances.set(userId, (this.balances.get(userId) ?? 0) + amount)
    })
  }

  claimRefund(id: string) {
    return this.tx(() => {
      const row = this.rows.find(r => r.id === id)
      if (!row || row.kind !== 'paid' || row.nyang_charged <= 0 || row.refunded) return 0
      this.balances.set(row.user_id, (this.balances.get(row.user_id) ?? 0) + row.nyang_charged)
      row.refunded = true
      return row.nyang_charged
    })
  }

  saveFreeReading(input: {
    userId: string
    usageDate: string
    characterId: string
    manse: unknown
    result: unknown
  }) {
    return this.tx(() => {
      this.readings.set(this.readingKey(input.userId, input.usageDate), {
        characterId: input.characterId,
        manse: input.manse,
        result: input.result,
      })
    })
  }

  getFreeReading(userId: string, usageDate: string) {
    return this.tx(() => this.readings.get(this.readingKey(userId, usageDate)) ?? null)
  }
}
