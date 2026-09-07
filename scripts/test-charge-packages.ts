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

console.log('all charge package tests passed')
}

main()
