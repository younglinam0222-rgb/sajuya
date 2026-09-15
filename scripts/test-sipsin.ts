import assert from 'node:assert/strict'
import {
  BRANCHES,
  BRANCH_HIDDEN_STEMS,
  BRANCH_MAIN_STEM_IDX,
  STEMS,
  calcManse,
  formatManseForPrompt,
  getBranchSipsinByMainQi,
  getStemSipsin,
  hourInputToHm,
  normalizeMaritalStatus,
  normalizeOccupation,
} from '../lib/sajuCalc'
import { findElementCountMismatches } from '../lib/elementCitationCheck'

function ok(name: string, cond: boolean) {
  assert.equal(cond, true, name)
  console.log('ok', name)
}

/**
 * 독립 기준표 (일간 행 × 대상 천간 열).
 * 오행 상생상극 + 음양 정편. 기존 getSipsin 함수 결과를 복사하지 않았다.
 */
const EXPECTED_STEM: string[][] = [
  // 甲
  ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'],
  // 乙
  ['겁재', '비견', '상관', '식신', '정재', '편재', '정관', '편관', '정인', '편인'],
  // 丙
  ['편인', '정인', '비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관'],
  // 丁
  ['정인', '편인', '겁재', '비견', '상관', '식신', '정재', '편재', '정관', '편관'],
  // 戊
  ['편관', '정관', '편인', '정인', '비견', '겁재', '식신', '상관', '편재', '정재'],
  // 己
  ['정관', '편관', '정인', '편인', '겁재', '비견', '상관', '식신', '정재', '편재'],
  // 庚
  ['편재', '정재', '편관', '정관', '편인', '정인', '비견', '겁재', '식신', '상관'],
  // 辛
  ['정재', '편재', '정관', '편관', '정인', '편인', '겁재', '비견', '상관', '식신'],
  // 壬
  ['식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인', '비견', '겁재'],
  // 癸
  ['상관', '식신', '정재', '편재', '정관', '편관', '정인', '편인', '겁재', '비견'],
]

ok('stem table 10x10', EXPECTED_STEM.length === 10 && EXPECTED_STEM.every(r => r.length === 10))

let stemPass = 0
for (let day = 0; day < 10; day++) {
  for (let target = 0; target < 10; target++) {
    const got = getStemSipsin(day, target)
    const exp = EXPECTED_STEM[day][target]
    assert.equal(got, exp, `${STEMS[day]} vs ${STEMS[target]} expected ${exp} got ${got}`)
    stemPass++
  }
}
ok('100 stem combinations', stemPass === 100)

let branchPass = 0
for (let day = 0; day < 10; day++) {
  for (let br = 0; br < 12; br++) {
    const got = getBranchSipsinByMainQi(day, br)
    const exp = getStemSipsin(day, BRANCH_MAIN_STEM_IDX[br])
    assert.equal(got, exp, `${STEMS[day]} vs branch ${BRANCHES[br]}`)
    branchPass++
  }
}
ok('120 branch main-qi combinations', branchPass === 120)

ok('巳 main qi is 丙 not 丁', BRANCH_MAIN_STEM_IDX[5] === 2)
ok('午 main qi is 丁 not 丙', BRANCH_MAIN_STEM_IDX[6] === 3)

const oldBrokenStem = (day: number, target: number) => {
  const SIPSIN = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인']
  return SIPSIN[(target - day + 10) % 10]
}
ok('old index formula disagrees on 癸 vs 壬', oldBrokenStem(9, 8) === '정인' && getStemSipsin(9, 8) === '겁재')
ok('old index formula disagrees on 癸 vs 丙', oldBrokenStem(9, 2) === '상관' && getStemSipsin(9, 2) === '정재')

const repro = calcManse(1986, 4, 19, '09:35')
ok('repro day stem 癸', repro.dayPillar.stem === '癸')
ok('repro year 丙寅', repro.yearPillar.stem === '丙' && repro.yearPillar.branch === '寅')
ok('repro month 壬辰', repro.monthPillar.stem === '壬' && repro.monthPillar.branch === '辰')
ok('repro day 癸巳', repro.dayPillar.branch === '巳')
ok('repro hour 丁巳', repro.hourPillar?.stem === '丁' && repro.hourPillar?.branch === '巳')
ok('repro year stem 정재 not 편인', repro.yearPillar.sipsinStem === '정재')
ok('repro month stem 겁재 not 정인', repro.monthPillar.sipsinStem === '겁재')
ok('repro day branch 정재 not 편재', repro.dayPillar.sipsinBranch === '정재')
ok('repro month branch 정관 not 정재', repro.monthPillar.sipsinBranch === '정관')
ok('repro visible 金 is 0', repro.elementCount['金'] === 0)
ok('repro visible 水 is 2', repro.elementCount['水'] === 2)
ok('repro visible 火 is 4', repro.elementCount['火'] === 4)
ok('hidden stems mention 금 without changing visible count', repro.hiddenStemNote.includes('경') || repro.hiddenStemNote.includes('신'))

