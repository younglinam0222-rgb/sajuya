import LunarJS from 'lunar-javascript'
import { correctToTrueSolarTime } from './solarTime'

/** 신규 생성 결과에만 기록. 기존 저장본에는 기입하지 않는다. */
export const CALC_VERSION = 'sipsin-v2-20260907'
export const PROMPT_VERSION = 'interp-v2-20260907'

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
export const STEM_KR = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const
export const BRANCH_KR = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const
export const STEM_ELEMENT = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'] as const
export const BRANCH_ELEMENT = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'] as const
export const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'] as const

export type SipsinName = '비견' | '겁재' | '식신' | '상관' | '편재' | '정재' | '편관' | '정관' | '편인' | '정인'

/**
 * 지지 본기(정기) = 지장간 가운데 해당 지지의 주된 천간.
 * 子癸 丑己 寅甲 卯乙 辰戊 巳丙 午丁 未己 申庚 酉辛 戌戊 亥壬
 * 지장간 전체를 합산한 십성이 아니다.
 */
export const BRANCH_MAIN_STEM_IDX = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8] as const

/**
 * 지장간 여기·중기·정기(마지막이 본기). 화면 겉글자 개수와 분리해서 전달할 때만 사용.
 * 子壬癸 / 丑癸辛己 / 寅戊丙甲 / 卯甲乙 / 辰乙癸戊 / 巳戊庚丙
 * 午丙己丁 / 未丁乙己 / 申戊壬庚 / 酉庚辛 / 戌辛丁戊 / 亥戊甲壬
 */
export const BRANCH_HIDDEN_STEMS: readonly (readonly number[])[] = [
  [8, 9],
  [9, 7, 5],
  [4, 2, 0],
  [0, 1],
  [1, 9, 4],
  [4, 6, 2],
  [2, 5, 3],
  [3, 1, 5],
  [4, 8, 6],
  [6, 7],
  [7, 3, 4],
  [4, 0, 8],
]

const HOUR_NAMES: Record<number, string> = {
  23: '자시(子時)', 0: '자시(子時)', 1: '축시(丑時)', 2: '축시(丑時)',
  3: '인시(寅時)', 4: '인시(寅時)', 5: '묘시(卯時)', 6: '묘시(卯時)',
  7: '진시(辰時)', 8: '진시(辰時)', 9: '사시(巳時)', 10: '사시(巳時)',
  11: '오시(午時)', 12: '오시(午時)', 13: '미시(未時)', 14: '미시(未時)',
  15: '신시(申時)', 16: '신시(申時)', 17: '유시(酉時)', 18: '유시(酉時)',
  19: '술시(戌時)', 20: '술시(戌時)', 21: '해시(亥時)', 22: '해시(亥時)',
}

export type Pillar = {
  stem: string
  branch: string
  stemKr: string
  branchKr: string
  stemElement: string
  branchElement: string
  stemIdx: number
  branchIdx: number
  sipsinStem?: string
  sipsinBranch?: string
}

export type ElementCount = Record<'木' | '火' | '土' | '金' | '水', number>

export type ManseResult = {
  yearPillar: Pillar
  monthPillar: Pillar
  dayPillar: Pillar
  hourPillar: Pillar | null
  elementCount: ElementCount
  hiddenStems: { branch: string; stems: string[]; stemKr: string[] }
  hiddenStemNote: string
  animal: string
  hourStr: string
  solarTimeCorrection: ReturnType<typeof correctToTrueSolarTime> | null
  calcVersion: string
  promptVersion: string
  generatedDateKST: string
  generatedAt: string
  sipsinBasis: string
}

const EMPTY_ELEMENTS = (): ElementCount => ({ 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 })

/**
 * 천간 십성: 일간 오행과의 상생·상극 + 음양 동일 여부.
 * 인덱스 차이 (target-day)%10 배열 대입은 양일간에만 맞고 음일간에서 깨진다.
 * 음양이 같으면 편(비견/식신/편재/편관/편인), 다르면 정(겁재/상관/정재/정관/정인).
 * lunar-javascript 1.7.7 EightChar.getYearShiShenGan 등도 십성을 주지만,
 * 테스트 기대값은 이 공식으로만 만들고 라이브러리 출력을 정답으로 쓰지 않는다.
 */
