'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { CHARACTERS, CharacterId } from '@/lib/characters'

interface DailyResult {
  overall: string
  money: string
  love: string
  health: string
  advice: string
  luckyColor: string
  luckyNumber: string
}

function DailyPageContent() {
  const searchParams = useSearchParams()
  const defaultChar = (searchParams.get('character') || 'baekhalma') as CharacterId

  const [characterId, setCharacterId] = useState<CharacterId>(defaultChar)
  const [form, setForm] = useState({
    name: '',
    year: '1990',
    month: '6',
    day: '15',
    gender: 'male' as 'male' | 'female',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DailyResult | null>(null)
  const [error, setError] = useState('')

  const character = CHARACTERS[characterId]
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  const handleSubmit = async () => {
    if (!form.name || !form.year || !form.month || !form.day) {
      setError('이름과 생년월일을 입력해주세요')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, characterId, today }),
      })
      if (!res.ok) throw new Error('API 오류')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('오류가 발생했어요. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto pb-8">
      <div className="bg-[#111] px-4 py-3 flex items-center gap-3 border-b border-[#1a1a1a]">
        <Link href="/" className="text-lg text-[#888]">←</Link>
        <span className="font-black text-purple-400">사주야</span>
        <span className="ml-auto text-xs text-[#444]">{today}</span>
      </div>

      <div className="p-4">
        <div className="mb-1 text-2xl font-black">⭐ 일일 운세</div>
        <div className="text-xs text-[#555] mb-5">오늘 하루 기운을 무료로 확인해요</div>

        <div className="mb-5">
          <div className="text-xs font-bold text-[#666] mb-2">신탁 마스터 선택</div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.values(CHARACTERS) as typeof CHARACTERS[CharacterId][]).map(c => (
              <button key={c.id} onClick={() => setCharacterId(c.id as CharacterId)}
                className={`p-3 rounded-xl border transition-all text-left flex items-center gap-2.5 ${
                  characterId === c.id ? 'border-purple-500 bg-purple-950/30' : 'border-[#222] bg-[#111]'
                }`}>
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[#2a2a2a] relative"
                  style={{ background: c.bgColor }}>
                  <Image src={c.image} alt={c.name} fill className="object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
                <div>
                  <div className={`text-xs font-bold ${characterId === c.id ? 'text-purple-300' : 'text-white'}`}>{c.name}</div>
                  <div className="text-[9px] text-[#555] mt-0.5">{c.specialty[0]}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#111] rounded-2xl p-4 border border-[#1a1a1a] mb-4">
          <div className="mb-4">
            <label className="text-xs font-bold text-[#666] block mb-1.5">이름</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-600"
              placeholder="이름을 입력하세요" />
          </div>
          <div className="mb-4">
            <label className="text-xs font-bold text-[#666] block mb-1.5">생년월일</label>
            <div className="grid grid-cols-3 gap-2">
              {([['year', '년'], ['month', '월'], ['day', '일']] as [keyof typeof form, string][]).map(([key, ph]) => (
                <input key={key} type="number" value={form[key] as string}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-purple-600 text-center"
                  placeholder={ph} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-[#666] block mb-1.5">성별</label>
            <div className="grid grid-cols-2 gap-2">
              {([['male', '👨 남성'], ['female', '👩 여성']] as ['male' | 'female', string][]).map(([val, label]) => (
                <button key={val} onClick={() => setForm({ ...form, gender: val })}
                  className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                    form.gender === val ? 'border-purple-500 bg-purple-950/40 text-purple-300' : 'border-[#222] bg-[#0a0a0a] text-[#666]'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="text-red-400 text-xs text-center mb-3">{error}</div>}

        {!result && (
          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-base transition-opacity"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff', opacity: loading ? 0.7 : 1 }}>
            {loading ? `${character.emoji} 보는 중...` : `${character.emoji} ${character.name}에게 오늘 운세 묻기`}
          </button>
        )}

        {result && (
          <div>
            <div className="rounded-2xl p-4 mb-4 text-center"
              style={{ background: 'linear-gradient(160deg,#050010,#0f0030,#050010)', border: '1px solid rgba(167,139,250,.2)' }}>
              <div className="text-xs font-bold text-purple-400 mb-1">{character.emoji} {character.name} 신탁</div>
              <div className="text-lg font-black text-white">{form.name} 님의 오늘 운세</div>
              <div className="text-xs text-[#555] mt-1">{today}</div>
            </div>

            {[
              { label: '🌟 전체운', body: result.overall },
              { label: '💰 금전운', body: result.money },
              { label: '❤️ 연애운', body: result.love },
              { label: '🌿 건강운', body: result.health },
              { label: '💡 오늘의 조언', body: result.advice },
            ].map(({ label, body }) => (
              <div key={label} className="rounded-2xl p-4 mb-3" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                <div className="text-xs font-black text-purple-400 mb-2">{label}</div>
                <p className="text-sm leading-[1.9] text-[#ccc] whitespace-pre-line">{body}</p>
              </div>
            ))}

            <div className="rounded-2xl p-4 mb-4 flex items-center gap-4"
              style={{ background: '#111', border: '1px solid #1e1e1e' }}>
              <div className="flex-1 text-center">
                <div className="text-xs text-[#555] mb-1">행운의 색</div>
                <div className="text-sm font-black text-yellow-400">{result.luckyColor}</div>
              </div>
              <div className="w-px h-8 bg-[#222]" />
              <div className="flex-1 text-center">
                <div className="text-xs text-[#555] mb-1">행운의 숫자</div>
                <div className="text-sm font-black text-purple-400">{result.luckyNumber}</div>
              </div>
            </div>

            <button onClick={() => setResult(null)}
              className="w-full py-3 rounded-2xl text-xs font-bold mb-3"
              style={{ background: '#111', border: '1px solid #222', color: '#555' }}>
              ↺ 다시 보기
            </button>

            <Link href="/saju"
              className="block w-full py-4 rounded-2xl font-black text-base text-center"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff' }}>
              🔮 사주 전체 풀이 보기 (990원)
            </Link>
          </div>
        )}

        <div className="mt-6 px-3 py-3 rounded-xl" style={{ background: '#0a0a0a', border: '0.5px solid #111' }}>
          <p className="text-[9px] leading-relaxed" style={{ color: '#3a3a3a' }}>
            본 서비스는 사주명리학 이론을 AI가 분석한 참고용 엔터테인먼트 콘텐츠입니다. © 사주야
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DailyPage() {
  return (
    <Suspense fallback={<div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center text-white">로딩중...</div>}>
      <DailyPageContent />
    </Suspense>
  )
}
