import { kstDateString } from '../lib/kstDate'
import {
  DAILY_FREE_USED_MESSAGE,
  DAILY_IN_PROGRESS_MESSAGE,
  DAILY_LOGIN_REQUIRED_MESSAGE,
  DAILY_PAID_CONSENT_MESSAGE,
  DAILY_INSUFFICIENT_BALANCE_MESSAGE,
  PENDING_TTL_MS,
  completeDailyGeneration,
  failDailyGeneration,
  getDailyQuotaStatus,
  reserveDailyGeneration,
} from '../lib/dailyQuota'
import { MemoryDailyQuotaStore } from '../lib/dailyQuotaMemory'

function ok(name: string, cond: boolean) {
  if (!cond) throw new Error(`FAIL ${name}`)
  console.log('ok', name)
}

function kst(isoUtc: string) {
  return new Date(isoUtc)
}

async function main() {
  // KST = UTC+9. 2026-09-07 23:59:59 KST = 2026-09-07T14:59:59Z
  // 2026-09-08 00:00:00 KST = 2026-09-07T15:00:00Z
  ok('kst 23:59:59 stays on 2026-09-07', kstDateString(kst('2026-09-07T14:59:59.000Z')) === '2026-09-07')
  ok('kst 00:00:00 next day is 2026-09-08', kstDateString(kst('2026-09-07T15:00:00.000Z')) === '2026-09-08')

  const user = 'user-a'
  const beforeMidnight = kst('2026-09-07T14:59:59.000Z')
  const afterMidnight = kst('2026-09-07T15:00:01.000Z')

  const store = new MemoryDailyQuotaStore({ [user]: 5 })
  const first = await reserveDailyGeneration(store, {
    userId: user,
    requestId: 'req-free-1',
    now: beforeMidnight,
    confirmPaidRegenerate: false,
    paymentsEnabled: false,
  })
  ok('reserve free before midnight', first.ok === true && first.ok && first.usage.usage_date === '2026-09-07')

  await completeDailyGeneration(store, first.ok ? first.usage : ({} as never), {
    characterId: 'doRyeong',
    manse: { ok: true },
    result: { overall: 'keep' },
  }, afterMidnight)
  ok('complete after midnight still counts as receipt date', store.rows[0].usage_date === '2026-09-07' && store.rows[0].status === 'completed')

  const nextDay = await reserveDailyGeneration(store, {
    userId: user,
    requestId: 'req-free-next',
    now: afterMidnight,
    confirmPaidRegenerate: false,
    paymentsEnabled: false,
  })
  ok('next kst day can reserve again', nextDay.ok === true && nextDay.ok && nextDay.usage.usage_date === '2026-09-08')

  const sameDay = new MemoryDailyQuotaStore({ [user]: 5 })
  const a = await reserveDailyGeneration(sameDay, {
    userId: user, requestId: 'req-same-a', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: false,
  })
  const b = await reserveDailyGeneration(sameDay, {
    userId: user, requestId: 'req-same-b', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: false,
  })
  ok('second same-day request blocked', a.ok && !b.ok && b.ok === false && (b.code === 'IN_PROGRESS' || b.code === 'FREE_USED'))

  const conc = new MemoryDailyQuotaStore({ [user]: 5 })
  const [c1, c2] = await Promise.all([
    reserveDailyGeneration(conc, {
      userId: user, requestId: 'conc-req-1', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: false,
    }),
    reserveDailyGeneration(conc, {
      userId: user, requestId: 'conc-req-2', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: false,
    }),
  ])
  const reserved = [c1, c2].filter(r => r.ok)
  const blocked = [c1, c2].filter(r => !r.ok)
  ok('concurrent free: only one reserved', reserved.length === 1 && blocked.length === 1)
  ok('concurrent free rows', conc.rows.filter(r => r.kind === 'free' && r.status === 'pending').length === 1)

  const retryStore = new MemoryDailyQuotaStore({ [user]: 5 })
  const r1 = await reserveDailyGeneration(retryStore, {
    userId: user, requestId: 'retry-req-1', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: false,
  })
  ok('retry setup reserved', r1.ok)
  if (r1.ok) await failDailyGeneration(retryStore, r1.usage, beforeMidnight)
  ok('failed frees the slot', retryStore.rows[0].status === 'failed')
  const r2 = await reserveDailyGeneration(retryStore, {
    userId: user, requestId: 'retry-req-2', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: false,
  })
  ok('retry after failure allowed', r2.ok === true)

  const reviewStore = new MemoryDailyQuotaStore({ [user]: 5 })
  const rv = await reserveDailyGeneration(reviewStore, {
    userId: user, requestId: 'review-1', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: false,
  })
  if (!rv.ok) throw new Error('review reserve')
  await completeDailyGeneration(reviewStore, rv.usage, {
    characterId: 'doRyeong', manse: { m: 1 }, result: { overall: 'cached' },
  }, beforeMidnight)
  const beforeRows = reviewStore.rows.length
  const status1 = await getDailyQuotaStatus(reviewStore, user, beforeMidnight)
  const status2 = await getDailyQuotaStatus(reviewStore, user, beforeMidnight)
  ok('review does not insert usage', reviewStore.rows.length === beforeRows)
  ok('review returns cached result', !!(status1.hasCachedResult && status2.cached?.result && (status2.cached.result as { overall: string }).overall === 'cached'))
  ok('review cannot generate free again', status1.canGenerateFree === false)

  const dup = new MemoryDailyQuotaStore({ [user]: 5 })
  const d1 = await reserveDailyGeneration(dup, {
    userId: user, requestId: 'same-req', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: false,
  })
  const d2 = await reserveDailyGeneration(dup, {
    userId: user, requestId: 'same-req', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: false,
  })
  ok('duplicate in-flight request does not create second row', dup.rows.length === 1 && d1.ok && !d2.ok && d2.ok === false && d2.code === 'IN_PROGRESS')
  if (d1.ok) {
    await completeDailyGeneration(dup, d1.usage, { characterId: 'x', manse: {}, result: { overall: 'done' } }, beforeMidnight)
  }
  const d3 = await reserveDailyGeneration(dup, {
    userId: user, requestId: 'same-req', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: false,
  })
  ok('duplicate completed request is reused without new row', d3.ok && d3.ok && d3.reused && dup.rows.length === 1)

  const paidOff = new MemoryDailyQuotaStore({ [user]: 5 })
  const pFree = await reserveDailyGeneration(paidOff, {
    userId: user, requestId: 'paid-off-free', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: false,
  })
  if (pFree.ok) {
    await completeDailyGeneration(paidOff, pFree.usage, { characterId: 'x', manse: {}, result: { overall: 'free' } }, beforeMidnight)
  }
  const paidAttempt = await reserveDailyGeneration(paidOff, {
    userId: user, requestId: 'paid-off-paid', now: beforeMidnight, confirmPaidRegenerate: true, paymentsEnabled: false,
  })
  ok('payments disabled rejects paid regenerate', !paidAttempt.ok && paidAttempt.ok === false && paidAttempt.code === 'PAYMENTS_DISABLED')
  ok('payments disabled does not deduct', paidOff.balances.get(user) === 5)
  ok('payments disabled message', paidAttempt.ok === false && paidAttempt.error === DAILY_FREE_USED_MESSAGE)

  const paidOn = new MemoryDailyQuotaStore({ [user]: 5 })
  const pf = await reserveDailyGeneration(paidOn, {
    userId: user, requestId: 'paid-on-free', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: true,
  })
  if (pf.ok) {
    await completeDailyGeneration(paidOn, pf.usage, { characterId: 'x', manse: { free: 1 }, result: { overall: 'free-keep' } }, beforeMidnight)
  }
  const noConsent = await reserveDailyGeneration(paidOn, {
    userId: user, requestId: 'paid-on-no', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: true,
  })
  ok('paid regenerate requires explicit consent', !noConsent.ok && noConsent.ok === false && noConsent.code === 'FREE_USED')

  const paidOk = await reserveDailyGeneration(paidOn, {
    userId: user, requestId: 'paid-on-yes', now: beforeMidnight, confirmPaidRegenerate: true, paymentsEnabled: true,
  })
  ok('paid regenerate reserved', paidOk.ok === true)
  ok('paid deducts 1 nyang', paidOn.balances.get(user) === 4)
  const freeStill = paidOn.rows.find(r => r.kind === 'free' && r.status === 'completed')
  ok('paid does not overwrite free row', !!(freeStill?.result && (freeStill.result as { overall: string }).overall === 'free-keep'))
  ok('paid is a separate row', paidOn.rows.filter(r => r.kind === 'paid').length === 1)
  if (paidOk.ok) {
    await completeDailyGeneration(paidOn, paidOk.usage, { characterId: 'x', manse: { paid: 1 }, result: { overall: 'paid-new' } }, beforeMidnight)
  }
  ok('free cache unchanged after paid complete', (paidOn.readings.get(`${user}:2026-09-07`)?.result as { overall: string }).overall === 'free-keep')

  const refundStore = new MemoryDailyQuotaStore({ [user]: 3 })
  const rf = await reserveDailyGeneration(refundStore, {
    userId: user, requestId: 'refund-free', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: true,
  })
  if (rf.ok) {
    await completeDailyGeneration(refundStore, rf.usage, { characterId: 'x', manse: {}, result: { overall: 'free' } }, beforeMidnight)
  }
  const pr = await reserveDailyGeneration(refundStore, {
    userId: user, requestId: 'refund-1', now: beforeMidnight, confirmPaidRegenerate: true, paymentsEnabled: true,
  })
  ok('paid reserve for refund test', pr.ok && refundStore.balances.get(user) === 2)
  if (pr.ok) {
    await failDailyGeneration(refundStore, pr.usage, beforeMidnight)
    await failDailyGeneration(refundStore, pr.usage, beforeMidnight)
  }
  ok('failed paid refunds once', refundStore.balances.get(user) === 3)
  const paidRow = refundStore.rows.find(r => r.kind === 'paid')
  ok('refunded flag set', paidRow?.refunded === true)
  const secondClaim = await refundStore.claimRefund(paidRow!.id)
  ok('second refund is no-op', secondClaim === 0 && refundStore.balances.get(user) === 3)

  const stale = new MemoryDailyQuotaStore({ [user]: 2 })
  const st = await reserveDailyGeneration(stale, {
    userId: user, requestId: 'stale-req-1', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: false,
  })
  ok('stale pending reserved', st.ok)
  const expiredAt = new Date(beforeMidnight.getTime() + PENDING_TTL_MS + 1000)
  await stale.expireStale(expiredAt)
  ok('expired free pending becomes failed', stale.rows[0].status === 'failed')

  const afterExpire = await reserveDailyGeneration(stale, {
    userId: user, requestId: 'stale-req-2', now: expiredAt, confirmPaidRegenerate: false, paymentsEnabled: false,
  })
  ok('after expire free slot is available again', afterExpire.ok === true && afterExpire.ok && afterExpire.usage.kind === 'free')

  const paidExpire = new MemoryDailyQuotaStore({ [user]: 2 })
  const peFree = await reserveDailyGeneration(paidExpire, {
    userId: user, requestId: 'pe-free-1', now: beforeMidnight, confirmPaidRegenerate: false, paymentsEnabled: true,
  })
  if (peFree.ok) {
    await completeDailyGeneration(paidExpire, peFree.usage, { characterId: 'x', manse: {}, result: { overall: 'free' } }, beforeMidnight)
  }
  const pe = await reserveDailyGeneration(paidExpire, {
    userId: user, requestId: 'pe-paid-1', now: beforeMidnight, confirmPaidRegenerate: true, paymentsEnabled: true,
  })
  ok('paid pending charged', pe.ok && paidExpire.balances.get(user) === 1)
  await paidExpire.expireStale(new Date(beforeMidnight.getTime() + PENDING_TTL_MS + 1000))
  ok('expired paid pending refunds', paidExpire.balances.get(user) === 2 && paidExpire.rows.some(r => r.kind === 'paid' && r.status === 'failed' && r.refunded))

  ok('message constants present', !!(DAILY_FREE_USED_MESSAGE && DAILY_IN_PROGRESS_MESSAGE && DAILY_LOGIN_REQUIRED_MESSAGE && DAILY_PAID_CONSENT_MESSAGE && DAILY_INSUFFICIENT_BALANCE_MESSAGE))

  console.log('all daily-quota tests passed')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
