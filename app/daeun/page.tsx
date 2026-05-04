'use client'

import { useState } from 'react'
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

const FREE_SECTIONS = ['current', 'next10', 'career']
const SECTIONS = [
  { key: 'current', icon: '🌊', title: '현재 대운 분석', color: '#10B981' },
  { key: 'next10', icon: '🔭', title: '향후 10년 흐름', color: '#3B82F6' },
  { key: 'career', icon: '💼', title: '직업·재물 대운', color: '#F59E0B' },
  { key: 'love', icon: '💕', title: '인연·관계 대운', color: '#EC4899', paid: true },
  { key: 'health', icon: '🌿', title: '건강 대운', color: '#10B981', paid: true },
  { key: 'warning', icon: '⚠️', title: '조심할 것들', color: '#EF4444', paid: true },
  { key: 'advice', icon: '🧙', title: '무등산 신령님의 핵심 조언', color: '#8B5CF6', paid: true },
]

export default function DaeunPage() {
  const [stage, setStage] = useState<Stage>('input')
  const [result, setResult] = useState<Partial<DaeunResult>>({})
  const [form, setForm] = useState({ name: '', year: '1990', month: '1', day: '1', hour: '', gender: 'female' })

  const handleSubmit = async () => {
    if (!form.name) return
    setStage('loading')
    setResult({})

    try {
      const res = await fetch('/api/daeun', {
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
        <div className="text-5xl mb-4">🧙</div>
        <p className="text-lg font-bold mb-2">{form.name}님의 대운 분석 중...</p>
        <p className="text-gray-400 text-sm mb-8">무등산 신령님이 대운의 흐름을 살펴보고 있어요</p>
        <div className="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full animate-pulse" style={{ width: '65%' }} />
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
              <h1 className="text-lg font-bold">{form.name}님의 대운 해설</h1>
              <p className="text-gray-500 text-xs">무등산 신령님의 분석</p>
            </div>
          </div>

          <div className="space-y-3">
            {SECTIONS.map(s => {
              const content = result[s.key as keyof DaeunResult]
              if (!content) return null
              return (
                <div key={s.key} className="rounded-2xl p-4 bg-[#111118] border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{s.icon}</span>
                    <span className="font-bold text-sm" style={{ color: s.color }}>{s.title}</span>
                    {s.paid && <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">유료</span>}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{content}</p>
                </div>
              )
            })}
          </div>

          <button onClick={() => setStage('input')}
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
            <h1 className="text-xl font-bold">🌊 대운 해설</h1>
            <p className="text-gray-500 text-xs mt-0.5">무등산 신령님의 10년 대운 분석 · 일부 무료</p>
          </div>
        </div>

        <div className="bg-[#111118] rounded-2xl p-4 mb-4 border border-gray-800">
          <p className="text-xs text-green-400 mb-3 font-medium">🌿 생년월일시를 입력하세요</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">이름</label>
              <input type="text" placeholder="이름을 입력하세요" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">생년월일</label>
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
              <label className="text-xs text-gray-400 mb-1.5 block">태어난 시간 <span className="text-gray-600">(선택)</span></label>
              <select value={form.hour} onChange={e => setForm(f => ({ ...f, hour: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">성별</label>
              <div className="grid grid-cols-2 gap-2">
                {['male', 'female'].map(g => (
                  <button key={g} onClick={() => setForm(f => ({ ...f, gender: g }))}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                      form.gender === g ? 'bg-green-500 text-white' : 'bg-gray-900 text-gray-400 border border-gray-700'
                    }`}>
                    {g === 'male' ? '남성' : '여성'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={!form.name}
          className="w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #10B981, #3B82F6)' }}>
          대운 분석하기 🧙
        </button>
      </div>
    </div>
  )
}
