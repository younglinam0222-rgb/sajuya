'use client'

import { KOREA_REGIONS } from '@/lib/solarTime'

export default function BirthPlaceField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const region = KOREA_REGIONS.find(r => r.name === value)
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1.5 block">
        태어난 지역 <span className="text-gray-600">(선택 · 정확한 시간이 있을 때만 시주 보정)</span>
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
        <option value="">선택 안 함 (표준시로 계산)</option>
        {KOREA_REGIONS.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
      </select>
      {region && (
        <p className="text-xs text-purple-300/70 mt-1.5 font-mono tracking-wide">
          📍 북위 {region.latitude.toFixed(2)}° · 동경 {region.longitude.toFixed(2)}°
        </p>
      )}
      <p className="text-xs text-gray-600 mt-1">시간이 미상이거나 대략적 시간대면 출생지로 시주를 만들지 않습니다.</p>
    </div>
  )
}
