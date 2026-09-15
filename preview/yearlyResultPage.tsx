'use client'

import { useState } from 'react'
import Link from 'next/link'
import ReadingResult from './ReadingResult'
import ReadingProgress from '@/components/palace/ReadingProgress'

type Stage = 'input' | 'loading' | 'result'

interface YearlyResult {
  yearOverall: string
  firstHalf: string
  secondHalf: string
  money: string
  love: string
  health: string
  warning: string
  advice: string
}

const YEARS = Array.from({ length: 80 }, (_, i) => 2005 - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const currentYear = new Date().getFullYear()
const TARGET_YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i)

const SECTIONS = [
  { key: 'yearOverall', icon: '🌟', title: '연도 총운', color: '#F59E0B' },
  { key: 'firstHalf', icon: '🌱', title: '상반기 (1~6월)', color: '#8BAB98' },
  { key: 'secondHalf', icon: '🍂', title: '하반기 (7~12월)', color: '#F97316' },
  { key: 'money', icon: '💰', title: '재물운', color: '#8BAB98', paid: true },
  { key: 'love', icon: '💕', title: '연애·관계운', color: '#C18C9D', paid: true },
  { key: 'health', icon: '🌿', title: '건강운', color: '#80A5C4', paid: true },
  { key: 'warning', icon: '⚠️', title: '조심할 것들', color: '#EF4444', paid: true },
  { key: 'advice', icon: '✨', title: '핵심 조언', color: '#C6A66D', paid: true },
]

export default function YearlyPage() {
  const [stage, setStage] = useState<Stage>('input')
  const [result, setResult] = useState<Partial<YearlyResult>>({})
  const [form, setForm] = useState({
    name: '', year: '1990', month: '1', day: '1', gender: 'female',
    targetYear: String(currentYear),
  })

  const handleSubmit = async () => {
    if (!form.name) return
    setStage('loading')
    setResult({})

    try {
      const res = await fetch('/api/yearly', {
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

  if (stage === 'loading') return <div className="palace-loading-page"><ReadingProgress name={form.name} character="근본도령" image="/characters/doryeong.png"/></div>

  if (stage === 'result') return <ReadingResult title={`${form.name}님의 ${form.targetYear}년 운세`} subtitle={'한 해의 흐름과 나의 선택'} character="doryeong" sections={SECTIONS.map(s=>({id:s.key,title:s.title,body:String(result[s.key as keyof YearlyResult]||'')}))} onBack={()=>setStage('input')}/>

  return (
    <div className="palace-page palace-yearly min-h-screen bg-[#0a0a0f] text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-gray-400 text-xl">←</Link>
          <div>
            <h1 className="text-xl font-bold">📅 연도별 운세</h1>
            <p className="text-gray-500 text-xs mt-0.5">특정 년도 운세 분석 · 이용권 준비 중</p>
          </div>
        </div>

        <div className="bg-[#111118] rounded-2xl p-4 mb-4 border border-gray-800">
          <p className="text-xs text-orange-400 mb-3 font-medium">📆 정보를 입력하세요</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">이름</label>
              <input type="text" placeholder="이름을 입력하세요" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500" />
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
              <label className="text-xs text-gray-400 mb-1.5 block">성별</label>
              <div className="grid grid-cols-2 gap-2">
                {['male', 'female'].map(g => (
                  <button key={g} onClick={() => setForm(f => ({ ...f, gender: g }))}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                      form.gender === g ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-400 border border-gray-700'
                    }`}>
                    {g === 'male' ? '남성' : '여성'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">분석할 년도</label>
              <div className="flex gap-2 flex-wrap">
                {TARGET_YEARS.map(y => (
                  <button key={y} onClick={() => setForm(f => ({ ...f, targetYear: String(y) }))}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      form.targetYear === String(y)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-900 text-gray-400 border border-gray-700'
                    }`}>
                    {y}년
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={!form.name}
          className="w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #F97316, #F59E0B)' }}>
          {form.targetYear}년 운세 보기 📅
        </button>
      </div>
    </div>
  )
}
