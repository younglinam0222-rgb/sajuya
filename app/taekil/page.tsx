'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

type Stage = 'input' | 'loading' | 'result'

interface BestDate {
  date: string
  reason: string
  time: string
}

interface TaekilResult {
  intro: string
  best1: BestDate
  best2: BestDate
  best3: BestDate
  avoid: string
  preparation: string
  warning: string
}

const YEARS = Array.from({ length: 80 }, (_, i) => 2005 - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const currentYear = new Date().getFullYear()
const TARGET_YEARS = Array.from({ length: 3 }, (_, i) => currentYear + i)

const EVENT_TYPES = [
  { value: '결혼', icon: '💍', label: '결혼' },
  { value: '이사', icon: '🏠', label: '이사' },
  { value: '개업', icon: '🏪', label: '개업' },
  { value: '계약', icon: '📝', label: '계약' },
  { value: '여행', icon: '✈️', label: '여행' },
  { value: '수술', icon: '🏥', label: '수술' },
]

export default function TaekilPage() {
  const [error, setError] = useState('')
  const submittingRef = useRef(false)
  const [stage, setStage] = useState<Stage>('input')
  const [result, setResult] = useState<Partial<TaekilResult>>({})
  const [calType, setCalType] = useState<'solar' | 'lunar'>('solar')
  const [form, setForm] = useState({
    name: '', year: '1990', month: '1', day: '1', gender: 'female',
    eventType: '결혼', targetYear: String(currentYear), targetMonth: String(new Date().getMonth() + 1),
  })

  const handleSubmit = async () => {
    if (!form.name) return
    if (submittingRef.current) return
    submittingRef.current = true
    setError('')
    setStage('loading')
    setResult({})

    try {
      const res = await fetch('/api/taekil', {
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
      <div className="palace-page palace-taekil min-h-screen bg-[#0c1119] flex flex-col items-center justify-center text-white px-4">
        <div className="text-5xl mb-4">🗓️</div>
        <p className="text-lg font-bold mb-2">{form.name}님의 {form.eventType} 길일 선정 중...</p>
        <p className="text-[#a7b3c3] text-sm mb-8">최고의 날을 찾고 있어요</p>
        <div className="w-64 h-1.5 bg-[#202b39] rounded-full overflow-hidden">
          <div className="h-full bg-[#c6a66d] rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    )
  }

  if (stage === 'result') {
    const bestDates = [
      { data: result.best1, rank: 1 },
      { data: result.best2, rank: 2 },
      { data: result.best3, rank: 3 },
    ]
    const rankColors = ['#c6a66d', '#a7b3c3', '#CD7C3A']
    const rankLabels = ['최길일 🥇', '2위 🥈', '3위 🥉']

    return (
      <div className="palace-page palace-taekil min-h-screen bg-[#0c1119] text-white pb-24">
        <div className="max-w-md mx-auto px-4 pt-6">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStage('input')} className="text-[#a7b3c3] text-xl">←</button>
            <div>
              <h1 className="[font-family:var(--palace-serif)] text-lg font-bold">{form.name}님의 {form.eventType} 길일</h1>
              <p className="text-[#a7b3c3] text-xs">{form.targetYear}년 {form.targetMonth}월 · {calType === 'solar' ? '양력' : '음력'}</p>
            </div>
          </div>

          {result.intro && (
            <div className="rounded-lg p-4 mb-3 bg-[#17202c] border border-[#344151]">
              <div className="flex items-center gap-2 mb-2">
                <span>✨</span>
                <span className="font-bold text-sm text-[#d4bc92]">택일 총평</span>
              </div>
              <p className="text-[#c4cdd8] text-sm leading-relaxed">{result.intro}</p>
            </div>
          )}

          <div className="space-y-3 mb-3">
            {bestDates.map(({ data, rank }) => {
              if (!data) return null
              return (
                <div key={rank} className="rounded-lg p-4 bg-[#17202c]"
                  style={{ border: `1px solid ${rankColors[rank - 1]}50` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-sm" style={{ color: rankColors[rank - 1] }}>{rankLabels[rank - 1]}</span>
                  </div>
                  <p className="font-bold text-base mb-1 text-white">{data.date}</p>
                  <p className="text-[#a7b3c3] text-xs mb-2">⏰ {data.time}</p>
                  <p className="text-[#c4cdd8] text-sm leading-relaxed">{data.reason}</p>
                </div>
              )
            })}
          </div>

          {result.avoid && (
            <div className="rounded-lg p-4 mb-3 bg-[#17202c] border border-red-900/30">
              <div className="flex items-center gap-2 mb-2">
                <span>🚫</span>
                <span className="font-bold text-sm text-red-400">피해야 할 날</span>
              </div>
              <p className="text-[#c4cdd8] text-sm leading-relaxed">{result.avoid}</p>
            </div>
          )}

          {result.preparation && (
            <div className="rounded-lg p-4 mb-3 bg-[#17202c] border border-[#344151]">
              <div className="flex items-center gap-2 mb-2">
                <span>📋</span>
                <span className="font-bold text-sm text-[#8daabc]">준비사항</span>
              </div>
              <p className="text-[#c4cdd8] text-sm leading-relaxed">{result.preparation}</p>
            </div>
          )}

          {result.warning && (
            <div className="rounded-lg p-4 mb-3 bg-[#17202c] border border-[#344151]">
              <div className="flex items-center gap-2 mb-2">
                <span>⚠️</span>
                <span className="font-bold text-sm text-red-400">조심할 것들</span>
              </div>
              <p className="text-[#c4cdd8] text-sm leading-relaxed">{result.warning}</p>
            </div>
          )}

          <button onClick={() => setStage('input')}
            className="w-full mt-3 py-3 rounded-lg text-sm text-[#a7b3c3] border border-[#344151]">
            다시 보기
          </button>
          <Link href="/" className="block mt-3 text-center text-[#a7b3c3] text-sm">홈으로</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="palace-page palace-taekil min-h-screen bg-[#0c1119] text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <p role="status" className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">계산 기준을 검증 중이라 지금은 이용할 수 없습니다. 이용이 가능해지면 안내해드릴게요. 엽전은 사용되지 않습니다.</p>
        {error && <p role="alert" className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-[#a7b3c3] text-xl">←</Link>
          <div>
            <h1 className="[font-family:var(--palace-serif)] text-xl font-bold">📅 택일</h1>
            <p className="text-[#a7b3c3] text-xs mt-0.5">중요한 날의 길일 선정 · 이용 준비 중</p>
          </div>
        </div>

        <div className="bg-[#17202c] rounded-lg p-4 mb-4 border border-[#344151]">
          <p className="text-xs text-[#c6a66d] mb-3 font-medium">🗓️ 정보를 입력하세요</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#a7b3c3] mb-1.5 block">이름</label>
              <input type="text" placeholder="이름을 입력하세요" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#17202c] border border-[#455365] rounded-md px-3 py-2.5 text-sm text-white placeholder-[#9eabbd] focus:outline-none focus:border-[#c6a66d]" />
            </div>

            <div>
              <label className="text-xs text-[#a7b3c3] mb-1.5 block">생년월일</label>
              {/* 양력/음력 토글 */}
              <div className="flex gap-2 mb-2">
                {(['solar', 'lunar'] as const).map(t => (
                  <button key={t} onClick={() => setCalType(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={calType === t
                      ? { background: '#c6a66d', color: '#17202c' }
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
              <label className="text-xs text-[#a7b3c3] mb-1.5 block">성별</label>
              <div className="grid grid-cols-2 gap-2">
                {['male', 'female'].map(g => (
                  <button key={g} onClick={() => setForm(f => ({ ...f, gender: g }))}
                    className="py-2.5 rounded-md text-sm font-medium transition-all"
                    style={form.gender === g
                      ? { background: '#c6a66d', color: '#17202c' }
                      : { background: '#17202c', color: '#a7b3c3', border: '1px solid #455365' }}>
                    {g === 'male' ? '남성' : '여성'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-[#a7b3c3] mb-1.5 block">행사 종류</label>
              <div className="grid grid-cols-3 gap-2">
                {EVENT_TYPES.map(e => (
                  <button key={e.value} onClick={() => setForm(f => ({ ...f, eventType: e.value }))}
                    className="py-2.5 rounded-md text-sm font-medium transition-all flex flex-col items-center gap-1"
                    style={form.eventType === e.value
                      ? { background: '#c6a66d', color: '#17202c' }
                      : { background: '#17202c', color: '#a7b3c3', border: '1px solid #455365' }}>
                    <span className="text-lg">{e.icon}</span>
                    <span className="text-xs">{e.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-[#a7b3c3] mb-1.5 block">희망 기간</label>
              <div className="grid grid-cols-2 gap-2">
                <select value={form.targetYear} onChange={e => setForm(f => ({ ...f, targetYear: e.target.value }))}
                  className="bg-[#17202c] border border-[#455365] rounded-md px-2 py-2.5 text-sm text-white focus:outline-none">
                  {TARGET_YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select value={form.targetMonth} onChange={e => setForm(f => ({ ...f, targetMonth: e.target.value }))}
                  className="bg-[#17202c] border border-[#455365] rounded-md px-2 py-2.5 text-sm text-white focus:outline-none">
                  {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled aria-disabled="true"
          className="w-full py-4 rounded-lg font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#c6a66d', color: '#17202c' }}>
          택일 이용 준비 중
        </button>
      </div>
    </div>
  )
}
