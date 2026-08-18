'use client'

import { useState, useEffect } from 'react'

interface TimeNumberInputProps {
  value: string           // "HH:MM" 형식 또는 빈 문자열('모름')
  onChange: (value: string) => void
}

// ✅ 신규: 12지지 시진(자시~해시)은 전통 용어라 낯설어하는 사람이 많아서,
// "새벽/아침/점심·오후/저녁·밤" 4개로 더 쉽게 고를 수 있는 큰 카테고리를 추가.
// 시간을 아예 모르는 사람이 "그래도 대략 이때쯤이었다" 정도는 고를 수 있게 하는 게 목적.
const BROAD_PRESETS: { label: string; h: number; range: string }[] = [
  { label: '🌙 새벽', h: 3,  range: '00~06시' },
  { label: '☀️ 아침', h: 9,  range: '06~12시' },
  { label: '🌤️ 점심·오후', h: 15, range: '12~18시' },
  { label: '🌆 저녁·밤', h: 21, range: '18~24시' },
]

// ✅ 신규: 12지지 시진 빠른 선택칩 — 정확한 시간을 모르는 사람은 탭 한 번으로,
// 정확히 아는 사람은 아래 드롭다운으로. 둘 다 같은 h/m 상태를 쓰므로 서로 안 겹침.
const SIJIN_PRESETS: { label: string; h: number }[] = [
  { label: '자시', h: 0 }, { label: '축시', h: 2 }, { label: '인시', h: 4 }, { label: '묘시', h: 6 },
  { label: '진시', h: 8 }, { label: '사시', h: 10 }, { label: '오시', h: 12 }, { label: '미시', h: 14 },
  { label: '신시', h: 16 }, { label: '유시', h: 18 }, { label: '술시', h: 20 }, { label: '해시', h: 22 },
]

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

const selectClass = "flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white text-center focus:outline-none appearance-none"

// ✅ 수정: 숫자 직접 타이핑 방식이 "지웠다 다시 쳐야 해서 불편하다"는 피드백을 받아
// 드롭다운(select) 클릭 방식으로 전면 교체. 오차 없이 정확한 값을 그대로 고를 수 있고,
// 손가락으로 스크롤 휠을 여러 번 돌리던 예전 네이티브 <input type="time">과 달리
// 목록에서 한 번 탭하면 바로 선택되는 방식이라 빠름.
export default function TimeNumberInput({ value, onChange }: TimeNumberInputProps) {
  const [h, setH] = useState('')
  const [m, setM] = useState('')

  // 부모의 value(HH:MM)가 외부에서 바뀌는 경우(예: 쿼리 파라미터로 프리필) 동기화
  useEffect(() => {
    if (value) {
      const [vh, vm] = value.split(':')
      setH(vh); setM(vm)
    } else {
      setH(''); setM('')
    }
  }, [value])

  const emit = (hh: string, mm: string) => {
    if (hh === '' || mm === '') { onChange(''); return }
    onChange(`${hh}:${mm}`)
  }

  const handleH = (v: string) => { setH(v); emit(v, m) }
  const handleM = (v: string) => { setM(v); emit(h, v) }
  const handlePreset = (presetH: number) => {
    const hh = String(presetH).padStart(2, '0')
    setH(hh); setM('00'); emit(hh, '00')
  }
  const handleClear = () => { setH(''); setM(''); onChange('') }

  return (
    <div>
      <div className="flex items-center gap-2">
        <select value={h} onChange={e => handleH(e.target.value)} className={selectClass}>
          <option value="">시</option>
          {HOURS.map(hh => <option key={hh} value={hh}>{hh}시</option>)}
        </select>
        <select value={m} onChange={e => handleM(e.target.value)} className={selectClass}>
          <option value="">분</option>
          {MINUTES.map(mm => <option key={mm} value={mm}>{mm}분</option>)}
        </select>
        {(h !== '' || m !== '') && (
          <button type="button" onClick={handleClear}
            className="text-xs text-gray-600 underline flex-shrink-0">지우기</button>
        )}
      </div>
      <div>
        <p className="text-[10px] text-gray-500 mb-1">💭 시간을 전혀 모르면 — 대략 이때쯤이었다 싶은 것만 골라도 돼요</p>
        <div className="flex flex-wrap gap-1.5">
          {BROAD_PRESETS.map(p => (
            <button key={p.label} type="button" onClick={() => handlePreset(p.h)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-gray-900 border border-gray-700 text-gray-300 active:bg-gray-800">
              {p.label} <span className="text-gray-600">({p.range})</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {SIJIN_PRESETS.map(p => (
          <button key={p.label} type="button" onClick={() => handlePreset(p.h)}
            className="px-2 py-1 rounded-lg text-[10px] font-medium bg-gray-900 border border-gray-800 text-gray-500 active:bg-gray-800">
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mt-1">시간을 정확히 아시면 위 드롭다운에서 직접 선택, 어느 정도 아시면 12시진 버튼을, 전혀 모르시면 맨 위 큰 카테고리를 눌러주세요.</p>
    </div>
  )
}
