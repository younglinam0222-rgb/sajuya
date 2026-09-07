import assert from 'node:assert/strict'
import { InMemoryReservationStore, reservationTtlMs } from '../lib/reservation'
import { keepFreeAiResult, mergePaidIntoFree, assessFreeStage, FREE_TITLE_IDS } from '../lib/sajuScope'

function ok(name: string, cond: boolean) {
  assert.equal(cond, true, name)
  console.log('ok', name)
}

ok('ttl default 10 minutes', reservationTtlMs(undefined) === 600_000)
ok('ttl clamp low', reservationTtlMs('10') === 600_000)
ok('ttl clamp high', reservationTtlMs('99999') === 600_000)
ok('ttl custom 120s', reservationTtlMs('120') === 120_000)

const freeRaw = JSON.stringify({
  titles: [
    { id: '1', category: '성격', content: 'free-1' },
    { id: '2', category: '재물운', content: 'free-2' },
    { id: '3', category: '애정운', content: 'free-3' },
    { id: '4', category: '직업운', content: 'PAID-SHOULD-STRIP' },
  ],
  strategy: { overview: 'secret strategy' },
  personalAnswer: { question: 'q', answer: 'secret' },
})
const stripped = JSON.parse(keepFreeAiResult(freeRaw))
ok('save strip paid titles', !stripped.titles.some((t: { id: string }) => t.id === '4'))
ok('save strip strategy', stripped.strategy === undefined)
ok('save strip personal answer', stripped.personalAnswer.answer === '')

const merged = JSON.parse(mergePaidIntoFree(keepFreeAiResult(freeRaw), {
  titles: [{ id: '4', category: '직업운', content: 'paid-4' }],
  strategy: { overview: 'paid-strategy' },
  personalAnswer: { question: 'q', answer: 'paid-answer' },
}))
ok('merge keeps free', merged.titles.find((t: { id: string }) => t.id === '1').content === 'free-1')
ok('merge adds paid', merged.titles.find((t: { id: string }) => t.id === '4').content === 'paid-4')
ok('merge strategy', merged.strategy.overview === 'paid-strategy')

ok('free ids 3', FREE_TITLE_IDS.length === 3)
ok('free stage complete', assessFreeStage({
  titles: [{ id: '1' }, { id: '2' }, { id: '3' }],
  receivedGroupIndexes: [0],
  gotDone: true,
}).complete)

async function main() {
  const store = new InMemoryReservationStore(1_000_000)
  store.owners.set('share1', 'u1')
  store.freeReady.add('share1')
  store.balances.set('u1', { total: 2, paid: 1, bonus: 0 })
  const reserved = await store.reserve('share1', 'u1', 600_000)
  ok('reserve ok', reserved.ok && reserved.code === 'reserved' && !!reserved.jobId)
  ok('debit on reserve', JSON.stringify(store.balances.get('u1')) === JSON.stringify({ total: 1, paid: 1, bonus: 0 }))

  store.now = reserved.expiresAt! - 1
  const before = await store.complete(reserved.jobId!)
  ok('complete just before expiry', before.code === 'completed')
  const expiredAfterComplete = await store.expireDue()
  ok('expire does not release completed', expiredAfterComplete === 0)
  ok('completed stays paid', store.paidShares.has('share1'))
  ok('completed keeps debit', store.balances.get('u1')!.total === 1)

  const late = new InMemoryReservationStore(1_000_000)
  late.owners.set('share2', 'u2')
  late.freeReady.add('share2')
  late.balances.set('u2', { total: 1, paid: 1, bonus: 0 })
  const r2 = await late.reserve('share2', 'u2', 600_000)
  late.now = r2.expiresAt! + 1
  const n = await late.expireDue()
  ok('expire after ttl', n === 1)
  ok('balance restored', late.balances.get('u2')!.total === 1)
  const lateComplete = await late.complete(r2.jobId!)
  ok('late complete discarded', lateComplete.code === 'discarded')
  ok('late complete not paid', !late.paidShares.has('share2'))
  ok('late complete no second debit', late.balances.get('u2')!.total === 1)
  ok('late complete event recorded', late.events.some(e => e.type === 'late_complete_discarded'))

  const dup = new InMemoryReservationStore(1_000_000)
  dup.owners.set('share3', 'u3')
  dup.freeReady.add('share3')
  dup.balances.set('u3', { total: 1, paid: 0, bonus: 0 })
  const r3 = await dup.reserve('share3', 'u3', 1000)
  dup.now = r3.expiresAt! + 1
  const firstExpire = await dup.expireDue()
  const secondExpire = await dup.expireDue()
  ok('duplicate expire once', firstExpire === 1 && secondExpire === 0)
  ok('duplicate expire restore once', dup.balances.get('u3')!.total === 1)

  const crash = new InMemoryReservationStore(1_000_000)
  crash.owners.set('share4', 'u4')
  crash.freeReady.add('share4')
  crash.balances.set('u4', { total: 1, paid: 0, bonus: 1 })
  const r4 = await crash.reserve('share4', 'u4', 600_000)
  crash.now = r4.expiresAt! + 5_000
  const recovered = await crash.expireDue()
  ok('crash recovery expires without client', recovered === 1 && crash.balances.get('u4')!.total === 1)
  ok('crash recovery reason recorded', crash.events.some(e => e.jobId === r4.jobId && e.type === 'expired'))

  const bump = new InMemoryReservationStore(1_000_000)
  bump.owners.set('share5', 'u5')
  bump.freeReady.add('share5')
  bump.balances.set('u5', { total: 1, paid: 1, bonus: 0 })
  const firstJob = await bump.reserve('share5', 'u5', 600_000)
  const second = await bump.reserve('share5', 'u5', 600_000)
  ok('retry bumps job', second.ok && second.code === 'reused' && second.jobId !== firstJob.jobId)
  ok('retry does not double debit', bump.balances.get('u5')!.total === 0)
  const oldDone = await bump.complete(firstJob.jobId!)
  ok('old job cannot complete after bump', oldDone.code === 'discarded' || oldDone.code === 'unknown_job')
  const newDone = await bump.complete(second.jobId!)
  ok('new job completes', newDone.code === 'completed')
  ok('new job paid once', bump.paidShares.has('share5'))

  const raceStore = new InMemoryReservationStore(1_000_000)
  raceStore.owners.set('share6', 'u6')
  raceStore.freeReady.add('share6')
  raceStore.balances.set('u6', { total: 1, paid: 1, bonus: 0 })
  const r6 = await raceStore.reserve('share6', 'u6', 600_000)
  raceStore.now = r6.expiresAt! - 1
  const raced = await Promise.all([raceStore.complete(r6.jobId!), raceStore.expireDue()])
  ok('complete just before expiry wins race', raced[0].code === 'completed' && raced[1] === 0 && raceStore.paidShares.has('share6'))

  const other = new InMemoryReservationStore(1_000_000)
  other.owners.set('share7', 'u7')
  other.freeReady.add('share7')
  other.balances.set('u7', { total: 1, paid: 0, bonus: 0 })
  ok('other account forbidden', (await other.reserve('share7', 'u8')).code === 'forbidden')

  console.log('all reservation tests passed')
}

main()
