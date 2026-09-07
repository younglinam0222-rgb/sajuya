export type GrantCode = 'granted' | 'already_granted' | 'order_not_found' | 'failed'

export type GrantResult = {
  ok: boolean
  code: GrantCode
  paidNyang?: number
  bonusNyang?: number
  message?: string
}

/** 테스트용: unique(order_id) + 잔액 증가를 한 트랜잭션처럼 묶는다. */
export class InMemoryGrantStore {
  grants = new Set<string>()
  balances = new Map<string, { total: number; paid: number; bonus: number }>()
  lock = Promise.resolve()

  async grant(orderId: string, userId: string, paidNyang: number, bonusNyang: number): Promise<GrantResult> {
    let release: () => void
    const wait = new Promise<void>(resolve => { release = resolve })
    const prev = this.lock
    this.lock = this.lock.then(() => wait)
    await prev
    try {
      if (this.grants.has(orderId)) {
        return { ok: true, code: 'already_granted', paidNyang, bonusNyang }
      }
      this.grants.add(orderId)
      const cur = this.balances.get(userId) ?? { total: 0, paid: 0, bonus: 0 }
      this.balances.set(userId, {
        total: cur.total + paidNyang + bonusNyang,
        paid: cur.paid + paidNyang,
        bonus: cur.bonus + bonusNyang,
      })
      return { ok: true, code: 'granted', paidNyang, bonusNyang }
    } finally {
      release!()
    }
  }
}

export function shouldGrantForTossStatus(status: string) {
  return status === 'DONE'
}

export function shouldSkipGrantForTossStatus(status: string) {
  return status === 'CANCELED' || status === 'EXPIRED' || status === 'ABORTED' || status === 'PARTIAL_CANCELED'
}

export function confirmAmountMatches(stored: number, clientAmount: number, tossAmount: number) {
  return stored === clientAmount && stored === tossAmount
}
