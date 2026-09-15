'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

type Stage = 'input' | 'loading' | 'result'

interface DaeunResult {
  current: string
  next10: string
  career: string
  love: string
  health: string
  warning: string
  advice: string
}

const YEARS = Array.from({ length: 80 }, (_, i) => 2005 - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const HOURS = [
  { value: '', label: '모름' },
  { value: '23', label: '자시(23~01)' },
  { value: '1', label: '축시(01~03)' },
  { value: '3', label: '인시(03~05)' },
  { value: '5', label: '묘시(05~07)' },
  { value: '7', label: '진시(07~09)' },
  { value: '9', label: '사시(09~11)' },
  { value: '11', label: '오시(11~13)' },
  { value: '13', label: '미시(13~15)' },
  { value: '15', label: '신시(15~17)' },
  { value: '17', label: '유시(17~19)' },
  { value: '19', label: '술시(19~21)' },
  { value: '21', label: '해시(21~23)' },
]

const SECTIONS = [
  { key: 'current', icon: '🌊', title: '현재 대운 분석', color: '#94b29c' },
  { key: 'next10', icon: '🔭', title: '향후 10년 흐름', color: '#8daabc' },
  { key: 'career', icon: '💼', title: '직업·재물 대운', color: '#c6a66d' },
  { key: 'love', icon: '💕', title: '인연·관계 대운', color: '#bf94a4', paid: true },
  { key: 'health', icon: '🌿', title: '건강 대운', color: '#94b29c', paid: true },
  { key: 'warning', icon: '⚠️', title: '조심할 것들', color: '#dc9292', paid: true },
  { key: 'advice', icon: '🧙', title: '무등산 신령님의 핵심 조언', color: '#c6a66d', paid: true },
]

export default function DaeunPage() {
  const [error, setError] = useState('')
  const submittingRef = useRef(false)
  const [stage, setStage] = useState<Stage>('input')
  const [result, setResult] = useState<Partial<DaeunResult>>({})
  const [calType, setCalType] = useState<'solar' | 'lunar'>('solar')
  const [form, setForm] = useState({ name: '', year: '1990', month: '1', day: '1', hour: '', gender: 'female' })

  const handleSubmit = async () => {
    if (!form.name) return
    if (submittingRef.current) return
    submittingRef.current = true
    setError('')
    setStage('loading')
    setResult({})

    try {
      const res = await fetch('/api/daeun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(310_000),
        body: JSON.stringify({ ...form, calType }),
      })
      if(!res.ok) { const d=await res.json().catch(() => ({})); throw new Error(d.error||'요청 실패') }
      if (!res.body) throw new Error('응답이 없습니다.')

      // Server has already validated and saved the complete result. Buffering avoids split UTF-8/SSE frames.
      const wire=await res.text()
      let accumulated='', complete=false
      for(const line of wire.split('\n')) {
        if(!line.startsWith('data: ')) continue
        const value=line.slice(6).trim()
        if(value==='[DONE]'){complete=true;continue}
        const event=JSON.parse(value)
        if(event.type==='error') throw new Error('해석을 완료하지 못했습니다.')
        if(typeof event.text==='string') accumulated+=event.text
      }
      if(!complete) throw new Error('연결이 끊겼습니다. 같은 입력으로 다시 확인해주세요.')
      const clean=accumulated.replace(/```json|```/g,'').trim()
      setResult(JSON.parse(clean.slice(clean.indexOf('{'),clean.lastIndexOf('}')+1)))
      setStage('result')
    } catch (e) {
      setError(e instanceof DOMException && e.name === 'TimeoutError'
        ? '응답이 늦어지고 있어요. 보관함을 확인하거나 같은 입력으로 다시 확인해주세요.'
        : e instanceof SyntaxError ? '결과를 읽지 못했어요. 같은 입력으로 다시 확인해주세요.'
        : e instanceof Error ? e.message : '해석을 완료하지 못했습니다.')
      setStage('input')
    } finally {
      submittingRef.current = false
    }
  }

  if (stage === 'loading') {
    return (
      <div className="palace-page palace-daeun min-h-screen bg-[#0c1119] flex flex-col items-center justify-center text-white px-4">
        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-[#94b29c]">
          <img src="/characters/sinryeong.png" alt="무등산 신령님" className="w-full h-full object-cover object-top" />
        </div>
        <p className="text-lg font-bold mb-2">{form.name}님의 대운 분석 중...</p>
        <p className="text-[#a7b3c3] text-sm mb-8">무등산 신령님이 대운의 흐름을 살펴보고 있어요</p>
        <div className="w-64 h-1.5 bg-[#202b39] rounded-full overflow-hidden">
          <div className="h-full bg-[#94b29c] rounded-full animate-pulse" style={{ width: '65%' }} />
        </div>
      </div>
    )
  }

  if (stage === 'result') {
    return (
      <div className="palace-page palace-daeun min-h-screen bg-[#0c1119] text-white pb-24">
        <div className="max-w-md mx-auto px-4 pt-6">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStage('input')} className="text-[#a7b3c3] text-xl">←</button>
            <div>
              <h1 className="[font-family:var(--palace-serif)] text-lg font-bold">{form.name}님의 대운 해설</h1>
              <p className="text-[#a7b3c3] text-xs">무등산 신령님의 분석 · {calType === 'solar' ? '양력' : '음력'}</p>
            </div>
          </div>
          <div className="space-y-3">
            {SECTIONS.map(s => {
              const content = result[s.key as keyof DaeunResult]
              if (!content) return null
              return (
                <div key={s.key} className="rounded-lg p-4 bg-[#17202c] border border-[#344151]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{s.icon}</span>
                    <span className="font-bold text-sm" style={{ color: s.color }}>{s.title}</span>
                    {s.paid && <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#d4bc92]/20 text-[#d4bc92]">유료</span>}
                  </div>
                  <p className="text-[#c4cdd8] text-sm leading-relaxed">{content}</p>
                </div>
              )
            })}
          </div>
          <button onClick={() => setStage('input')}
            className="w-full mt-6 py-3 rounded-lg text-sm text-[#a7b3c3] border border-[#344151]">
            다시 보기
          </button>
          <Link href="/" className="block mt-3 text-center text-[#a7b3c3] text-sm">홈으로</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="palace-page palace-daeun min-h-screen bg-[#0c1119] text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <p role="status" className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">계산 기준을 검증 중이라 지금은 이용할 수 없습니다. 이용이 가능해지면 안내해드릴게요. 엽전은 사용되지 않습니다.</p>
        {error && <p role="alert" className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-[#a7b3c3] text-xl">←</Link>
          <div>
            <h1 className="[font-family:var(--palace-serif)] text-xl font-bold">🌊 대운 해설</h1>
            <p className="text-[#a7b3c3] text-xs mt-0.5">무등산 신령님의 10년 대운 분석 · 이용 준비 중</p>
          </div>
        </div>

        <div className="bg-[#17202c] rounded-lg p-4 mb-4 border border-[#344151]">
          <p className="text-xs text-[#94b29c] mb-3 font-medium">🌿 생년월일시를 입력하세요</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#a7b3c3] mb-1.5 block">이름</label>
              <input type="text" placeholder="이름을 입력하세요" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#17202c] border border-[#455365] rounded-md px-3 py-2.5 text-sm text-white placeholder-[#9eabbd] focus:outline-none focus:border-[#94b29c]" />
            </div>

            <div>
              <label className="text-xs text-[#a7b3c3] mb-1.5 block">생년월일</label>
              {/* 양력/음력 토글 */}
              <div className="flex gap-2 mb-2">
                {(['solar', 'lunar'] as const).map(t => (
                  <button key={t} onClick={() => setCalType(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={calType === t
                      ? { background: '#94b29c', color: '#17202c' }
                      : { background: '#202b39', color: '#a7b3c3', border: '1px solid #455365' }}>
                    {t === 'solar' ? '양력' : '음력(평달)'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                  className="bg-[#17202c] border border-[#455365] rounded-md px-2 py-2.5 text-sm text-white focus:outline-none">
                  {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                  className="bg-[#17202c] border border-[#455365] rounded-md px-2 py-2.5 text-sm text-white focus:outline-none">
                  {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
                <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                  className="bg-[#17202c] border border-[#455365] rounded-md px-2 py-2.5 text-sm text-white focus:outline-none">
                  {DAYS.map(d => <option key={d} value={d}>{d}일</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-[#a7b3c3] mb-1.5 block">태어난 시간 <span className="text-[#9eabbd]">(선택)</span></label>
              <select value={form.hour} onChange={e => setForm(f => ({ ...f, hour: e.target.value }))}
                className="w-full bg-[#17202c] border border-[#455365] rounded-md px-3 py-2.5 text-sm text-white focus:outline-none">
                {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-[#a7b3c3] mb-1.5 block">성별</label>
              <div className="grid grid-cols-2 gap-2">
                {['male', 'female'].map(g => (
                  <button key={g} onClick={() => setForm(f => ({ ...f, gender: g }))}
                    className="py-2.5 rounded-md text-sm font-medium transition-all"
                    style={form.gender === g
                      ? { background: '#94b29c', color: '#17202c' }
                      : { background: '#17202c', color: '#a7b3c3', border: '1px solid #455365' }}>
                    {g === 'male' ? '남성' : '여성'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled aria-disabled="true"
          className="w-full py-4 rounded-lg font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#c6a66d', color: '#17202c' }}>
          대운 이용 준비 중
        </button>
      </div>
    </div>
  )
}
