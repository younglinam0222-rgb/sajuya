import assert from 'node:assert/strict'
import {
  CHARGE_PACKAGE_VERSION,
  getSalePackage,
  LEGACY_CHARGE_PACKAGES,
  listSalePackages,
  totalNyang,
} from '../lib/chargePackages'
import {
  confirmAmountMatches,
  InMemoryGrantStore,
  shouldGrantForTossStatus,
  shouldSkipGrantForTossStatus,
} from '../lib/chargeGrant'
import { adminAuditAuthorized, sanitizeAudit } from '../lib/paymentAudit'
import {
  ACCOUNTING_TIEBREAK,
  chooseDebitBuckets,
  InMemorySpendStore,
} from '../lib/yeobjeunSpend'
import { redactUnpaidReading, titleIsFree } from '../lib/readingAccess'
import { SAJU_UNLOCK_NYANG } from '../lib/pricing'

function ok(name: string, cond: boolean) {
  assert.equal(cond, true, name)
  console.log('ok', name)
}

const sale = listSalePackages()
ok('three sale packages', sale.length === 3)
ok('1냥 1900 유상1 보너스0 총1', sale[0].id === 'nyang-1' && sale[0].amountKrw === 1900 && sale[0].paidNyang === 1 && sale[0].bonusNyang === 0 && totalNyang(sale[0]) === 1)
ok('5냥 9500 유상5 보너스1 총6', sale[1].id === 'nyang-5' && sale[1].amountKrw === 9500 && sale[1].paidNyang === 5 && sale[1].bonusNyang === 1 && totalNyang(sale[1]) === 6)
ok('10냥 19000 유상10 보너스2 총12', sale[2].id === 'nyang-10' && sale[2].amountKrw === 19000 && sale[2].paidNyang === 10 && sale[2].bonusNyang === 2 && totalNyang(sale[2]) === 12)
ok('sale version stamped', sale.every(p => p.version === CHARGE_PACKAGE_VERSION && p.forSale))

ok('legacy three not for sale', LEGACY_CHARGE_PACKAGES.some(p => p.id === 'three' && p.amountKrw === 4900 && !p.forSale))
ok('legacy one not for sale', LEGACY_CHARGE_PACKAGES.some(p => p.id === 'one' && !p.forSale))
ok('getSalePackage rejects three', getSalePackage('three') === null)
ok('getSalePackage rejects one', getSalePackage('one') === null)
ok('getSalePackage rejects unknown', getSalePackage('nyang-3') === null)

ok('amount match requires stored=client=toss', confirmAmountMatches(1900, 1900, 1900))
ok('tampered client amount fails', !confirmAmountMatches(1900, 100, 1900))
ok('tampered toss amount fails', !confirmAmountMatches(9500, 9500, 100))

ok('DONE grants', shouldGrantForTossStatus('DONE'))
ok('CANCELED skips', shouldSkipGrantForTossStatus('CANCELED'))
ok('EXPIRED skips', shouldSkipGrantForTossStatus('EXPIRED'))
ok('WAITING does not grant', !shouldGrantForTossStatus('WAITING_FOR_DEPOSIT'))