export function getStemSipsin(dayStemIdx: number, targetStemIdx: number): SipsinName {
  const dayEl = Math.floor(dayStemIdx / 2)
  const targetEl = Math.floor(targetStemIdx / 2)
  const elDiff = (targetEl - dayEl + 5) % 5
  const samePolarity = (dayStemIdx % 2) === (targetStemIdx % 2)
  const table: readonly (readonly SipsinName[])[] = [
    ['비견', '겁재'],
    ['식신', '상관'],
    ['편재', '정재'],
    ['편관', '정관'],
    ['편인', '정인'],
  ]
  return table[elDiff][samePolarity ? 0 : 1]
}

export function getBranchSipsinByMainQi(dayStemIdx: number, branchIdx: number): SipsinName {
  return getStemSipsin(dayStemIdx, BRANCH_MAIN_STEM_IDX[branchIdx])
}

export function ganZhiToPillar(ganzhi: string): Pillar {
  const stemChar = ganzhi[0]
  const branchChar = ganzhi[1]
  const si = STEMS.indexOf(stemChar as typeof STEMS[number])
  const bi = BRANCHES.indexOf(branchChar as typeof BRANCHES[number])
  return {
    stem: stemChar,
    branch: branchChar,
    stemKr: STEM_KR[si],
    branchKr: BRANCH_KR[bi],
    stemElement: STEM_ELEMENT[si],
    branchElement: BRANCH_ELEMENT[bi],
    stemIdx: si,
    branchIdx: bi,
  }
}

export function calcYearPillar(year: number, month: number, day: number): Pillar {
  const lunar = LunarJS.Solar.fromYmd(year, month, day).getLunar()
  return ganZhiToPillar(lunar.getYearInGanZhiByLiChun())
}

export function calcMonthPillar(year: number, month: number, day: number): Pillar {
  const lunar = LunarJS.Solar.fromYmd(year, month, day).getLunar()
  return ganZhiToPillar(lunar.getMonthInGanZhi())
}

export function calcDayPillar(year: number, month: number, day: number): Pillar {
  const lunar = LunarJS.Solar.fromYmd(year, month, day).getLunar()
  return ganZhiToPillar(lunar.getDayInGanZhi())
}

export function calcHourPillar(year: number, month: number, day: number, h: number, m: number): Pillar {
  const lunar = LunarJS.Solar.fromYmdHms(year, month, day, h, m, 0).getLunar()
  return ganZhiToPillar(lunar.getTimeInGanZhi())
}

export function kstParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

export function generationClock(now = new Date()) {
  const p = kstParts(now)
  const generatedDateKST = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
  return {
    timeZone: 'Asia/Seoul' as const,
    generatedDateKST,
    generatedAt: now.toISOString(),
    currentYear: p.year,
    currentMonth: p.month,
    currentDay: p.day,
  }
}

/** 사주 화면 HH:MM 또는 대운·궁합의 시진 시작 시각(23, 9 등)을 계산용 HH:MM으로 맞춘다. */
export function hourInputToHm(hour?: string | number | null): string {
  if (hour === undefined || hour === null || hour === '') return ''
  const raw = String(hour).trim()
  if (raw.includes(':')) return raw
  const h = parseInt(raw, 10)
  if (Number.isNaN(h) || h < 0 || h > 23) return ''
  return `${String(h).padStart(2, '0')}:00`
}

export const MARITAL_STATUSES = ['미혼(솔로)', '연애중', '기혼', '이혼/사별'] as const
export type MaritalStatus = typeof MARITAL_STATUSES[number] | '미상'

export function normalizeMaritalStatus(raw: unknown): MaritalStatus {
  if (typeof raw !== 'string' || !raw.trim()) return '미상'
  const v = raw.trim()
  return (MARITAL_STATUSES as readonly string[]).includes(v) ? v as MaritalStatus : '미상'
}

export function normalizeOccupation(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return '미입력'
  return raw.trim().slice(0, 40)
}

