'use client'

import TimeNumberInput from '@/app/components/TimeNumberInput'
import { TIME_MODES, TIME_PERIODS, type TimeMode, type TimePeriodId } from '@/lib/birthTime'

export default function BirthTimeField({
  timeMode,
  hour,
  timePeriod,
  onChange,
  accentColor,
}: {
  timeMode: TimeMode
  hour: string
  timePeriod: TimePeriodId | ''
  onChange: (patch: { timeMode?: TimeMode; hour?: string; timePeriod?: TimePeriodId | '' }) => void
  accentColor: string
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1.5 block">태어난 시간</label>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {([
          { id: 'exact' as const, label: '정확한 시간' },
          { id: 'period' as const, label: '대략적 시간대' },
          { id: 'unknown' as const, label: '완전 미상' },
        ] as const).map(opt => (
          <button key={opt.id} type="button"
            onClick={() => {
              if (opt.id === 'unknown') onChange({ timeMode: 'unknown', hour: '', timePeriod: '' })
              else if (opt.id === 'period') onChange({ timeMode: 'period', hour: '' })
              else onChange({ timeMode: 'exact', timePeriod: '' })
            }}
            className="py-2 rounded-xl text-[11px] font-medium transition-all"
            style={timeMode === opt.id
              ? { background: accentColor, color: 'white' }
              : { background: '#111827', color: '#9CA3AF', border: '1px solid #374151' }}>
            {opt.label}
          </button>
        ))}
      </div>

      {timeMode === 'exact' && (
        <>
          <TimeNumberInput exactOnly value={hour} onChange={v => onChange({ timeMode: 'exact', hour: v, timePeriod: '' })} />
          <p className="text-xs text-gray-600 mt-1">시·분을 알 때만 정확한 시각으로 시주를 계산합니다.</p>
        </>
      )}

      {timeMode === 'period' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {TIME_PERIODS.map(p => (
              <button key={p.id} type="button"
                onClick={() => onChange({ timeMode: 'period', hour: '', timePeriod: p.id })}
                className="py-2.5 rounded-xl text-xs font-medium transition-all"
                style={timePeriod === p.id
                  ? { background: accentColor, color: 'white' }
                  : { background: '#111827', color: '#9CA3AF', border: '1px solid #374151' }}>
                {p.label} <span className="text-gray-500">({p.rangeLabel})</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-1">대략적인 시간대는 정확한 출생시각으로 넣지 않으며, 시주는 계산하지 않습니다.</p>
        </>
      )}

      {timeMode === 'unknown' && (
        <p className="text-xs text-gray-600">시간을 완전히 모르면 시주를 만들지 않습니다. 임의의 정오·시진으로 채우지 않습니다.</p>
      )}
      <p className="sr-only">{TIME_MODES.join(',')}</p>
    </div>
  )
}
