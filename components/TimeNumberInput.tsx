'use client'

import { useState, useEffect } from 'react'

interface TimeNumberInputProps {
  value: string           // "HH:MM" 형식 또는 빈 문자열('모름')
  onChange: (value: string) => void
}

// ✅ 신규: 네이티브 <input type="time"> 대신 숫자 두 칸(시/분) 직접 입력
// 모바일에서 시간 선택기 스크롤 휠 돌리는 것보다 숫자 타이핑이 더 빠름
export default function TimeNumberInput({ value, onChange }: TimeNumberInputProps) {
  const [h, setH] = useState('')
  const [m, setM] = useState('')

  // 부모의 value(HH:MM)가 외부에서 바뀌는 경우(예: 쿼리 파라미터로 프리필) 동기화
  useEffect(() => {
    if (value) {
      const [vh, vm] = value.split(':')
      setH(String(parseInt(vh, 10)))
      setM(vm)
    } else {
      setH(''); setM('')
    }
  }, [value])

  const emit = (hh: string, mm: string) => {
    if (hh === '' && mm === '') { onChange(''); return }
    const hNum = Math.max(0, Math.min(23, parseInt(hh || '0', 10)))
    const mNum = Math.max(0, Math.min(59, parseInt(mm || '0', 10)))
    onChange(`${String(hNum).padStart(2, '0')}:${String(mNum).padStart(2, '0')}`)
  }

  const handleH = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 2)
    const clamped = digits === '' ? '' : String(Math.min(23, parseInt(digits, 10)))
    setH(clamped)
    emit(clamped, m)
  }
  const handleM = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 2)
    const clamped = digits === '' ? '' : String(Math.min(59, parseInt(digits, 10)))
    setM(clamped)
    emit(h, clamped)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text" inputMode="numeric" pattern="[0-9]*" placeholder="09" maxLength={2}
        value={h} onChange={e => handleH(e.target.value)}
        className="w-16 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white text-center focus:outline-none"
      />
      <span className="text-gray-500 font-bold text-sm">시</span>
      <input
        type="text" inputMode="numeric" pattern="[0-9]*" placeholder="35" maxLength={2}
        value={m} onChange={e => handleM(e.target.value)}
        className="w-16 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white text-center focus:outline-none"
      />
      <span className="text-gray-500 font-bold text-sm">분</span>
      {(h !== '' || m !== '') && (
        <button type="button" onClick={() => { setH(''); setM(''); onChange('') }}
          className="ml-auto text-xs text-gray-600 underline">지우기</button>
      )}
    </div>
  )
}
