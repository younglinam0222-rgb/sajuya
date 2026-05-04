'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────
interface SajuTitle {
  id: string
  title: string
  teaser: string
  is_free: boolean
  content: string
}

interface LifecycleItem {
  age: string
  score: number
  season: string
  desc: string
}

interface Strategy {
  overview: string
  golden_period: string
  lifecycle: LifecycleItem[]
  peak_guide: string
  warning: string
}

interface SajuResult {
  titles: SajuTitle[]
  strategy: Strategy
  disclaimer?: string
}

// ─── Constants ───────────────────────────────────
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
const OCCUPATIONS = ['직장인', '사업가', '학생', '주부', '프리랜서']
const QUESTION_INTENTS = ['인생 전반', '돈/재물', '연애/결혼', '직업/진로', '건강']

const CHARACTERS = [
  { id: 'baekhalma', name: '건물주 백할매', img: '/characters/baekhalma.png', desc: '팩폭 재물 전문', color: '#8B5CF6' },
  { id: 'doRyeong', name: '근본도령', img: '/characters/doryeong.png', desc: '다정한 종합 분석', color: '#3B82F6' },
  { id: 'gumiho', name: '구미호 선생', img: '/characters/gumiho.png', desc: '연애 궁합 전문', color: '#EC4899' },
  { id: 'sinRyeong', name: '무등산 신령님', img: '/characters/sinryeong.png', desc: '대운 인생 전문', color: '#10B981' },
]

const SEASON_COLORS: Record<string, string> = {
  '봄': '#10B981', '여름': '#F59E0B', '가을': '#F97316', '겨울': '#3B82F6',
}
const SEASON_ICONS: Record<string, string> = {
  '봄': '🌱', '여름': '☀️', '가을': '🍂', '겨울': '❄️',
}

type Stage = 'input' | 'loading' | 'result'

// ─── Loading Screen ───────────────────────────────
const LOADING_TIPS = [
  '일간(日干)을 분석하는 중...',
  '오행의 생극제화를 계산하는 중...',
  '12개 판결문을 작성하는 중...',
  '인생 흐름 점수를 계산하는 중...',
  '전성기 활용 전략을 수립하는 중...',
]

