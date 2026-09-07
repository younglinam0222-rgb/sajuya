'use client'

import { MARITAL_STATUS_OPTIONS, type MaritalStatusValue } from '@/lib/profileOptions'

export default function MaritalStatusField({
  value,
  onChange,
  accentColor,
}: {
  value: string
  onChange: (value: MaritalStatusValue) => void
  accentColor: string
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1.5 block">결혼 상태</label>
      <div className="grid grid-cols-2 gap-2">
        {MARITAL_STATUS_OPTIONS.map(opt => (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className="py-2.5 rounded-xl text-sm font-medium transition-all"
            style={value === opt.value
              ? { background: accentColor, color: 'white' }
              : { background: '#111827', color: '#9CA3AF', border: '1px solid #374151' }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