export function periodGuidance(clock: ReturnType<typeof generationClock>) {
  const half = clock.currentMonth <= 6 ? 'first' : 'second'
  return `[생성 기준일] ${clock.generatedDateKST} (Asia/Seoul). 이 날짜를 기준으로 "올해/내년/상반기/하반기"를 말해라.
이미 지난 구간은 앞으로 할 일처럼 쓰지 마라. 오늘은 ${clock.currentMonth}월이므로 ${clock.currentYear}년 ${half === 'first' ? '상반기는 아직 진행 중이거나 일부만 지났다' : '상반기는 이미 지난 과거'}로 다뤄라.`
}

function countVisibleElements(pillars: Pillar[]): ElementCount {
  const elements = EMPTY_ELEMENTS()
  for (const p of pillars) {
    if (p.stemElement in elements) elements[p.stemElement as keyof ElementCount]++
    if (p.branchElement in elements) elements[p.branchElement as keyof ElementCount]++
  }
  return elements
}

function attachSipsin(pillar: Pillar, dayStemIdx: number, stemLabel?: string): Pillar {
  return {
    ...pillar,
    sipsinStem: stemLabel ?? getStemSipsin(dayStemIdx, pillar.stemIdx),
    sipsinBranch: getBranchSipsinByMainQi(dayStemIdx, pillar.branchIdx),
  }
}

function hiddenFor(branchIdx: number) {
  const idxs = BRANCH_HIDDEN_STEMS[branchIdx]
  return {
    branch: BRANCHES[branchIdx],
    stems: idxs.map(i => STEMS[i]),
    stemKr: idxs.map(i => STEM_KR[i]),
  }
}

export function calcManse(
  year: number,
  month: number,
  day: number,
  hourMinute?: string,
  longitude?: number,
): ManseResult {
  let y = year, mo = month, d = day, hm = hourMinute ?? ''
  let solarTimeCorrection: ReturnType<typeof correctToTrueSolarTime> | null = null
  if (longitude && hm) {
    solarTimeCorrection = correctToTrueSolarTime(year, month, day, hm, longitude)
    y = solarTimeCorrection.correctedYear
    mo = solarTimeCorrection.correctedMonth
    d = solarTimeCorrection.correctedDay
    hm = solarTimeCorrection.correctedHourMinute
  }

  const yp = calcYearPillar(y, mo, d)
  const mp = calcMonthPillar(y, mo, d)
  const dp = calcDayPillar(y, mo, d)
  const dayStemIdx = dp.stemIdx
  let hp: Pillar | null = null
  let hourStr = '시간 미상'
  if (hm) {
    const parts = hm.split(':')
    const h = parseInt(parts[0], 10)
    const m = parts[1] ? parseInt(parts[1], 10) : 0
    if (!Number.isNaN(h) && h >= 0 && h <= 23) {
      hp = calcHourPillar(y, mo, d, h, m)
      hourStr = `${String(h).padStart(2, '0')}시 ${String(m).padStart(2, '0')}분 (${HOUR_NAMES[h] ?? ''})`
      if (solarTimeCorrection) {
        const sign = solarTimeCorrection.correctionMinutes >= 0 ? '+' : ''
        hourStr += ` [진태양시 보정 ${sign}${solarTimeCorrection.correctionMinutes}분 적용]`
      }
    }
  }

  const clock = generationClock()
  const pillars = [yp, mp, dp, ...(hp ? [hp] : [])]
  const elementCount = countVisibleElements(pillars)
  const hiddenBits = pillars.map(p => hiddenFor(p.branchIdx))

  return {
    yearPillar: attachSipsin(yp, dayStemIdx),
    monthPillar: attachSipsin(mp, dayStemIdx),
    dayPillar: attachSipsin(dp, dayStemIdx, '일간'),
    hourPillar: hp ? attachSipsin(hp, dayStemIdx) : null,
    elementCount,
    hiddenStems: {
      branch: hiddenBits.map(h => h.branch).join(''),
      stems: hiddenBits.flatMap(h => h.stems),
      stemKr: hiddenBits.flatMap(h => h.stemKr),
    },
    hiddenStemNote: hiddenBits
      .map(h => `${h.branch}(${h.stemKr.join('·')})`)
      .join(', '),
    animal: ANIMALS[yp.branchIdx],
    hourStr,
    solarTimeCorrection,
    calcVersion: CALC_VERSION,
    promptVersion: PROMPT_VERSION,
    generatedDateKST: clock.generatedDateKST,
    generatedAt: clock.generatedAt,
    sipsinBasis: '천간은 일간 대비 오행+음양. 지지는 본기(정기) 천간 기준. 지장간 전체 합산 아님.',
  }
}

