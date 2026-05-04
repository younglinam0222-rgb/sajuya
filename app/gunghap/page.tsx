'use client'

import { useState } from 'react'
import Link from 'next/link'

type Stage = 'input' | 'loading' | 'result'

interface GunghapResult {
  score: number
  overall: string
  love: string
  personality: string
  money: string
  longterm: string
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
const RELATIONSHIPS = ['연인', '배우자', '친구', '부모', '자녀', '직장동료', '지인', '기타']

const SECTIONS = [
  { key: 'overall', icon: '💫', title: '종합 궁합', color: '#EC4899' },
  { key: 'love', icon: '💕', title: '관계 궁합', color: '#F472B6' },
  { key: 'personality', icon: '🌟', title: '성격 궁합', color: '#8B5CF6' },
  { key: 'money', icon: '💰', title: '재물 궁합', color: '#10B981' },
  { key: 'longterm', icon: '🌙', title: '장기 궁합', color: '#3B82F6' },
  { key: 'warning', icon: '⚠️', title: '조심할 것들', color: '#EF4444' },
  { key: 'advice', icon: '🦊', title: '구미호 선생의 최종 조언', color: '#F59E0B' },
]

function PersonForm({
  label, prefix, form, onChange,
}: {
  label: string
  prefix: string
  form: Record<string, string>
  onChange: (key: string, val: string) => void
}) {
  const isPerson1 = label === '나'
  const activeColor = isPerson1 ? 'bg-pink-500' : 'bg-violet-500'
  const focusBorder = isPerson1 ? 'focus:border-pink-500' : 'focus:border-violet-500'
  const labelColor = isPerson1 ? '#EC4899' : '#8B5CF6'

  return (
    <div className="bg-gray-900 rounded-xl p-3">
      <p className="text-xs font-bold mb-2.5" style={{ color: labelColor }}>
        {isPerson1 ? '💗' : '💙'} {label}
      </p>
      <div className="space-y-2">
        <input
          type="text"
          placeholder="이름"
          value={form[`name${prefix}`] || ''}
          onChange={e => onChange(`name${prefix}`, e.target.value)}
          className={`w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none ${focusBorder}`}
        />
        <div className="grid grid-cols-3 gap-1.5">
          <select value={form[`year${prefix}`] || '1990'} onChange={e => onChange(`year${prefix}`, e.target.value)}
            className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-1 py-2 text-xs text-white focus:outline-none">
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={form[`month${prefix}`] || '1'} onChange={e => onChange(`month${prefix}`, e.target.value)}
            className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-1 py-2 text-xs text-white focus:outline-none">
            {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
          <select value={form[`day${prefix}`] || '1'} onChange={e => onChange(`day${prefix}`, e.target.value)}
            className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-1 py-2 text-xs text-white focus:outline-none">
            {DAYS.map(d => <option key={d} value={d}>{d}일</option>)}
          </select>
        </div>
        <select value={form[`hour${prefix}`] || ''} onChange={e => onChange(`hour${prefix}`, e.target.value)}
          className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none">
          {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-1.5">
          {['male', 'female'].map(g => (
            <button key={g} onClick={() => onChange(`gender${prefix}`, g)}
              className={`py-2 rounded-lg text-xs font-medium transition-all ${
                form[`gender${prefix}`] === g ? `${activeColor} text-white` : 'bg-[#0a0a0f] text-gray-400 border border-gray-700'
              }`}>
              {g === 'male' ? '남성' : '여성'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GunghapPage() {
  const [stage, setStage] = useState<Stage>('input')
  const [result, setResult] = useState<Partial<GunghapResult>>({})
  const [form, setForm] = useState<Record<string, string>>({
    name1: '', year1: '1990', month1: '1', day1: '1', hour1: '', gender1: 'female',
    name2: '', year2: '1990', month2: '1', day2: '1', hour2: '', gender2: 'male',
    relationship: '연인',
  })

  const handleChange = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.name1 || !form.name2) return
    setStage('loading')
    setResult({})

    try {
      const res = await fetch('/api/gunghap', {
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
        <div className="text-5xl mb-4 animate-pulse">🦊</div>
        <p className="text-lg font-bold mb-2">{form.name1}님과 {form.name2}님의 궁합 분석 중...</p>
        <p className="text-gray-400 text-sm mb-8">구미호 선생이 두 사람의 인연을 살펴보고 있어요</p>
        <div className="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-pink-500 rounded-full animate-pulse" style={{ width: '70%' }} />
        </div>
      </div>
    )
  }

  if (stage === 'result') {
    const score = result.score || 0
    const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : score >= 40 ? '#3B82F6' : '#EF4444'

    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
        <div className="max-w-md mx-auto px-4 pt-6">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStage('input')} className="text-gray-400 text-xl">←</button>
            <div>
              <h1 className="text-lg font-bold">{form.name1} ♥ {form.name2} 궁합</h1>
              <p className="text-gray-500 text-xs">관계: {form.relationship} · 구미호 선생의 분석</p>
            </div>
          </div>

          {score > 0 && (
            <div className="rounded-2xl p-5 mb-4 bg-[#111118] border border-gray-800 flex flex-col items-center">
              <p className="text-gray-400 text-sm mb-2">궁합 점수</p>
              <div className="text-6xl font-black mb-1" style={{ color: scoreColor }}>{score}</div>
              <p className="text-gray-500 text-sm">/ 100점</p>
              <div className="w-full h-2 bg-gray-800 rounded-full mt-3">
                <div className="h-full rounded-full" style={{ width: `${score}%`, background: scoreColor }} />
              </div>
            </div>
          )}

          <div className="space-y-3">
            {SECTIONS.map(s => {
              const content = result[s.key as keyof GunghapResult]
              if (!content) return null
              return (
                <div key={s.key} className="rounded-2xl p-4 bg-[#111118] border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{s.icon}</span>
                    <span className="font-bold text-sm" style={{ color: s.color }}>{s.title}</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{String(content)}</p>
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
            <h1 className="text-xl font-bold">🦊 궁합 해설</h1>
            <p className="text-gray-500 text-xs mt-0.5">구미호 선생의 궁합 분석 · 590원</p>
          </div>
        </div>

        <div className="bg-[#111118] rounded-2xl p-4 mb-4 border border-gray-800">
          <p className="text-xs text-pink-400 mb-3 font-medium">💕 두 사람의 정보를 입력하세요</p>

          {/* 관계 선택 */}
          <div className="mb-3">
            <label className="text-xs text-gray-400 mb-1.5 block">관계</label>
            <div className="flex flex-wrap gap-1.5">
              {RELATIONSHIPS.map(r => (
                <button key={r} onClick={() => handleChange('relationship', r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    form.relationship === r
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-900 text-gray-400 border border-gray-700'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <PersonForm label="나" prefix="1" form={form} onChange={handleChange} />
            <div className="flex items-center justify-center py-1">
              <span className="text-2xl">💗</span>
            </div>
            <PersonForm label="상대방" prefix="2" form={form} onChange={handleChange} />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!form.name1 || !form.name2}
          className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed text-white"
          style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)' }}>
          궁합 보기 🦊
        </button>
      </div>
    </div>
  )
}
