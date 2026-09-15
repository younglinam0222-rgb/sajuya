import assert from 'node:assert/strict'
import { describeBirthTime, hourForManse, normalizeTimeMode, parseExactHourMinute } from '../lib/birthTime'
import { lunarToSolar, toSolarBirthDate } from '../lib/lunarDate'
import { maritalStatusLabel, normalizeMaritalStatus, normalizeRelationship, resolveOccupation } from '../lib/profileOptions'
import { hasEntertainmentConsent } from '../lib/entertainmentConsent'
import { resolveBirthFromRequest } from '../lib/birthInput'
import { buildServiceContextPrompt } from '../lib/serviceContextPrompt'
import { SERVICE_PRICE_NYANG, formatNyangWon, servicePriceBadge } from '../lib/priceDisplay'
import { formatHeldNyang, formatNyang, nativeKoreanCount } from '../lib/nyangDisplay'
import { contentNoticeHref, safeNextPath } from '../lib/safeNextPath'

function ok(name: string, cond: boolean) {
  assert.equal(cond, true, name)
  console.log('ok', name)
}

ok('marital display maps 이혼·사별 to 이혼/사별', normalizeMaritalStatus('이혼·사별') === '이혼/사별')
ok('marital server value stays 이혼/사별', normalizeMaritalStatus('이혼/사별') === '이혼/사별')
ok('marital label is 이혼·사별', maritalStatusLabel('이혼/사별') === '이혼·사별')
ok('occupation custom kept', resolveOccupation('요리사') === '요리사')
ok('relationship 기타 maps to 기타·미정', normalizeRelationship('기타') === '기타·미정')

ok('exact hour parsed', parseExactHourMinute('9:05') === '09:05')
ok('unknown mode no hour for manse', hourForManse('unknown', '12:00') === '')
ok('period mode no hour for manse', hourForManse('period', '03:00') === '')
ok('exact mode uses hour', hourForManse('exact', '07:30') === '07:30')
ok('period description does not claim exact time', describeBirthTime('period', null, 'dawn').includes('정확한 출생시각 아님'))
ok('infer exact from HH:MM if mode missing', normalizeTimeMode(undefined, '08:00') === 'exact')

const lunar = lunarToSolar(1990, 1, 1, false)
ok('lunar conversion returns solar date', !('error' in lunar) && lunar.year === 1990 && lunar.month === 1 && lunar.day === 27)

const leapFail = toSolarBirthDate({ year: 1990, month: 1, day: 1, calType: 'lunar', isLeapMonth: true })
ok('invalid leap month rejected', 'error' in leapFail)

const resolvedUnknown = resolveBirthFromRequest({
  year: '1990', month: '1', day: '1', calType: 'solar', timeMode: 'unknown', birthPlace: '서울/경기',
})
ok('unknown time has empty hour', !('error' in resolvedUnknown) && resolvedUnknown.hourMinute === '')
ok('unknown time ignores birthplace longitude', !('error' in resolvedUnknown) && resolvedUnknown.longitude === undefined)

const resolvedExact = resolveBirthFromRequest({
  year: '1990', month: '1', day: '1', calType: 'solar', timeMode: 'exact', hour: '08:30', birthPlace: '부산',
})
ok('exact time keeps hour', !('error' in resolvedExact) && resolvedExact.hourMinute === '08:30')
ok('exact time uses birthplace longitude', !('error' in resolvedExact) && typeof resolvedExact.longitude === 'number')

ok('consent default false', hasEntertainmentConsent(undefined) === false)
ok('consent true only for boolean true', hasEntertainmentConsent(true) === true)
ok('consent rejects "true" string', hasEntertainmentConsent('true') === false)

const gunghapPrompt = buildServiceContextPrompt({
  service: 'gunghap',
  maritalStatus: '기혼',
  occupation: '직장인',
  relationship: '친구',
  partnerMaritalStatus: '기혼',
  partnerOccupation: '사업가',
})
ok('gunghap does not assume spouses from dual 기혼', gunghapPrompt.includes("관계가 '배우자'가 아니면 부부로 단정하지 마라"))
ok('gunghap forbids affair inference', gunghapPrompt.includes('불륜'))

const dailyPrompt = buildServiceContextPrompt({ service: 'daily', maritalStatus: '기혼', occupation: '직장인' })
const daeunPrompt = buildServiceContextPrompt({ service: 'daeun', maritalStatus: '기혼', occupation: '직장인' })
ok('daily and daeun marital copy are not identical', dailyPrompt !== daeunPrompt)

ok('price saju 한냥', servicePriceBadge('saju') === '한냥' && SERVICE_PRICE_NYANG.saju === 1)
ok('price gunghap 한냥', SERVICE_PRICE_NYANG.gunghap === 1)
ok('price daeun 한냥', SERVICE_PRICE_NYANG.daeun === 1)
ok('price taekil 한냥', SERVICE_PRICE_NYANG.taekil === 1)
ok('price yearly 한냥', SERVICE_PRICE_NYANG.yearly === 1)
ok('price daily 한냥 extra', SERVICE_PRICE_NYANG.daily === 1)
ok('daily badge is free first', servicePriceBadge('daily') === '하루 1회 무료')
ok('display conversion 1900', formatNyangWon(2) === '두냥 (3,800원)')
ok('nyang native 1-5', formatNyang(1) === '한냥' && formatNyang(2) === '두냥' && formatNyang(3) === '세냥' && formatNyang(4) === '네냥' && formatNyang(5) === '다섯냥')
ok('nyang 20 is 스무냥', formatNyang(20) === '스무냥' && nativeKoreanCount(21) === '스물한')
ok('nyang large balance', formatNyang(101) === '백한냥' && formatNyang(120) === '백스무냥')
ok('held zero', formatHeldNyang(0) === '보유 엽전 없음' && formatHeldNyang(1) === '보유 엽전: 한냥')
ok('charge after login next is kept', safeNextPath('/?open=charge') === '/?open=charge')
ok('content notice wraps charge return', contentNoticeHref('/?open=charge') === `/onboarding/content-notice?next=${encodeURIComponent('/?open=charge')}`)

console.log('all fortune-input tests passed')
