'use client'

import { useMemo } from 'react'
import { leapMonthOfYear, lunarMonthDayCount } from '@/lib/lunarDate'
import type { CalendarType } from '@/lib/lunarDate'

const YEARS = Array.from({ length: 80 }, (_, i) => 2005 - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function BirthDateFields({
  year, month, day, calType, isLeapMonth, onChange, accentColor,
}: {
  year: string
  month: string
  day: string
  calType: CalendarType
  isLeapMonth: boolean
  onChange: (patch: {
    year?: string
    month?: string
    day?: string
    calType?: CalendarType
    isLeapMonth?: boolean
  }) => void
  accentColor: string
}) {
  const yearNum = parseInt(year, 10)
  const monthNum = parseInt(month, 10)
  const leapMonth = Number.isInteger(yearNum) ? leapMonthOfYear(yearNum) : 0
  const maxDay = useMemo(() => {
    if (calType === 'lunar') {
      return lunarMonthDayCount(yearNum, monthNum, isLeapMonth && leapMonth === monthNum) ?? 30
    }
    return new Date(yearNum, monthNum, 0).getDate()
  }, [calType, yearNum, monthNum, isLeapMonth, leapMonth])

  const days = Array.from({ length: maxDay }, (_, i) => i + 1)
  const dayNum = parseInt(day, 10)
  const safeDay = Number.isInteger(dayNum) && dayNum > maxDay ? String(maxDay) : day

  return (
    <div>
      <label className="text-xs text-gray-400 mb-1.5 block">생년월일</label>
      <div className="flex gap-2 mb-2">
        {(['solar', 'lunar'] as const).map(t => (
          <button key={t} type="button" onClick={() => onChange({ calType: t, isLeapMonth: t === 'lunar' ? isLeapMonth : false })}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={calType === t
              ? { background: accentColor, color: 'white' }
              : { background: '#1F2937', color: '#9CA3AF', border: '1px solid #374151' }}>
            {t === 'solar' ? '양력' : '음력'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <select value={year} onChange={e => onChange({ year: e.target.value, isLeapMonth: false })}
          className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none">
          {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={month} onChange={e => onChange({ month: e.target.value, isLeapMonth: false })}
          className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none">
          {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
        </select>
        <select value={safeDay} onChange={e => onChange({ day: e.target.value })}
          className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none">
          {days.map(d => <option key={d} value={d}>{d}일</option>)}
        </select>
      </div>
      {calType === 'lunar' && leapMonth > 0 && (
        <label className="mt-2 flex items-center gap-2 text-xs text-gray-400">
          <input type="checkbox"
            checked={isLeapMonth && leapMonth === monthNum}
            disabled={leapMonth !== monthNum}
            onChange={e => onChange({ isLeapMonth: e.target.checked })}
            className="accent-purple-500" />
          {leapMonth === monthNum
            ? `${year}년 ${leapMonth}월은 윤달이 있습니다. 윤달이면 체크하세요.`
            : `${year}년 윤달은 ${leapMonth}월입니다. 해당 월을 고르면 윤달을 선택할 수 있어요.`}
        </label>
      )}
    </div>
  )
}