export function formatManseForPrompt(manse: ManseResult, personLabel = '이 사람'): string {
  const names: Record<string, string> = { 木: '나무', 火: '불', 土: '땅', 金: '금속', 水: '물' }
  const visible = Object.entries(manse.elementCount)
    .map(([el, cnt]) => `${names[el]} ${cnt}개`)
    .join(', ')
  const hp = manse.hourPillar
  return `[${personLabel} 계산값 — calcVersion ${manse.calcVersion}, 재계산 금지]
연주: ${manse.yearPillar.stem}${manse.yearPillar.branch} (천간 십성 ${manse.yearPillar.sipsinStem}, 지지 본기 십성 ${manse.yearPillar.sipsinBranch})
월주: ${manse.monthPillar.stem}${manse.monthPillar.branch} (천간 십성 ${manse.monthPillar.sipsinStem}, 지지 본기 십성 ${manse.monthPillar.sipsinBranch})
일주: ${manse.dayPillar.stem}${manse.dayPillar.branch} (천간 일간, 지지 본기 십성 ${manse.dayPillar.sipsinBranch})
시주: ${hp ? `${hp.stem}${hp.branch} (천간 십성 ${hp.sipsinStem}, 지지 본기 십성 ${hp.sipsinBranch})` : '미상'}
띠: ${manse.animal}띠 / 태어난 시간: ${manse.hourStr}
겉글자 오행 개수(원국 8글자만): ${visible}
이 숫자는 코드가 센 값이다. 다시 세거나 바꾸지 마라. 0개여도 지장간에 같은 오행이 있으면 "전혀 없다"고 확대하지 마라.
지장간(참고, 개수에 합산하지 말 것, 강약으로 단순 합산 금지): ${manse.hiddenStemNote}
십성 기준: ${manse.sipsinBasis}`
}

export function formatSeunForPrompt(dayStemIdx: number, year: number) {
  const yp = calcYearPillar(year, 6, 15)
  const firstHalf = calcMonthPillar(year, 4, 15)
  const secondHalf = calcMonthPillar(year, 10, 15)
  return {
    year,
    ganzhi: `${yp.stem}${yp.branch}`,
    sipsin: getStemSipsin(dayStemIdx, yp.stemIdx),
    firstHalfGanzhi: `${firstHalf.stem}${firstHalf.branch}`,
    firstHalfSipsin: getStemSipsin(dayStemIdx, firstHalf.stemIdx),
    secondHalfGanzhi: `${secondHalf.stem}${secondHalf.branch}`,
    secondHalfSipsin: getStemSipsin(dayStemIdx, secondHalf.stemIdx),
  }
}

export const SHARED_INTERP_GUARDS = `
[사실·추측 구분]
- 입력에 없는 부모 관계, 과거 사건, 질환, 증상을 실제 경험처럼 쓰지 마라.
- 일반적인 생활 조언과 이 사람의 이력에 대한 주장을 섞지 마라.
- 사주만으로 특정 병을 겪는다고 단정하거나 치료·처방처럼 안내하지 마라.
- 미래 사건·성공·결혼·수익을 100% 보장하지 마라.
- 같은 문장·비유·행동 조언("속도를 줄여라", "과열", "번아웃")을 여러 항목에 반복해 분량을 채우지 마라.
- 계산되지 않은 신살이나 근거를 새로 만들지 마라.
- 대운 시작 나이·점수처럼 계산표가 없는 숫자를 사실처럼 쓰지 마라.
`

export function collectGeneratedText(parts: Array<unknown>): string {
  const chunks: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'string') chunks.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v as Record<string, unknown>).forEach(walk)
  }
  parts.forEach(walk)
  return chunks.join('\n')
}
