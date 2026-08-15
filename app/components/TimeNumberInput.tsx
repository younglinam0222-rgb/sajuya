'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'

interface TimeNumberInputProps {
  value: string           // "HH:MM" 형식 또는 빈 문자열('모름')
  onChange: (value: string) => void
}

// ✅ 신규: 12지지 시진 빠른 선택칩 — 정확한 시간을 모르는 사람은 탭 한 번으로,
// 정확히 아는 사람은 아래 숫자 입력으로. 둘 다 같은 h/m 상태를 쓰므로 서로 안 겹침.
const SIJIN_PRESETS: { label: string; h: number }[] = [
  { label: '자시', h: 0 }, { label: '축시', h: 2 }, { label: '인시', h: 4 }, { label: '묘시', h: 6 },
  { label: '진시', h: 8 }, { label: '사시', h: 10 }, { label: '오시', h: 12 }, { label: '미시', h: 14 },
  { label: '신시', h: 16 }, { label: '유시', h: 18 }, { label: '술시', h: 20 }, { label: '해시', h: 22 },
]

// ✅ 신규: 네이티브 <input type="time"> 대신 숫자 두 칸(시/분) 직접 입력
// 모바일에서 시간 선택기 스크롤 휠 돌리는 것보다 숫자 타이핑이 더 빠름
export default function TimeNumberInput({ value, onChange }: TimeNumberInputProps) {
  const [h, setH] = useState('')
  const [m, setM] = useState('')
  const hourRef = useRef<HTMLInputElement>(null)
  const minuteRef = useRef<HTMLInputElement>(null)

  // 부모의 value(HH:MM)가 외부에서 바뀌는 경우(예: 쿼리 파라미터로 프리필) 동기화
  useEffect(() => {
    if (value) {
      const [vh, vm] = value.split(':')
      setH(vh)
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

  // ✅ 수정: 타이핑 도중엔 입력한 숫자를 그대로 유지 (parseInt로 즉시 변환하면
  // "0"→"9" 순서로 입력할 때 앞자리 0이 사라져 화면이 튀어 보이던 문제 해결).
  // 정리(패딩/범위 보정)는 blur 시점에만 한다.
  const handleH = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 2)
    setH(digits)
    emit(digits, m)
    // ✅ 신규: 두 자리 다 입력되면 자동으로 분(分) 칸으로 이동 — OTP 입력창처럼 끊김 없이 이어짐
    if (digits.length === 2) minuteRef.current?.focus()
  }
  const handleM = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 2)
    setM(digits)
    emit(h, digits)
  }
  const handleHBlur = () => {
    if (h === '') return
    const clamped = String(Math.min(23, parseInt(h, 10))).padStart(2, '0')
    setH(clamped); emit(clamped, m)
  }
  const handleMBlur = () => {
    if (m === '') return
    const clamped = String(Math.min(59, parseInt(m, 10))).padStart(2, '0')
    setM(clamped); emit(h, clamped)
  }
  // ✅ 신규: 분 칸이 비어있는 상태에서 백스페이스 누르면 자동으로 시 칸으로 돌아가서 선택
  const handleMKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && m === '') {
      e.preventDefault()
      hourRef.current?.focus()
    }
  }
  const handlePreset = (presetH: number) => {
    const hStr = String(presetH).padStart(2, '0')
    setH(hStr); setM('00')
    emit(hStr, '00')
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          ref={hourRef}
          type="text" inputMode="numeric" pattern="[0-9]*" placeholder="00" maxLength={2}
          value={h} onChange={e => handleH(e.target.value)} onBlur={handleHBlur}
          onFocus={e => e.target.select()} onClick={e => e.currentTarget.select()}
          className="w-16 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white text-center transition-colors duration-150 focus:outline-none focus:border-gray-400"
        />
        <span className="text-gray-500 font-bold text-sm">시</span>
        <input
          ref={minuteRef}
          type="text" inputMode="numeric" pattern="[0-9]*" placeholder="00" maxLength={2}
          value={m} onChange={e => handleM(e.target.value)} onBlur={handleMBlur} onKeyDown={handleMKeyDown}
          onFocus={e => e.target.select()} onClick={e => e.currentTarget.select()}
          className="w-16 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white text-center transition-colors duration-150 focus:outline-none focus:border-gray-400"
        />
        <span className="text-gray-500 font-bold text-sm">분</span>
        {(h !== '' || m !== '') && (
          <button type="button" onClick={() => { setH(''); setM(''); onChange('') }}
            className="ml-auto text-xs text-gray-600 underline">지우기</button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {SIJIN_PRESETS.map(p => (
          <button key={p.label} type="button" onClick={() => handlePreset(p.h)}
            className="px-2 py-1 rounded-lg text-[10px] font-medium bg-gray-900 border border-gray-800 text-gray-500 active:bg-gray-800">
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mt-1">시간을 정확히 아시면 숫자로 직접 입력, 대략적인 시간대만 아시면 위 시진 버튼을 눌러주세요.</p>
    </div>
  )
}
