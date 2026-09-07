'use client'

import { useState } from 'react'
import Link from 'next/link'
import BirthProfileFields from '@/app/components/BirthProfileFields'
import EntertainmentConsent from '@/app/components/EntertainmentConsent'
import MaritalStatusField from '@/app/components/MaritalStatusField'
import OccupationField from '@/app/components/OccupationField'
import { DEFAULT_BIRTH_FORM, type BirthFormSlice } from '@/lib/birthInput'
import { CONSENT_REQUIRED_MESSAGE } from '@/lib/entertainmentConsent'
import { GUNGHAP_RELATIONSHIPS } from '@/lib/profileOptions'
import { servicePriceLine } from '@/lib/priceDisplay'

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

const SECTIONS = [
  { key: 'overall', icon: '💫', title: '종합 궁합', color: '#EC4899' },
  { key: 'love', icon: '💕', title: '관계 궁합', color: '#F472B6' },
  { key: 'personality', icon: '🌟', title: '성격 궁합', color: '#8B5CF6' },
  { key: 'money', icon: '💰', title: '재물 궁합', color: '#10B981' },
  { key: 'longterm', icon: '🌙', title: '장기 궁합', color: '#3B82F6' },
  { key: 'warning', icon: '⚠️', title: '조심할 것들', color: '#EF4444' },
  { key: 'advice', icon: '🦊', title: '구미호 선생의 최종 조언', color: '#F59E0B' },
]

type PersonState = BirthFormSlice & {
  name: string
  gender: string
  maritalStatus: string
  occupation: string
}

function PersonForm({
  label, person, onChange, accentColor,
}: {
  label: string
  person: PersonState
  onChange: (patch: Partial<PersonState>) => void
  accentColor: string
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-3">
      <p className="text-xs font-bold mb-2.5" style={{ color: accentColor }}>
        {label === '나' ? '💗' : '💙'} {label}
      </p>
      <div className="space-y-2">
        <input type="text" placeholder="이름"
          value={person.name}
          onChange={e => onChange({ name: e.target.value })}
          className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none" />
        <BirthProfileFields
          value={person}
          onChange={onChange}
          accentColor={accentColor}
          gender={person.gender}
          onGenderChange={g => onChange({ gender: g })}
        />
        <MaritalStatusField value={person.maritalStatus} onChange={m => onChange({ maritalStatus: m })} accentColor={accentColor} />
        <OccupationField value={person.occupation} onChange={o => onChange({ occupation: o })} accentColor={accentColor} />
      </div>
    </div>
  )
}

const emptyPerson = (gender: string): PersonState => ({
  ...DEFAULT_BIRTH_FORM,
  name: '',
  gender,
  maritalStatus: '미혼(솔로)',
  occupation: '직장인',
})

export default function GunghapPage() {
  const [stage, setStage] = useState<Stage>('input')
  const [result, setResult] = useState<Partial<GunghapResult>>({})
  const [agreed, setAgreed] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [relationship, setRelationship] = useState('연인')
  const [person1, setPerson1] = useState<PersonState>(emptyPerson('female'))
  const [person2, setPerson2] = useState<PersonState>(emptyPerson('male'))

  const handleSubmit = async () => {
    if (!person1.name || !person2.name) return
    if (!agreed) {
      setErrorMsg(CONSENT_REQUIRED_MESSAGE)
      return
    }
    setErrorMsg(null)
    setStage('loading')
    setResult({})

    try {
      const res = await fetch('/api/gunghap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name1: person1.name, gender1: person1.gender,
          year1: person1.year, month1: person1.month, day1: person1.day,
          hour1: person1.hour, calType1: person1.calType, isLeapMonth1: person1.isLeapMonth,
          timeMode1: person1.timeMode, timePeriod1: person1.timePeriod, birthPlace1: person1.birthPlace,
          maritalStatus1: person1.maritalStatus, occupation1: person1.occupation,
          name2: person2.name, gender2: person2.gender,
          year2: person2.year, month2: person2.month, day2: person2.day,
          hour2: person2.hour, calType2: person2.calType, isLeapMonth2: person2.isLeapMonth,
          timeMode2: person2.timeMode, timePeriod2: person2.timePeriod, birthPlace2: person2.birthPlace,
          maritalStatus2: person2.maritalStatus, occupation2: person2.occupation,
          relationship,
          agreedEntertainment: true,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setErrorMsg(typeof err.error === 'string' ? err.error : `서버 오류(${res.status})`)
        setStage('input')
        return
      }
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
        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-pink-500">
          <img src="/characters/gumiho.png" alt="구미호" className="w-full h-full object-cover object-top" />
        </div>
        <p className="text-lg font-bold mb-2">{person1.name}님과 {person2.name}님의 궁합 분석 중...</p>
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
              <h1 className="text-lg font-bold">{person1.name} ♥ {person2.name} 궁합</h1>
              <p className="text-gray-500 text-xs">관계: {relationship} · 구미호 선생의 분석</p>
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
            <h1 className="text-xl font-bold">💞 궁합 해설</h1>
            <p className="text-gray-500 text-xs mt-0.5">구미호 선생의 궁합 분석 · {servicePriceLine('gunghap')}</p>
          </div>
        </div>

        <div className="bg-[#111118] rounded-2xl p-4 mb-4 border border-gray-800">
          <p className="text-xs text-pink-400 mb-3 font-medium">💕 두 사람의 정보를 입력하세요</p>

          <div className="mb-3">
            <label className="text-xs text-gray-400 mb-1.5 block">관계</label>
            <div className="flex flex-wrap gap-1.5">
              {GUNGHAP_RELATIONSHIPS.map(r => (
                <button key={r} onClick={() => setRelationship(r)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={relationship === r
                    ? { background: '#EC4899', color: 'white' }
                    : { background: '#111827', color: '#9CA3AF', border: '1px solid #374151' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <PersonForm label="나" person={person1} onChange={patch => setPerson1(p => ({ ...p, ...patch }))} accentColor="#EC4899" />
            <div className="flex items-center justify-center py-1">
              <span className="text-2xl">💗</span>
            </div>
            <PersonForm label="상대방" person={person2} onChange={patch => setPerson2(p => ({ ...p, ...patch }))} accentColor="#8B5CF6" />
          </div>
        </div>

        {errorMsg && <p className="mb-3 text-xs text-red-400">{errorMsg}</p>}
        <EntertainmentConsent agreed={agreed} onChange={setAgreed} />
        <button onClick={handleSubmit} disabled={!person1.name || !person2.name || !agreed}
          className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed text-white"
          style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)' }}>
          궁합 보기 →
        </button>
      </div>
    </div>
  )
}
