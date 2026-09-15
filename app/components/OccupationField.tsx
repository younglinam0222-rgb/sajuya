'use client'

import { OCCUPATION_CUSTOM_KEY, OCCUPATION_PRESETS, isOccupationPreset } from '@/lib/profileOptions'

export default function OccupationField({
  value,
  onChange,
  accentColor,
}: {
  value: string
  onChange: (value: string) => void
  accentColor: string
}) {
  const custom = value !== '' && !isOccupationPreset(value)
  const selectedCustom = custom || value === ''

  return (
    <div>
      <label className="text-xs text-gray-400 mb-1.5 block">직업</label>
      <div className="flex flex-wrap gap-2">
        {OCCUPATION_PRESETS.map(o => (
          <button key={o} type="button" onClick={() => onChange(o)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={!custom && value === o
              ? { background: accentColor, color: 'white' }
              : { background: '#1F2937', color: '#9CA3AF', border: '1px solid #374151' }}>
            {o}
          </button>
        ))}
        <button type="button"
          onClick={() => onChange(custom ? value : '')}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
          style={selectedCustom && (custom || value === '')
            ? { background: accentColor, color: 'white' }
            : { background: '#1F2937', color: '#9CA3AF', border: '1px solid #374151' }}>
          기타(직접입력)
        </button>
      </div>
      {selectedCustom && (
        <input type="text" placeholder="직업을 직접 입력해주세요 (예: 요리사, 공무원)"
          value={isOccupationPreset(value) ? '' : value}
          maxLength={40}
          onChange={e => onChange(e.target.value)}
          className="w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none" />
      )}
      <p className="sr-only">{OCCUPATION_CUSTOM_KEY}</p>
    </div>
  )
}
