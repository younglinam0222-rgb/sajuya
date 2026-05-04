'use client'

import { useState } from 'react'
import Link from 'next/link'

type Stage = 'input' | 'loading' | 'result'

interface DailyResult {
  overall: string
  money: string
  love: string
  health: string
  lucky: string
  warning: string
}

const YEARS = Array.from({ length: 80 }, (_, i) => 2005 - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

const today = new Date()
const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`

const SECTIONS = [
  { key: 'overall', icon: '⭐', title: '오늘의 총운', color: '#F59E0B' },
  { key: 'money', icon: '💰', title: '재물운', color: '#10B981' },
  { key: 'love', icon: '💕', title: '연애운', color: '#EC4899' },
  { key: 'health', icon: '🌿', title: '건강운', color: '#3B82F6' },
  { key: 'lucky', icon: '🍀', title: '행운 포인트', color: '#8B5CF6' },
  { key: 'warning', icon: '⚠️', title: '오늘 조심할 것', color: '#EF4444' },
]

export default function DailyPage() {
  const [stage, setStage] = useState<Stage>('input')
  const [result, setResult] = useState<Partial<DailyResult>>({})
  const [rawText, setRawText] = useState('')
  const [form, setForm] = useState({ name: '', year: '1990', month: '1', day: '1', gender: 'female' })

  const handleSubmit = async () => {
    if (!form.name || !form.year) return
    setStage('loading')
    setResult({})
    setRawText('')

    try {
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.body) return

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                accumulated += parsed.text
                setRawText(accumulated)
                // Try to parse JSON progressively
                try {
                  const clean = accumulated.replace(/```json/g, '').replace(/```/g, '').trim()
                  const start = clean.indexOf('{')
                  const end = clean.lastIndexOf('}')
                  if (start !== -1 && end !== -1) {
                    const partial = JSON.parse(clean.slice(start, end + 1))
                    setResult(partial)
                  }
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
        <div className="text-5xl mb-6 animate-bounce">⭐</div>
        <p className="text-lg font-bold mb-2">{form.name}님의 오늘 운세 분석 중...</p>
        <p className="text-gray-400 text-sm mb-8">{todayStr}</p>
        <div className="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-500 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    )
  }

  if (stage === 'result') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
        <div className="max-w-md mx-auto px-4 pt-6">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStage('input')} className="text-gray-400 text-xl">←</button>
            <div>
              <h1 className="text-lg font-bold">{form.name}님의 일일 운세</h1>
              <p className="text-gray-500 text-xs">{todayStr}</p>
            </div>
          </div>

          <div className="space-y-3">
            {SECTIONS.map(s => {
              const content = result[s.key as keyof DailyResult]
              if (!content) return null
              return (
                <div key={s.key} className="rounded-2xl p-4 bg-[#111118] border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{s.icon}</span>
                    <span className="font-bold text-sm" style={{ color: s.color }}>{s.title}</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{content}</p>
                </div>
              )
            })}
          </div>

          <button
            onClick={() => setStage('input')}
            className="w-full mt-6 py-3 rounded-2xl text-sm text-gray-400 border border-gray-800">
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
            <h1 className="text-xl font-bold">⭐ 일일 운세</h1>
            <p className="text-gray-500 text-xs mt-0.5">{todayStr} · 무료</p>
          </div>
        </div>

        <div className="bg-[#111118] rounded-2xl p-4 mb-4 border border-gray-800">
          <p className="text-xs text-yellow-400 mb-3 font-medium">✨ 오늘 하루의 운세를 확인하세요</p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">이름</label>
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">생년월일</label>
              <div className="grid grid-cols-3 gap-2">
                <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500">
                  {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500">
                  {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
                <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500">
                  {DAYS.map(d => <option key={d} value={d}>{d}일</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">성별</label>
              <div className="grid grid-cols-2 gap-2">
                {['male', 'female'].map(g => (
                  <button key={g}
                    onClick={() => setForm(f => ({ ...f, gender: g }))}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                      form.gender === g
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-900 text-gray-400 border border-gray-700'
                    }`}>
                    {g === 'male' ? '남성' : '여성'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!form.name}
          className="w-full py-4 rounded-2xl font-bold text-base bg-yellow-500 text-black disabled:opacity-40 disabled:cursor-not-allowed">
          오늘의 운세 보기 ✨
        </button>
      </div>
    </div>
  )
}