async function main() {
const store = new InMemoryGrantStore()
const first = await store.grant('yj_a', 'user1', 5, 1)
ok('first grant', first.code === 'granted')
const second = await store.grant('yj_a', 'user1', 5, 1)
ok('second grant is already', second.code === 'already_granted')
ok('balance granted once', JSON.stringify(store.balances.get('user1')) === JSON.stringify({ total: 6, paid: 5, bonus: 1 }))

const concurrent = new InMemoryGrantStore()
const raced = await Promise.all([
  concurrent.grant('yj_b', 'user2', 10, 2),
  concurrent.grant('yj_b', 'user2', 10, 2),
  concurrent.grant('yj_b', 'user2', 10, 2),
])
const grantedCount = raced.filter(r => r.code === 'granted').length
const alreadyCount = raced.filter(r => r.code === 'already_granted').length
ok('concurrent only one grant', grantedCount === 1 && alreadyCount === 2)
ok('concurrent balance once', JSON.stringify(concurrent.balances.get('user2')) === JSON.stringify({ total: 12, paid: 10, bonus: 2 }))

ok('admin key missing denied', adminAuditAuthorized('secretsecretsecret', undefined) === false)
ok('admin short key denied', adminAuditAuthorized('abcdefghijklmnop', 'short') === false)
ok('admin mismatch denied', adminAuditAuthorized('aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb') === false)
ok('admin match allowed', adminAuditAuthorized('sixteen-char-key', 'sixteen-char-key'))
ok('anon/empty admin denied', adminAuditAuthorized(null, 'sixteen-char-key') === false)

const audit = sanitizeAudit({
  source: 'webhook',
  eventId: 'whtrans_1',
  orderId: 'yj_x',
  paymentKey: 'pay_x',
  paymentStatus: 'DONE',
  amount: 1900,
  currency: 'KRW',
  verificationOk: true,
  verificationMethod: 'query_api',
  processResult: 'already_granted',
  failureReason: 'x'.repeat(500),
})
ok('audit truncates failure reason', (audit.failureReason || '').length === 180)
ok('audit has no raw body field', !('rawBody' in audit) && !('authorization' in audit))

ok('unlock cost is 1 nyang', SAJU_UNLOCK_NYANG === 1)
ok('sale names 5+1 and 10+2', sale[1].name === '5+1냥' && sale[2].name === '10+2냥')
ok('accounting tiebreak is not bonus-first', ACCOUNTING_TIEBREAK === 'paid_then_bonus')

ok('unclassified first from leftover total', JSON.stringify(chooseDebitBuckets({ total: 3, paid: 0, bonus: 0 })) === JSON.stringify({ unclassified: 1, paid: 0, bonus: 0 }))
ok('paid only uses paid', JSON.stringify(chooseDebitBuckets({ total: 5, paid: 5, bonus: 0 })) === JSON.stringify({ unclassified: 0, paid: 1, bonus: 0 }))
ok('bonus only uses bonus', JSON.stringify(chooseDebitBuckets({ total: 1, paid: 0, bonus: 1 })) === JSON.stringify({ unclassified: 0, paid: 0, bonus: 1 }))
ok('mixed paid+bonus uses paid for accounting', JSON.stringify(chooseDebitBuckets({ total: 6, paid: 5, bonus: 1 })) === JSON.stringify({ unclassified: 0, paid: 1, bonus: 0 }))
ok('insufficient null', chooseDebitBuckets({ total: 0, paid: 0, bonus: 0 }) === null)

const titles = [
  { is_free: true, title: 'a', content: 'A' },
  { is_free: false, title: 'b', content: 'B' },
  { is_free: false, title: 'c', content: 'C' },
]
ok('first flagged title free', titleIsFree(titles[0], 0, titles))
ok('paid title not free', !titleIsFree(titles[1], 1, titles))

const redacted = redactUnpaidReading({
  is_paid: false,
  ai_result: JSON.stringify({ titles: titles.map((t, i) => ({ id: String(i + 1), ...t })), strategy: { overview: 'hello world overview text here', warning: 'secret' }, personalAnswer: { question: 'q', answer: 'secret' } }),
})
const redactedParsed = JSON.parse(redacted.ai_result as string)
ok('redact keeps free content', redactedParsed.titles[0].content === 'A')
ok('redact strips paid content', redactedParsed.titles[1].content === '')
ok('redact strips personal answer', redactedParsed.personalAnswer.answer === '')
ok('paid reading not redacted', redactUnpaidReading({ is_paid: true, ai_result: '{"titles":[{"id":"1","content":"X"}]}' }).ai_result === '{"titles":[{"id":"1","content":"X"}]}')

const spend = new InMemorySpendStore()
spend.seedUser('u1', { total: 6, paid: 5, bonus: 1 })
spend.seedReading({ shareId: 'abc123456789', userId: 'u1', isPaid: false, hasResult: true, restored: false })
const unlocked = await spend.unlock('abc123456789', 'u1')
ok('spend once', unlocked.code === 'unlocked' && JSON.stringify(spend.balances.get('u1')) === JSON.stringify({ total: 5, paid: 4, bonus: 1 }))
const again = await spend.unlock('abc123456789', 'u1')
ok('spend idempotent', again.code === 'already_unlocked' && spend.balances.get('u1')!.total === 5)

const racedSpend = new InMemorySpendStore()
racedSpend.seedUser('u2', { total: 1, paid: 0, bonus: 0 })
racedSpend.seedReading({ shareId: 'race12345678', userId: 'u2', isPaid: false, hasResult: true, restored: false })
const racedUnlock = await Promise.all([
  racedSpend.unlock('race12345678', 'u2'),
  racedSpend.unlock('race12345678', 'u2'),
])
ok('concurrent spend once', racedUnlock.filter(r => r.code === 'unlocked').length === 1 && racedSpend.balances.get('u2')!.total === 0)

const empty = new InMemorySpendStore()
empty.seedUser('u3', { total: 1, paid: 0, bonus: 0 })
empty.seedReading({ shareId: 'empty1234567', userId: 'u3', isPaid: false, hasResult: false, restored: false })
ok('no debit without result', (await empty.unlock('empty1234567', 'u3')).code === 'empty_result' && empty.balances.get('u3')!.total === 1)

const genFail = new InMemorySpendStore()
genFail.seedUser('u4', { total: 1, paid: 0, bonus: 0 })
genFail.seedReading({ shareId: 'fail12345678', userId: 'u4', isPaid: false, hasResult: true, restored: false })
await genFail.unlock('fail12345678', 'u4')
genFail.readings.get('fail12345678')!.hasResult = false
const restored = await genFail.restore('fail12345678', 'generation_failed')
ok('restore after empty generation', restored.code === 'restored' && genFail.balances.get('u4')!.total === 1 && genFail.readings.get('fail12345678')!.isPaid === false)

const delivered = new InMemorySpendStore()
delivered.seedUser('u5', { total: 1, paid: 0, bonus: 0 })
delivered.seedReading({ shareId: 'ok1234567890', userId: 'u5', isPaid: false, hasResult: true, restored: false })
await delivered.unlock('ok1234567890', 'u5')
ok('no restore after delivery', (await delivered.restore('ok1234567890', 'generation_failed')).code === 'restore_refused')

console.log('all charge package tests passed')
}

main()
