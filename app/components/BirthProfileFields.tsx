'use client'

import BirthDateFields from '@/app/components/BirthDateFields'
import BirthPlaceField from '@/app/components/BirthPlaceField'
import BirthTimeField from '@/app/components/BirthTimeField'
import type { BirthFormSlice } from '@/lib/birthInput'

export default function BirthProfileFields({
  value,
  onChange,
  accentColor,
  showGender = true,
  gender,
  onGenderChange,
}: {
  value: BirthFormSlice
  onChange: (patch: Partial<BirthFormSlice>) => void
  accentColor: string
  showGender?: boolean
  gender?: string
  onGenderChange?: (gender: string) => void
}) {
  return (
    <div className="space-y-3">
      <BirthDateFields
        year={value.year} month={value.month} day={value.day}
        calType={value.calType} isLeapMonth={value.isLeapMonth}
        onChange={onChange} accentColor={accentColor} />
      <BirthTimeField
        timeMode={value.timeMode} hour={value.hour} timePeriod={value.timePeriod}
        onChange={onChange} accentColor={accentColor} />
      <BirthPlaceField value={value.birthPlace} onChange={birthPlace => onChange({ birthPlace })} />
      {showGender && onGenderChange && (
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">성별</label>
          <div className="grid grid-cols-2 gap-2">
            {['male', 'female'].map(g => (
              <button key={g} type="button" onClick={() => onGenderChange(g)}
                className="py-2.5 rounded-xl text-sm font-medium transition-all"
                style={gender === g
                  ? { background: accentColor, color: 'white' }
                  : { background: '#111827', color: '#9CA3AF', border: '1px solid #374151' }}>
                {g === 'male' ? '남성' : '여성'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