const twoPeople = {
  a: calcManse(1990, 1, 15, '08:00'),
  b: calcManse(1988, 7, 20, '14:00'),
}
ok('gunghap uses each day stem', twoPeople.a.dayPillar.stem !== twoPeople.b.dayPillar.stem || twoPeople.a.yearPillar.sipsinStem === getStemSipsin(twoPeople.a.dayPillar.stemIdx, twoPeople.a.yearPillar.stemIdx))
ok('person B year sipsin is vs B day stem', twoPeople.b.yearPillar.sipsinStem === getStemSipsin(twoPeople.b.dayPillar.stemIdx, twoPeople.b.yearPillar.stemIdx))
ok('person A year sipsin is not computed from B', twoPeople.a.yearPillar.sipsinStem === getStemSipsin(twoPeople.a.dayPillar.stemIdx, twoPeople.a.yearPillar.stemIdx))

const mismatch = findElementCountMismatches('물은 딱 하나, 불은 네 개', { 木: 1, 火: 4, 土: 1, 金: 0, 水: 2 })
ok('detects water 하나 vs 2', mismatch.some(m => m.element === '水' && m.cited === 1 && m.expected === 2))
ok('fire 네 matches 4', !mismatch.some(m => m.element === '火'))
ok('metaphor not flagged', findElementCountMismatches('불같은 성격으로 일을 밀어붙인다', { 木: 1, 火: 4, 土: 1, 金: 0, 水: 2 }).length === 0)

ok('calcVersion stamped', repro.calcVersion.startsWith('sipsin-v2'))
ok('promptVersion stamped', !!repro.promptVersion)
ok('generatedDateKST stamped', /^\d{4}-\d{2}-\d{2}$/.test(repro.generatedDateKST))

for (let br = 0; br < 12; br++) {
  const hidden = BRANCH_HIDDEN_STEMS[br]
  assert.equal(hidden[hidden.length - 1], BRANCH_MAIN_STEM_IDX[br], `본기 last for ${BRANCHES[br]}`)
}
ok('hidden last stem is 본기 for all 12 branches', true)

const prompt = formatManseForPrompt(repro, '질문자')
ok('prompt uses same year sipsin', prompt.includes(`천간 십성 ${repro.yearPillar.sipsinStem}`))
ok('prompt uses same month sipsin', prompt.includes(`천간 십성 ${repro.monthPillar.sipsinStem}`))
ok('prompt cites visible water count', prompt.includes('물 2개'))
ok('prompt separates hidden stems', prompt.includes('지장간'))

const correctedHour = calcManse(1986, 4, 19, '09:03')
ok('09:03 still 丁巳 hour', correctedHour.hourPillar?.stem === '丁' && correctedHour.hourPillar?.branch === '巳')

ok('hourInputToHm 9 -> 09:00', hourInputToHm('9') === '09:00')
ok('hourInputToHm 09:35 kept', hourInputToHm('09:35') === '09:35')
ok('empty marital is 미상 not 솔로', normalizeMaritalStatus('') === '미상' && normalizeMaritalStatus(undefined) === '미상')
ok('기혼 kept', normalizeMaritalStatus('기혼') === '기혼')
ok('연애중 kept', normalizeMaritalStatus('연애중') === '연애중')
ok('미혼(솔로) kept', normalizeMaritalStatus('미혼(솔로)') === '미혼(솔로)')
ok('이혼/사별 kept', normalizeMaritalStatus('이혼/사별') === '이혼/사별')
ok('unknown marital not coerced to 솔로', normalizeMaritalStatus('기혼자') === '미상')
ok('empty occupation is 미입력', normalizeOccupation('') === '미입력' && normalizeOccupation(undefined) === '미입력')
ok('custom occupation kept', normalizeOccupation('요리사') === '요리사')

console.log('all sipsin tests passed')
