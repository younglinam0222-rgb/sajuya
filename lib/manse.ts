// lib/manse.ts — HH:MM 4자리 시간 입력 버전
// 자시(子時) 야자시/조자시 분리 처리 포함

import Lunar from 'lunar-javascript'

export const HEAVENLY_STEMS = ['갑','을','병','정','무','기','경','신','임','계'] as const
export const EARTHLY_BRANCHES = ['자','축','인','묘','진','사','오','미','신','유','술','해'] as const
export const ZODIAC_ANIMALS = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지'] as const

export const STEM_ELEMENT: Record<string, string> = {
  '갑':'木','을':'木','병':'火','정':'Fire','무':'土',
  '기':'土','경':'金','신':'金','임':'水','계':'水'
}
// 오행 올바른 매핑
const SE: Record<string, string> = {
  '갑':'木','을':'木','병':'火','정':'火','무':'土',
  '기':'土','경':'金','신':'金','임':'水','계':'水'
}
export const BRANCH_ELEMENT: Record<string, string> = {
  '자':'水','축':'土','인':'木','묘':'木','진':'土','사':'火',
  '오':'Fire','미':'土','신':'金','유':'金','술':'土','해':'水'
}
const BE: Record<string, string> = {
  '자':'水','축':'土','인':'木','묘':'木','진':'土','사':'火',
  '오':'火','미':'土','신':'金','유':'金','술':'土','해':'水'
}

export const ELEMENT_COLOR: Record<string, { bg: string; text: string }> = {
  '木': { bg: '#16a34a', text: '#fff' },
  '火': { bg: '#dc2626', text: '#fff' },
  '土': { bg: '#d97706', text: '#fff' },
  '金': { bg: '#7c3aed', text: '#fff' },
  '水': { bg: '#2563eb', text: '#fff' },
}

export interface Pillar {
  stem: string
  branch: string
  stemElement: string
  branchElement: string
  fullName: string
}

export interface Daeun {
  index: number
  startAge: number
  endAge: number
  stem: string
  branch: string
  stemElement: string
  branchElement: string
}

export interface SajuResult {
  yearPillar: Pillar
  monthPillar: Pillar
  dayPillar: Pillar
  hourPillar: Pillar
  daeunList: Daeun[]
  currentDaeun: Daeun | null
  elementCount: Record<string, number>
  animal: string
  sijin: string
  birthInfo: {
    year: number; month: number; day: number
    timeStr: string; gender: 'male'|'female'; isLunar: boolean
  }
}

function makePillar(stemIdx: number, branchIdx: number): Pillar {
  const stem = HEAVENLY_STEMS[((stemIdx % 10) + 10) % 10]
  const branch = EARTHLY_BRANCHES[((branchIdx % 12) + 12) % 12]
  return {
    stem, branch,
    stemElement: SE[stem],
    branchElement: BE[branch],
    fullName: stem + branch,
  }
}

function getJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
}

// HH:MM → 시진 인덱스 (자시 야/조 분리)
export function timeStrToBranchIndex(timeStr: string | null): number {
  if (!timeStr) return 6 // 시간 모름 → 오시(낮 12시) 기본값
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h)) return 6
  // 야자시: 23:00 이후 → 자시(0)
  if (h === 23) return 0
  // 조자시: 00:00~00:59 → 자시(0)
  if (h === 0) return 0
  return Math.floor((h + 1) / 2) % 12
}

// 시진 이름 반환
export function getTimeStrSijin(timeStr: string | null): string {
  if (!timeStr) return '시간 미상 (오시로 계산)'
  const idx = timeStrToBranchIndex(timeStr)
  const [h] = timeStr.split(':').map(Number)
  const sijinName = SIJIN_NAMES[idx]
  const range = SIJIN_RANGES[idx]
  if (h === 23) return `야자시(夜子時) ${sijinName} · ${range}`
  if (h === 0) return `조자시(早子時) ${sijinName} · ${range}`
  return `${sijinName} · ${range}`
}

