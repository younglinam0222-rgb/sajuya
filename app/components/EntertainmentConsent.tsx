'use client'

import { ENTERTAINMENT_CHECKBOX_LABEL, ENTERTAINMENT_NOTICE } from '@/lib/entertainmentConsent'

export default function EntertainmentConsent({
  agreed,
  onChange,
}: {
  agreed: boolean
  onChange: (agreed: boolean) => void
}) {
  return (
    <div className="mb-3 rounded-2xl border border-gray-800 bg-[#111118] p-4">
      <p className="text-xs text-gray-400 leading-relaxed">{ENTERTAINMENT_NOTICE}</p>
      <label className="mt-3 flex items-start gap-2 text-sm text-gray-200">
        <input type="checkbox" checked={agreed} onChange={e => onChange(e.target.checked)}
          className="mt-0.5 accent-purple-500" />
        <span>{ENTERTAINMENT_CHECKBOX_LABEL}</span>
      </label>
    </div>
  )
}
