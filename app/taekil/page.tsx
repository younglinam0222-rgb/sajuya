'use client'

import { useState } from 'react'
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
  const [stage, setStage] = useState<Stage>('input')
  const [result, setResult] = useState<Partial<TaekilResult>>({})
  const [calType, setCalType] = useState<'solar' | 'lunar'>('solar')
  const [form, setForm] = useState({
    name: '', year: '1990', month: '1', day: '1', gender: 'female',
    eventType: '결혼', targetYear: String(currentYear), targetMonth: String(new Date().getMonth() + 1),
  })

  const handleSubmit = async () => {
    if (!form.name) return
    setStage('loading')
    setResult({})

    try {
      const res = await fetch('/api/taekil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, calType }),
      })
      if (!res.body) return

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                accumulated += parsed.text
                try {
                  const clean = accumulated.replace(/```json/g, '').replace(/```/g, '').trim()
                  const s = clean.indexOf('{')
                  const e = clean.lastIndexOf('}')
                  if (s !== -1 && e !== -1) setResult(JSON.parse(clean.slice(s, e + 1)))
                } catch {}
              }
            } catch {}
          }
        }
      }
      setStage('result')
    } catch (e) {
      console.error(e)
      setStage('input')
    }
  }

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-4">
        <div className="text-5xl mb-4">🗓️</div>
        <p className="text-lg font-bold mb-2">{form.name}님의 {form.eventType} 길일 선정 중...</p>
        <p className="text-gray-400 text-sm mb-8">최고의 날을 찾고 있어요</p>
        <div className="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full animate-pulse" style={{ width: '60%' }} />
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
    const rankColors = ['#F59E0B', '#9CA3AF', '#CD7C3A']
    const rankLabels = ['최길일 🥇', '2위 🥈', '3위 🥉']

    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
        <div className="max-w-md mx-auto px-4 pt-6">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStage('input')} className="text-gray-400 text-xl">←</button>
            <div>
              <h1 className="text-lg font-bold">{form.name}님의 {form.eventType} 길일</h1>
              <p className="text-gray-500 text-xs">{form.targetYear}년 {form.targetMonth}월 · {calType === 'solar' ? '양력' : '음력'}</p>
            </div>
          </div>

          {result.intro && (
            <div className="rounded-2xl p-4 mb-3 bg-[#111118] border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span>✨</span>
                <span className="font-bold text-sm text-yellow-400">택일 총평</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{result.intro}</p>
            </div>
          )}

          <div className="space-y-3 mb-3">
            {bestDates.map(({ data, rank }) => {
              if (!data) return null
              return (
                <div key={rank} className="rounded-2xl p-4 bg-[#111118]"
                  style={{ border: `1px solid ${rankColors[rank - 1]}50` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-sm" style={{ color: rankColors[rank - 1] }}>{rankLabels[rank - 1]}</span>
                  </div>
                  <p className="font-bold text-base mb-1 text-white">{data.date}</p>
                  <p className="text-gray-400 text-xs mb-2">⏰ {data.time}</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{data.reason}</p>
                </div>
              )
            })}
          </div>

          {result.avoid && (
            <div className="rounded-2xl p-4 mb-3 bg-[#111118] border border-red-900/30">
              <div className="flex items-center gap-2 mb-2">
                <span>🚫</span>
                <span className="font-bold text-sm text-red-400">피해야 할 날</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{result.avoid}</p>
            </div>
          )}

          {result.preparation && (
            <div className="rounded-2xl p-4 mb-3 bg-[#111118] border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span>📋</span>
                <span className="font-bold text-sm text-blue-400">준비사항</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{result.preparation}</p>
            </div>
          )}

          {result.warning && (
            <div className="rounded-2xl p-4 mb-3 bg-[#111118] border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span>⚠️</span>
                <span className="font-bold text-sm text-red-400">조심할 것들</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{result.warning}</p>
            </div>
          )}

          <button onClick={() => setStage('input')}
            className="w-full mt-3 py-3 rounded-2xl text-sm text-gray-400 border border-gray-800">
            다시 보기
          </button>
          <Link href="/" className="block mt-3 text-center text-gray-500 text-sm">홈으로</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-gray-400 text-xl">←</Link>
          <div>
            <h1 className="text-xl font-bold">📅 택일</h1>
            <p className="text-gray-500 text-xs mt-0.5">중요한 날의 길일 선정 · 일부 무료</p>
          </div>
        </div>

        <div className="bg-[#111118] rounded-2xl p-4 mb-4 border border-gray-800">
          <p className="text-xs text-violet-400 mb-3 font-medium">🗓️ 정보를 입력하세요</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">이름</label>
              <input type="text" placeholder="이름을 입력하세요" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500" />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">생년월일</label>
              {/* 양력/음력 토글 */}
              <div className="flex gap-2 mb-2">
                {(['solar', 'lunar'] as const).map(t => (
                  <button key={t} onClick={() => setCalType(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={calType === t
                      ? { background: '#7C3AED', color: 'white' }
                      : { background: '#1F2937', color: '#9CA3AF', border: '1px solid #374151' }}>
                    {t === 'solar' ? '양력' : '음력'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none">
                  {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none">
                  {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
                <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none">
                  {DAYS.map(d => <option key={d} value={d}>{d}일</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">성별</label>
              <div className="grid grid-cols-2 gap-2">
                {['male', 'female'].map(g => (
                  <button key={g} onClick={() => setForm(f => ({ ...f, gender: g }))}
                    className="py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={form.gender === g
                      ? { background: '#7C3AED', color: 'white' }
                      : { background: '#111827', color: '#9CA3AF', border: '1px solid #374151' }}>
                    {g === 'male' ? '남성' : '여성'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">행사 종류</label>
              <div className="grid grid-cols-3 gap-2">
                {EVENT_TYPES.map(e => (
                  <button key={e.value} onClick={() => setForm(f => ({ ...f, eventType: e.value }))}
                    className="py-2.5 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1"
                    style={form.eventType === e.value
                      ? { background: '#7C3AED', color: 'white' }
                      : { background: '#111827', color: '#9CA3AF', border: '1px solid #374151' }}>
                    <span className="text-lg">{e.icon}</span>
                    <span className="text-xs">{e.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">희망 기간</label>
              <div className="grid grid-cols-2 gap-2">
                <select value={form.targetYear} onChange={e => setForm(f => ({ ...f, targetYear: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none">
                  {TARGET_YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select value={form.targetMonth} onChange={e => setForm(f => ({ ...f, targetMonth: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none">
                  {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={!form.name}
          className="w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}>
          길일 찾기 →
        </button>
      </div>
    </div>
  )
}