export function calculateSaju(
  year: number, month: number, day: number,
  timeStr: string | null,
  gender: 'male' | 'female',
  isLunar: boolean = false
): SajuResult {
  let sy = year, sm = month, sd = day
  if (isLunar) {
    try {
      const lunar = Lunar.fromYmd(year, month, day)
      const solar = lunar.getSolar()
      sy = solar.getYear(); sm = solar.getMonth(); sd = solar.getDay()
    } catch {}
  }

  // 연주
  const isBeforeLipchun = sm < 2 || (sm === 2 && sd < 4)
  const sajuYear = isBeforeLipchun ? sy - 1 : sy
  const yStemIdx = ((sajuYear - 4) % 10 + 10) % 10
  const yBranchIdx = ((sajuYear - 4) % 12 + 12) % 12
  const yearPillar = makePillar(yStemIdx, yBranchIdx)

  // 월주
  const JEOLGI_DAY = [6,4,6,5,6,6,7,8,8,8,7,7]
  let monthIdx = sm - 1
  if (sd < JEOLGI_DAY[sm - 1]) monthIdx = (monthIdx - 1 + 12) % 12
  const mBranchIdx = (monthIdx + 2) % 12
  const MONTH_STEM_STARTS = [2,4,6,8,0,2,4,6,8,0]
  const mStemIdx = (MONTH_STEM_STARTS[yStemIdx] + (mBranchIdx - 2 + 12) % 12) % 10
  const monthPillar = makePillar(mStemIdx, mBranchIdx)

  // 일주
  const REF_JDN = getJDN(1900, 1, 31)
  const dayCount = getJDN(sy, sm, sd) - REF_JDN
  const dStemIdx = ((dayCount % 10) + 10) % 10
  const dBranchIdx = ((dayCount % 12) + 12) % 12
  const dayPillar = makePillar(dStemIdx, dBranchIdx)

  // 시주 (HH:MM → 시진)
  const hBranchIdx = timeStrToBranchIndex(timeStr)
  const HOUR_STEM_STARTS = [0,2,4,6,8,0,2,4,6,8]
  const hStemIdx = (HOUR_STEM_STARTS[dStemIdx] + hBranchIdx) % 10
  const hourPillar = makePillar(hStemIdx, hBranchIdx)

  // 오행 분포
  const elementCount: Record<string, number> = {'木':0,'火':0,'土':0,'金':0,'水':0}
  ;[yearPillar, monthPillar, dayPillar, hourPillar].forEach(p => {
    if (elementCount[p.stemElement] !== undefined) elementCount[p.stemElement]++
    if (elementCount[p.branchElement] !== undefined) elementCount[p.branchElement]++
  })

  // 대운
  const daeunList: Daeun[] = []
  const isYangStem = yStemIdx % 2 === 0
  const goForward = (gender === 'male' && isYangStem) || (gender === 'female' && !isYangStem)
  const daeunStartAge = 3

  for (let i = 0; i < 10; i++) {
    const offset = goForward ? (i + 1) : -(i + 1)
    const ds = ((mStemIdx + offset) % 10 + 10) % 10
    const db = ((mBranchIdx + offset) % 12 + 12) % 12
    const startAge = daeunStartAge + i * 10
    daeunList.push({
      index: i, startAge, endAge: startAge + 9,
      stem: HEAVENLY_STEMS[ds], branch: EARTHLY_BRANCHES[db],
      stemElement: SE[HEAVENLY_STEMS[ds]], branchElement: BE[EARTHLY_BRANCHES[db]],
    })
  }

  const currentAge = new Date().getFullYear() - sy
  const currentDaeun = daeunList.find(d => currentAge >= d.startAge && currentAge <= d.endAge) || null

  return {
    yearPillar, monthPillar, dayPillar, hourPillar,
    daeunList, currentDaeun, elementCount,
    animal: ZODIAC_ANIMALS[yBranchIdx],
    sijin: getTimeStrSijin(timeStr),
    birthInfo: { year, month, day, timeStr: timeStr || '', gender, isLunar },
  }
}

export const SIJIN_NAMES = [
  '자시(子時)','축시(丑時)','인시(寅時)','묘시(卯時)',
  '진시(辰時)','사시(巳時)','오시(午時)','미시(未時)',
  '신시(申時)','유시(酉時)','술시(戌時)','해시(亥時)'
]
export const SIJIN_RANGES = [
  '23:00-01:00','01:00-03:00','03:00-05:00','05:00-07:00',
  '07:00-09:00','09:00-11:00','11:00-13:00','13:00-15:00',
  '15:00-17:00','17:00-19:00','19:00-21:00','21:00-23:00'
]