function LoadingScreen({ name, character }: { name: string; character: typeof CHARACTERS[0] }) {
  const [tipIdx, setTipIdx] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const t1 = setInterval(() => setTipIdx(i => (i + 1) % LOADING_TIPS.length), 2000)
    const t2 = setInterval(() => setProgress(p => Math.min(p + 2, 90)), 300)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-4">
      <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-2"
        style={{ borderColor: character.color }}>
        <img src={character.img} alt={character.name}
          className="w-full h-full object-cover object-top" />
      </div>
      <h2 className="text-xl font-bold mb-1">{name}님의 사주 분석 중</h2>
      <p className="text-gray-500 text-sm mb-8">{character.name}이(가) 보고 있어요</p>
      <div className="w-72 h-1.5 bg-gray-800 rounded-full overflow-hidden mb-4">
        <div className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${character.color}, ${character.color}aa)` }} />
      </div>
      <p className="text-gray-400 text-xs animate-pulse">{LOADING_TIPS[tipIdx]}</p>
    </div>
  )
}

// ─── Lifecycle Chart ──────────────────────────────
function LifecycleChart({ data }: { data: LifecycleItem[] }) {
  if (!data?.length) return null

  return (
    <div className="rounded-2xl p-4 bg-[#111118] border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <span>📊</span>
        <span className="font-bold text-sm text-white">나이대별 운의 흐름</span>
      </div>
      <div className="flex items-end gap-2 h-32 mb-3">
        {data.map(d => {
          const color = SEASON_COLORS[d.season] ?? '#8B5CF6'
          const height = Math.max((d.score / 100) * 100, 10)
          return (
            <div key={d.age} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-400">{d.score}</span>
              <div className="w-full rounded-t-lg transition-all"
                style={{ height: `${height}%`, background: color, minHeight: 8 }} />
            </div>
          )
        })}
      </div>
      <div className="flex gap-2">
        {data.map(d => (
          <div key={d.age} className="flex-1 text-center">
            <p className="text-xs text-gray-400">{d.age}</p>
            <p className="text-xs">{SEASON_ICONS[d.season] ?? '✨'}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {data.map(d => (
          <div key={d.age} className="flex items-start gap-2">
            <span className="text-xs font-bold text-gray-500 w-8 flex-shrink-0">{d.age}</span>
            <span className="text-xs" style={{ color: SEASON_COLORS[d.season] ?? '#fff' }}>
              {SEASON_ICONS[d.season]} {d.season}
            </span>
            <span className="text-xs text-gray-400">{d.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Title Card ───────────────────────────────────
function TitleCard({ item, charColor, idx }: {
  item: SajuTitle
  charColor: string
  idx: number
}) {
  const [open, setOpen] = useState(false)

  if (item.is_free) {
    return (
      <div className="rounded-2xl overflow-hidden border"
        style={{ borderColor: `${charColor}40`, background: '#111118' }}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
              style={{ background: `${charColor}25`, color: charColor }}>
              무료 {idx + 1}
            </span>
            <p className="font-bold text-base leading-snug text-white">{item.title}</p>
          </div>
          {item.content && (
            <p className="text-gray-300 text-sm leading-relaxed mt-3 whitespace-pre-line">{item.content}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-800 bg-[#111118]">
      <button className="w-full p-4 text-left" onClick={() => setOpen(!open)}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-800">
            <span className="text-sm">🔒</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-base leading-snug text-white">{item.title}</p>
            <p className="text-gray-500 text-xs mt-1">{item.teaser}</p>
          </div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-800">
          <div className="mt-3 p-3 rounded-xl bg-gray-900 text-center">
            <p className="text-sm text-gray-300 mb-3">이 판결문을 보려면 결제가 필요해요</p>
            <button className="px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: charColor }}>
              990원으로 전체 보기 →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────
export default function SajuPage() {
  const { data: session } = useSession()

  const [stage, setStage] = useState<Stage>('input')
  const [result, setResult] = useState<Partial<SajuResult>>({})
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0])
  const [calType, setCalType] = useState<'solar' | 'lunar'>('solar') // 양력/음력

  const [form, setForm] = useState({
    name: '', year: '1990', month: '1', day: '1', hour: '', gender: 'female',
    occupation: '직장인', questionIntent: '인생 전반',
  })

  // 상대방 정보 (연애/결혼 선택 시)
  const [partnerForm, setPartnerForm] = useState({
    name: '', year: '1990', month: '1', day: '1', hour: '', gender: 'male',
  })

  const isRomance = form.questionIntent === '연애/결혼'

  const handleSubmit = async () => {
    if (!form.name) return
    setStage('loading')
    setResult({})

    try {
      const res = await fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          calType,
          characterId: selectedChar.id,
          partnerInfo: isRomance ? partnerForm : undefined,
        }),
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
                  if (s !== -1 && e !== -1) {
                    const partial = JSON.parse(clean.slice(s, e + 1))
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

  // ── Loading ──
  if (stage === 'loading') {
    return <LoadingScreen name={form.name} character={selectedChar} />
  }

  // ── Result ──
  if (stage === 'result' && result.titles) {
    const freeTitles = result.titles.filter(t => t.is_free)
    const paidTitles = result.titles.filter(t => !t.is_free)

    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
        <div className="max-w-md mx-auto px-4 pt-6">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStage('input')} className="text-gray-400 text-xl">←</button>
            <div>
              <h1 className="text-lg font-bold">{form.name}님의 사주 풀이</h1>
              <p className="text-gray-500 text-xs">{selectedChar.name} · {form.questionIntent}</p>
            </div>
          </div>

          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-2 font-medium">✨ 무료 판결 3가지</p>
            <div className="space-y-3">
              {freeTitles.map((t, i) => (
                <TitleCard key={t.id} item={t} charColor={selectedChar.color} idx={i} />
              ))}
            </div>
          </div>

          {paidTitles.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 font-medium">🔒 잠긴 판결 {paidTitles.length}개</p>
                <button className="text-xs px-3 py-1.5 rounded-full font-bold text-white"
                  style={{ background: selectedChar.color }}>
                  990원으로 전체 열기
                </button>
              </div>
              <div className="space-y-2">
                {paidTitles.map((t, i) => (
                  <TitleCard key={t.id} item={t} charColor={selectedChar.color} idx={i + 3} />
                ))}
              </div>
            </div>
          )}

          {result.strategy && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">⚔️</span>
                <h2 className="font-bold text-base">인생 전략 분석</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">책사 모드</span>
              </div>

              {result.strategy.overview && (
                <div className="rounded-2xl p-4 bg-[#111118] border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span>🌌</span>
                    <span className="font-bold text-sm text-white">인생의 큰 그림</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{result.strategy.overview}</p>
                </div>
              )}

              {result.strategy.lifecycle?.length > 0 && (
                <LifecycleChart data={result.strategy.lifecycle} />
              )}

              {result.strategy.golden_period && (
                <div className="rounded-2xl p-4 bg-[#111118] border border-yellow-900/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span>🏆</span>
                    <span className="font-bold text-sm text-yellow-400">전성기는 언제?</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{result.strategy.golden_period}</p>
                </div>
              )}

              {result.strategy.peak_guide && (
                <div className="rounded-2xl p-4 bg-[#111118] border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span>🚀</span>
                    <span className="font-bold text-sm text-green-400">전성기 1000% 활용법</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{result.strategy.peak_guide}</p>
                </div>
              )}

              {result.strategy.warning && (
                <div className="rounded-2xl p-4 bg-[#111118] border border-red-900/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span>⚠️</span>
                    <span className="font-bold text-sm text-red-400">조심할 시기</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{result.strategy.warning}</p>
                </div>
              )}
            </div>
          )}

          {result.disclaimer && (
            <p className="text-gray-600 text-xs text-center mt-6 px-4">{result.disclaimer}</p>
          )}

          <button onClick={() => setStage('input')}
            className="w-full mt-4 py-3 rounded-2xl text-sm text-gray-400 border border-gray-800">
            다시 분석하기
          </button>
          <Link href="/" className="block mt-3 text-center text-gray-500 text-sm">홈으로</Link>
        </div>
      </div>
    )
  }

  // ── Input ──
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-gray-400 text-xl">←</Link>
          <div>
            <h1 className="text-xl font-bold">사주 풀이</h1>
            <p className="text-gray-500 text-xs mt-0.5">3개 무료 · 전체 열기 990원</p>
          </div>
        </div>

        {/* 캐릭터 선택 — 실제 이미지 */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-2 block">신령 선택</label>
          <div className="grid grid-cols-2 gap-2">
            {CHARACTERS.map(c => (
              <button key={c.id}
                onClick={() => setSelectedChar(c)}
                className="p-3 rounded-2xl text-left transition-all border overflow-hidden"
                style={selectedChar.id === c.id
                  ? { borderColor: c.color, background: `${c.color}15` }
                  : { borderColor: '#1f2937', background: '#111118' }}>
                <div className="flex items-center gap-2">
                  {/* 실제 이미지 */}
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border"
                    style={{ borderColor: selectedChar.id === c.id ? c.color : '#374151' }}>
                    <img src={c.img} alt={c.name}
                      className="w-full h-full object-cover object-top"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 질문 의도 */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-2 block">무엇이 가장 궁금하세요?</label>
          <div className="flex flex-wrap gap-2">
            {QUESTION_INTENTS.map(q => (
              <button key={q}
                onClick={() => setForm(f => ({ ...f, questionIntent: q }))}
                className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={form.questionIntent === q
                  ? { background: selectedChar.color, color: 'white' }
                  : { background: '#111827', color: '#9CA3AF', border: '1px solid #374151' }}>
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* 내 정보 입력 */}
        <div className="bg-[#111118] rounded-2xl p-4 mb-3 border border-gray-800 space-y-3">
          <p className="text-xs font-bold text-gray-400">
            {isRomance ? '👤 내 정보' : '👤 기본 정보'}
          </p>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">이름</label>
            <input type="text" placeholder="이름을 입력하세요" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none" />
          </div>

          {/* 양력/음력 선택 */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">생년월일</label>
            <div className="flex gap-2 mb-2">
              {(['solar', 'lunar'] as const).map(t => (
                <button key={t}
                  onClick={() => setCalType(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={calType === t
                    ? { background: selectedChar.color, color: 'white' }
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
                  className="py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={form.gender === g
                    ? { background: selectedChar.color, color: 'white' }
                    : { background: '#111827', color: '#9CA3AF', border: '1px solid #374151' }}>
                  {g === 'male' ? '남성' : '여성'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">직업</label>
            <div className="flex flex-wrap gap-2">
              {OCCUPATIONS.map(o => (
                <button key={o} onClick={() => setForm(f => ({ ...f, occupation: o }))}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={form.occupation === o
                    ? { background: selectedChar.color, color: 'white' }
                    : { background: '#1F2937', color: '#9CA3AF', border: '1px solid #374151' }}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 상대방 정보 — 연애/결혼 선택 시만 표시 */}
        {isRomance && (
          <div className="bg-[#111118] rounded-2xl p-4 mb-3 border space-y-3"
            style={{ borderColor: `${selectedChar.color}40` }}>
            <p className="text-xs font-bold" style={{ color: selectedChar.color }}>
              💕 상대방 정보
            </p>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">상대방 이름 <span className="text-gray-600">(선택)</span></label>
              <input type="text" placeholder="몰라도 괜찮아요" value={partnerForm.name}
                onChange={e => setPartnerForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none" />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">상대방 생년월일</label>
              <div className="grid grid-cols-3 gap-2">
                <select value={partnerForm.year} onChange={e => setPartnerForm(f => ({ ...f, year: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none">
                  {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select value={partnerForm.month} onChange={e => setPartnerForm(f => ({ ...f, month: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none">
                  {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
                <select value={partnerForm.day} onChange={e => setPartnerForm(f => ({ ...f, day: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none">
                  {DAYS.map(d => <option key={d} value={d}>{d}일</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">상대방 태어난 시간 <span className="text-gray-600">(선택)</span></label>
              <select value={partnerForm.hour} onChange={e => setPartnerForm(f => ({ ...f, hour: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">상대방 성별</label>
              <div className="grid grid-cols-2 gap-2">
                {['male', 'female'].map(g => (
                  <button key={g} onClick={() => setPartnerForm(f => ({ ...f, gender: g }))}
                    className="py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={partnerForm.gender === g
                      ? { background: selectedChar.color, color: 'white' }
                      : { background: '#111827', color: '#9CA3AF', border: '1px solid #374151' }}>
                    {g === 'male' ? '남성' : '여성'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <button onClick={handleSubmit} disabled={!form.name}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${selectedChar.color}, ${selectedChar.color}bb)` }}>
          {selectedChar.name}에게 물어보기 →
        </button>

        <p className="text-center text-gray-600 text-xs mt-3">3개 무료 · 전체 열기 990원</p>
      </div>
    </div>
  )
}
