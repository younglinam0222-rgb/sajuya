import { KOREA_REGIONS } from '@/lib/solarTime'
import {
  describeBirthTime,
  hourForManse,
  normalizeTimeMode,
  normalizeTimePeriod,
  parseExactHourMinute,
  type TimeMode,
  type TimePeriodId,
} from '@/lib/birthTime'
import { toSolarBirthDate, type CalendarType } from '@/lib/lunarDate'

export type BirthFormSlice = {
  year: string
  month: string
  day: string
  calType: CalendarType
  isLeapMonth: boolean
  timeMode: TimeMode
  hour: string
  timePeriod: TimePeriodId | ''
  birthPlace: string
}

export const DEFAULT_BIRTH_FORM: BirthFormSlice = {
  year: '1990',
  month: '1',
  day: '1',
  calType: 'solar',
  isLeapMonth: false,
  timeMode: 'unknown',
  hour: '',
  timePeriod: '',
  birthPlace: '',
}

export type ResolvedBirth = {
  solarYear: number
  solarMonth: number
  solarDay: number
  hourMinute: string
  longitude?: number
  timeMode: TimeMode
  timePeriod: TimePeriodId | ''
  timeDescription: string
  calLabel: string
  birthPlaceName: string
  inputYear: number
  inputMonth: number
  inputDay: number
  isLeapMonth: boolean
}

export type BirthResolveError = { error: string }

function asCalendarType(input: unknown): CalendarType {
  return input === 'lunar' ? 'lunar' : 'solar'
}

function asInt(input: unknown): number {
  if (typeof input === 'number' && Number.isInteger(input)) return input
  if (typeof input === 'string' && input.trim()) return parseInt(input, 10)
  return NaN
}

export function resolveBirthFromRequest(body: Record<string, unknown>): ResolvedBirth | BirthResolveError {
  const year = asInt(body.year)
  const month = asInt(body.month)
  const day = asInt(body.day)
  const calType = asCalendarType(body.calType)
  const isLeapMonth = body.isLeapMonth === true || body.isLeapMonth === 'true'
  const converted = toSolarBirthDate({ year, month, day, calType, isLeapMonth })
  if ('error' in converted) return converted

  const timeMode = normalizeTimeMode(body.timeMode, body.hour)
  const timePeriod = normalizeTimePeriod(body.timePeriod)
  const exactHour = parseExactHourMinute(body.hour)
  if (timeMode === 'exact' && !exactHour) {
    return { error: '정확한 출생시각을 시·분으로 선택해주세요.' }
  }
  if (timeMode === 'period' && !timePeriod) {
    return { error: '대략적인 시간대를 선택해주세요.' }
  }

  const hourMinute = hourForManse(timeMode, exactHour)
  const birthPlaceName = typeof body.birthPlace === 'string' ? body.birthPlace.trim() : ''
  const region = KOREA_REGIONS.find(r => r.name === birthPlaceName)
  const longitudeFromBody = typeof body.longitude === 'number' && Number.isFinite(body.longitude)
    ? body.longitude
    : region?.longitude
  // 시주 보정은 정확한 시각이 있을 때만. 미상/시간대는 임의의 시주를 만들지 않음.
  const longitude = hourMinute && longitudeFromBody != null ? longitudeFromBody : undefined

  return {
    solarYear: converted.year,
    solarMonth: converted.month,
    solarDay: converted.day,
    hourMinute,
    longitude,
    timeMode,
    timePeriod,
    timeDescription: describeBirthTime(timeMode, exactHour, timePeriod),
    calLabel: calType === 'lunar' ? `음력${isLeapMonth ? ' 윤달' : ''}` : '양력',
    birthPlaceName,
    inputYear: year,
    inputMonth: month,
    inputDay: day,
    isLeapMonth: calType === 'lunar' && isLeapMonth,
  }
}

export function pickPrefixedBirth(body: Record<string, unknown>, prefix: string): Record<string, unknown> {
  return {
    year: body[`year${prefix}`],
    month: body[`month${prefix}`],
    day: body[`day${prefix}`],
    hour: body[`hour${prefix}`],
    calType: body[`calType${prefix}`],
    isLeapMonth: body[`isLeapMonth${prefix}`],
    timeMode: body[`timeMode${prefix}`],
    timePeriod: body[`timePeriod${prefix}`],
    birthPlace: body[`birthPlace${prefix}`],
    longitude: body[`longitude${prefix}`],
  }
}

export function birthPromptLine(birth: ResolvedBirth): string {
  const place = birth.birthPlaceName ? ` / 출생지 ${birth.birthPlaceName}` : ' / 출생지 미입력(표준시)'
  const converted = birth.calLabel.startsWith('음력')
    ? ` → 양력 환산 ${birth.solarYear}.${birth.solarMonth}.${birth.solarDay}`
    : ''
  return `생년월일: ${birth.inputYear}년 ${birth.inputMonth}월 ${birth.inputDay}일 (${birth.calLabel}${converted}) / ${birth.timeDescription}${place}`
}
