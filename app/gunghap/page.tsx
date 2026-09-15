'use client'

import { useState, useRef } from 'react'
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
  { key: 'overall', icon: '💫', title: '종합 궁합', color: '#bf94a4' },
  { key: 'love', icon: '💕', title: '관계 궁합', color: '#c9a6b1' },
  { key: 'personality', icon: '🌟', title: '성격 궁합', color: '#c6a66d' },
  { key: 'money', icon: '💰', title: '재물 궁합', color: '#94b29c' },
  { key: 'longterm', icon: '🌙', title: '장기 궁합', color: '#8daabc' },
  { key: 'warning', icon: '⚠️', title: '조심할 것들', color: '#dc9292' },
  { key: 'advice', icon: '🦊', title: '구미호 선생의 최종 조언', color: '#c6a66d' },
]

function PersonForm({
  label, prefix, form, onChange, calType, onCalTypeChange,
}: {
  label: string
  prefix: string
  form: Record<string, string>
  onChange: (key: string, val: string) => void
  calType: 'solar' | 'lunar'
  onCalTypeChange: (t: 'solar' | 'lunar') => void
}) {
  const isPerson1 = label === '나'
  const activeColor = isPerson1 ? '#bf94a4' : '#c6a66d'
  const labelColor = isPerson1 ? '#bf94a4' : '#c6a66d'

  return (
    <div className="bg-[#17202c] rounded-md p-3">
      <p className="text-xs font-bold mb-2.5" style={{ color: labelColor }}>
        {isPerson1 ? '💗' : '💙'} {label}
      </p>
      <div className="space-y-2">
        <input type="text" placeholder="이름"
          value={form[`name${prefix}`] || ''}
          onChange={e => onChange(`name${prefix}`, e.target.value)}
          className="w-full bg-[#0c1119] border border-[#455365] rounded-lg px-3 py-2 text-sm text-white placeholder-[#9eabbd] focus:outline-none" />

        {/* 양력/음력 토글 */}
        <div className="flex gap-2">
          {(['solar', 'lunar'] as const).map(t => (
            <button key={t} onClick={() => onCalTypeChange(t)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={calType === t
                ? { background: activeColor, color: '#17202c' }
                : { background: '#202b39', color: '#a7b3c3', border: '1px solid #455365' }}>
              {t === 'solar' ? '양력' : '음력(평달)'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <select value={form[`year${prefix}`] || '1990'} onChange={e => onChange(`year${prefix}`, e.target.value)}
            className="bg-[#0c1119] border border-[#455365] rounded-lg px-1 py-2 text-xs text-white focus:outline-none">
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={form[`month${prefix}`] || '1'} onChange={e => onChange(`month${prefix}`, e.target.value)}
            className="bg-[#0c1119] border border-[#455365] rounded-lg px-1 py-2 text-xs text-white focus:outline-none">
            {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
          <select value={form[`day${prefix}`] || '1'} onChange={e => onChange(`day${prefix}`, e.target.value)}
            className="bg-[#0c1119] border border-[#455365] rounded-lg px-1 py-2 text-xs text-white focus:outline-none">
            {DAYS.map(d => <option key={d} value={d}>{d}일</option>)}
          </select>
        </div>
        <select value={form[`hour${prefix}`] || ''} onChange={e => onChange(`hour${prefix}`, e.target.value)}
          className="w-full bg-[#0c1119] border border-[#455365] rounded-lg px-2 py-2 text-xs text-white focus:outline-none">
          {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-1.5">
          {['male', 'female'].map(g => (
            <button key={g} onClick={() => onChange(`gender${prefix}`, g)}
              className="py-2 rounded-lg text-xs font-medium transition-all"
              style={form[`gender${prefix}`] === g
                ? { background: activeColor, color: '#17202c' }
                : { background: '#0c1119', color: '#a7b3c3', border: '1px solid #455365' }}>
              {g === 'male' ? '남성' : '여성'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GunghapPage() {
  const [error, setError] = useState('')
  const submittingRef = useRef(false)
  const [stage, setStage] = useState<Stage>('input')
  const [result, setResult] = useState<Partial<GunghapResult>>({})
  const [calType1, setCalType1] = useState<'solar' | 'lunar'>('solar')
  const [calType2, setCalType2] = useState<'solar' | 'lunar'>('solar')
  const [form, setForm] = useState<Record<string, string>>({
    name1: '', year1: '1990', month1: '1', day1: '1', hour1: '', gender1: 'female',
    name2: '', year2: '1990', month2: '1', day2: '1', hour2: '', gender2: 'male',
    relationship: '연인',
  })

  const handleChange = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.name1 || !form.name2) return
    if (submittingRef.current) return
    submittingRef.current = true
    setError('')
    setStage('loading')
    setResult({})

    try {
      const res = await fetch('/api/gunghap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(310_000),
        body: JSON.stringify({ ...form, calType1, calType2 }),
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
      <div className="palace-page palace-gunghap min-h-screen bg-[#0c1119] flex flex-col items-center justify-center text-white px-4">
        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-[#bf94a4]">
          <img src="/characters/gumiho.png" alt="구미호" className="w-full h-full object-cover object-top" />
        </div>
        <p className="text-lg font-bold mb-2">{form.name1}님과 {form.name2}님의 궁합 분석 중...</p>
        <p className="text-[#a7b3c3] text-sm mb-8">구미호 선생이 두 사람의 인연을 살펴보고 있어요</p>
        <div className="w-64 h-1.5 bg-[#202b39] rounded-full overflow-hidden">
          <div className="h-full bg-[#bf94a4] rounded-full animate-pulse" style={{ width: '70%' }} />
        </div>
      </div>
    )
  }

  if (stage === 'result') {
    const score = result.score || 0
    const scoreColor = score >= 80 ? '#94b29c' : score >= 60 ? '#c6a66d' : score >= 40 ? '#8daabc' : '#dc9292'

    return (
      <div className="palace-page palace-gunghap min-h-screen bg-[#0c1119] text-white pb-24">
        <div className="max-w-md mx-auto px-4 pt-6">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStage('input')} className="text-[#a7b3c3] text-xl">←</button>
            <div>
              <h1 className="[font-family:var(--palace-serif)] text-lg font-bold">{form.name1} ♥ {form.name2} 궁합</h1>
              <p className="text-[#a7b3c3] text-xs">관계: {form.relationship} · 구미호 선생의 분석</p>
            </div>
          </div>

          {score > 0 && (
            <div className="rounded-lg p-5 mb-4 bg-[#17202c] border border-[#344151] flex flex-col items-center">
              <p className="text-[#a7b3c3] text-sm mb-2">궁합 점수</p>
              <div className="text-6xl font-semibold mb-1" style={{ color: scoreColor }}>{score}</div>
              <p className="text-[#a7b3c3] text-sm">/ 100점</p>
              <div className="w-full h-2 bg-[#202b39] rounded-full mt-3">
                <div className="h-full rounded-full" style={{ width: `${score}%`, background: scoreColor }} />
              </div>
            </div>
          )}

          <div className="space-y-3">
            {SECTIONS.map(s => {
              const content = result[s.key as keyof GunghapResult]
              if (!content) return null
              return (
                <div key={s.key} className="rounded-lg p-4 bg-[#17202c] border border-[#344151]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{s.icon}</span>
                    <span className="font-bold text-sm" style={{ color: s.color }}>{s.title}</span>
                  </div>
                  <p className="text-[#c4cdd8] text-sm leading-relaxed">{String(content)}</p>
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
    <div className="palace-page palace-gunghap min-h-screen bg-[#0c1119] text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <p role="status" className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">계산 기준을 검증 중이라 지금은 이용할 수 없습니다. 이용이 가능해지면 안내해드릴게요. 엽전은 사용되지 않습니다.</p>
        {error && <p role="alert" className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-[#a7b3c3] text-xl">←</Link>
          <div>
            <h1 className="[font-family:var(--palace-serif)] text-xl font-bold">💞 궁합 해설</h1>
            <p className="text-[#a7b3c3] text-xs mt-0.5">구미호 선생의 궁합 분석 · 1900원</p>
          </div>
        </div>

        <div className="bg-[#17202c] rounded-lg p-4 mb-4 border border-[#344151]">
          <p className="text-xs text-[#bf94a4] mb-3 font-medium">💕 두 사람의 정보를 입력하세요</p>

          <div className="mb-3">
            <label className="text-xs text-[#a7b3c3] mb-1.5 block">관계</label>
            <div className="flex flex-wrap gap-1.5">
              {RELATIONSHIPS.map(r => (
                <button key={r} onClick={() => handleChange('relationship', r)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={form.relationship === r
                    ? { background: '#bf94a4', color: '#17202c' }
                    : { background: '#17202c', color: '#a7b3c3', border: '1px solid #455365' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <PersonForm label="나" prefix="1" form={form} onChange={handleChange}
              calType={calType1} onCalTypeChange={setCalType1} />
            <div className="flex items-center justify-center py-1">
              <span className="text-2xl">💗</span>
            </div>
            <PersonForm label="상대방" prefix="2" form={form} onChange={handleChange}
              calType={calType2} onCalTypeChange={setCalType2} />
          </div>
        </div>

        <button onClick={handleSubmit} disabled aria-disabled="true"
          className="w-full py-4 rounded-lg font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed text-white"
          style={{ background: '#c6a66d', color: '#17202c' }}>
          궁합 이용 준비 중
        </button>
      </div>
    </div>
  )
}
