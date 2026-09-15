export const TIME_MODES = ['exact', 'period', 'unknown'] as const
export type TimeMode = (typeof TIME_MODES)[number]

export const TIME_PERIODS = [
  { id: 'dawn', label: '새벽', rangeLabel: '00~06시' },
  { id: 'morning', label: '아침', rangeLabel: '06~12시' },
  { id: 'afternoon', label: '점심·오후', rangeLabel: '12~18시' },
  { id: 'evening', label: '저녁·밤', rangeLabel: '18~24시' },
] as const

export type TimePeriodId = (typeof TIME_PERIODS)[number]['id']

const TIME_MODE_ALIASES: Record<string, TimeMode> = {
  exact: 'exact',
  period: 'period',
  unknown: 'unknown',
}

const PERIOD_ALIASES: Record<string, TimePeriodId> = {
  dawn: 'dawn',
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
}

export function normalizeTimeMode(input: unknown, hour?: unknown): TimeMode {
  if (typeof input === 'string' && TIME_MODE_ALIASES[input]) return TIME_MODE_ALIASES[input]
  if (typeof hour === 'string' && /^\d{1,2}:\d{2}$/.test(hour.trim())) return 'exact'
  return 'unknown'
}

export function normalizeTimePeriod(input: unknown): TimePeriodId | '' {
  if (typeof input !== 'string') return ''
  return PERIOD_ALIASES[input] ?? ''
}

export function parseExactHourMinute(hour: unknown): string | null {
  if (typeof hour !== 'string') return null
  const trimmed = hour.trim()
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function timePeriodMeta(id: TimePeriodId) {
  return TIME_PERIODS.find(p => p.id === id)!
}

export function describeBirthTime(mode: TimeMode, hourMinute: string | null, period: TimePeriodId | ''): string {
  if (mode === 'exact' && hourMinute) return `정확한 출생시각 ${hourMinute}`
  if (mode === 'period' && period) {
    const meta = timePeriodMeta(period)
    return `대략적 시간대 ${meta.label}(${meta.rangeLabel}) — 정확한 출생시각 아님, 시주 미계산`
  }
  return '시간 완전 미상 — 시주 미계산'
}

export function hourForManse(mode: TimeMode, hourMinute: string | null): string {
  return mode === 'exact' && hourMinute ? hourMinute : ''
}
