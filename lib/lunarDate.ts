import LunarJS from 'lunar-javascript'

export type CalendarType = 'solar' | 'lunar'

export function isValidSolarYmd(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
  if (year < 1920 || year > 2010 || month < 1 || month > 12 || day < 1 || day > 31) return false
  const dt = new Date(year, month - 1, day)
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day
}

export function leapMonthOfYear(year: number): number {
  try {
    return LunarJS.LunarYear.fromYear(year).getLeapMonth() || 0
  } catch {
    return 0
  }
}

export function lunarMonthDayCount(year: number, month: number, isLeap: boolean): number | null {
  try {
    const lunarMonth = isLeap ? -Math.abs(month) : month
    const m = LunarJS.LunarYear.fromYear(year).getMonth(lunarMonth)
    return m ? m.getDayCount() : null
  } catch {
    return null
  }
}

export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  isLeap = false,
): { year: number; month: number; day: number } | { error: string } {
  try {
    const lunarMonth = isLeap ? -Math.abs(month) : month
    const lunar = LunarJS.Lunar.fromYmd(year, lunarMonth, day)
    const solar = lunar.getSolar()
    return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() }
  } catch (e) {
    return { error: e instanceof Error ? e.message : '음력 날짜를 변환할 수 없어요.' }
  }
}

export function toSolarBirthDate(input: {
  year: number
  month: number
  day: number
  calType: CalendarType
  isLeapMonth?: boolean
}): { year: number; month: number; day: number } | { error: string } {
  if (input.calType === 'solar') {
    if (!isValidSolarYmd(input.year, input.month, input.day)) {
      return { error: '양력 생년월일이 올바르지 않아요.' }
    }
    return { year: input.year, month: input.month, day: input.day }
  }
  if (input.isLeapMonth) {
    const leap = leapMonthOfYear(input.year)
    if (leap !== input.month) return { error: `${input.year}년에는 ${input.month}월 윤달이 없어요.` }
  }
  const days = lunarMonthDayCount(input.year, input.month, !!input.isLeapMonth)
  if (!days) return { error: '음력 생년월일이 올바르지 않아요.' }
  if (input.day < 1 || input.day > days) return { error: `해당 음력 달은 ${days}일까지예요.` }
  return lunarToSolar(input.year, input.month, input.day, !!input.isLeapMonth)
}
