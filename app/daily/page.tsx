'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── 타입 ─────────────────────────────────────────────
interface DailyResult {
  overall: string;     overall_score: number
  money: string;       money_score: number
  love: string;        love_score: number
  health: string;      health_score: number
  lucky: string;       warning: string;      today_word: string
}
interface ManseData {
  yearPillar: any; monthPillar: any; dayPillar: any; hourPillar: any
  elementCount: Record<string, number>; animal: string; todayPillar: any
}

// ─── 상수 ─────────────────────────────────────────────
const YEARS   = Array.from({ length: 85 }, (_, i) => 2005 - i)
const MONTHS  = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS    = Array.from({ length: 31 }, (_, i) => i + 1)

const CHARACTERS = [
  { id: 'baekhalma', name: '건물주 백할매', img: '/characters/baekhalma.png', color: '#8B5CF6', desc: '직설 팩폭' },
  { id: 'doRyeong',  name: '근본도령',      img: '/characters/doryeong.png',  color: '#3B82F6', desc: '다정 분석' },
  { id: 'gumiho',    name: '구미호 선생',   img: '/characters/gumiho.png',    color: '#EC4899', desc: '감성 운세' },
  { id: 'sinRyeong', name: '무등산 신령님', img: '/characters/sinryeong.png', color: '#10B981', desc: '묵직 판결' },
]

const ELEMENT_COLORS: Record<string, string> = { '木':'#4ade80','火':'#f87171','土':'#fbbf24','金':'#d1d5db','水':'#60a5fa' }
const ELEMENT_BG:    Record<string, string> = { '木':'rgba(34,197,94,.15)','火':'rgba(239,68,68,.15)','土':'rgba(234,179,8,.15)','金':'rgba(156,163,175,.15)','水':'rgba(96,165,250,.15)' }

const SECTIONS = [
  { key: 'overall', scoreKey: 'overall_score', icon: '⭐', title: '오늘의 총운', color: '#F59E0B' },
  { key: 'money',   scoreKey: 'money_score',   icon: '💰', title: '재물운',     color: '#10B981' },
  { key: 'love',    scoreKey: 'love_score',     icon: '💕', title: '연애운',     color: '#EC4899' },
  { key: 'health',  scoreKey: 'health_score',   icon: '🌿', title: '건강운',     color: '#3B82F6' },
]

function getTodayKST() {
  return new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric',
  })
}

// ─── 점수 바 컴포넌트 ──────────────────────────────────
function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

// ─── 만세력 미니 테이블 ────────────────────────────────
function ManseTableMini({ manse, charColor }: { manse: ManseData; charColor: string }) {
  const pillars = [
    { label: '시', p: manse.hourPillar },
    { label: '일', p: manse.dayPillar },
    { label: '월', p: manse.monthPillar },
    { label: '연', p: manse.yearPillar },
  ]
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-800 mb-4">
      <div className="py-2 text-center text-xs font-black text-yellow-400 tracking-widest bg-[#111118] border-b border-gray-800">
        만세력 (四柱八字)
      </div>
      <div className="grid grid-cols-4 border-b border-gray-800">
        {pillars.map(({ label }) => (
          <div key={label} className="py-1.5 text-center text-[10px] font-bold text-gray-600 bg-[#0d0d0d]">{label}주</div>
        ))}
      </div>
      <div className="grid grid-cols-4 border-b border-gray-800">
        {pillars.map(({ label, p }) => (
          <div key={label} className="py-2 text-center" style={{ background: p ? ELEMENT_BG[p.stemElement]||'#111118' : '#111118' }}>
            <div className="text-xl font-black" style={{ color: p ? ELEMENT_COLORS[p.stemElement]||'#fff' : '#333' }}>{p ? p.stem : '?'}</div>
            <div className="text-[9px] text-gray-500">{p?.stemElement}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 border-b border-gray-800">
        {pillars.map(({ label, p }) => (
          <div key={label} className="py-2 text-center" style={{ background: p ? ELEMENT_BG[p.branchElement]||'#111118' : '#111118' }}>
            <div className="text-xl font-black" style={{ color: p ? ELEMENT_COLORS[p.branchElement]||'#fff' : '#333' }}>{p ? p.branch : '?'}</div>
            <div className="text-[9px] text-gray-500">{p?.branchElement}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 bg-[#0d0d0d]">
        {(['木','火','土','金','水'] as const).map(el => (
          <div key={el} className="py-1.5 text-center border-r border-gray-800 last:border-0">
            <div className="text-xs font-black" style={{ color: ELEMENT_COLORS[el] }}>{el}</div>
            <div className="text-[10px] text-gray-600">{manse.elementCount[el]??0}</div>
          </div>
        ))}
      </div>
      {/* 오늘 날짜 일주 */}
      {manse.todayPillar && (
        <div className="px-3 py-2 bg-[#111118] flex items-center gap-2">
          <span className="text-xs text-gray-500">오늘 일주:</span>
          <span className="text-xs font-bold" style={{ color: charColor }}>
            {manse.todayPillar.stem}{manse.todayPillar.branch}
            ({manse.todayPillar.stemKr}{manse.todayPillar.branchKr})
          </span>
          <span className="text-[10px] text-gray-600 ml-auto">{manse.animal}띠</span>
        </div>
      )}
    </div>
  )
}

// ─── 로딩 화면 ────────────────────────────────────────
function LoadingScreen({ name, character }: { name: string; character: typeof CHARACTERS[0] }) {
  const [progress, setProgress] = useState(0)
  const tips = ['오늘 날짜 기운 계산 중...', '만세력 대조 중...', '오늘 운세 판결 중...', '행운 포인트 찾는 중...']
  const [tipIdx, setTipIdx] = useState(0)
  useEffect(() => {
    const t1 = setInterval(() => setProgress(p => Math.min(p + 3, 90)), 200)
    const t2 = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 1800)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [])
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-4">
      <div className="w-20 h-20 rounded-full overflow-hidden mb-5 border-2" style={{ borderColor: character.color }}>
        <img src={character.img} alt={character.name} className="w-full h-full object-cover object-top" />
      </div>
      <h2 className="text-lg font-bold mb-1">{name}님의 오늘 운세</h2>
      <p className="text-gray-500 text-sm mb-8">{character.name}이(가) 보고 있어요</p>
      <div className="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all duration-200"
          style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${character.color}, ${character.color}88)` }} />
      </div>
      <p className="text-xs text-gray-400 animate-pulse">{tips[tipIdx]}</p>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────
export default function DailyPage() {
  const [stage, setStage]       = useState<'input'|'loading'|'result'>('input')
  const [result, setResult]     = useState<Partial<DailyResult>>({})
  const [manse, setManse]       = useState<ManseData | null>(null)
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0])
  const [form, setForm] = useState({
    name: '', year: '1990', month: '1', day: '1', hour: '', gender: 'female',
  })
  const todayStr = getTodayKST()

  const handleSubmit = async () => {
    if (!form.name) return
    setStage('loading')
    setResult({})
    setManse(null)

    try {
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, characterId: selectedChar.id }),
      })
      if (!res.body) return

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let done = false

      while (!done) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { done = true; break }
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'manse') { setManse(parsed.data); continue }
            if (parsed.text) {
              accumulated += parsed.text
              try {
                const clean = accumulated.replace(/```json/g,'').replace(/```/g,'').trim()
                const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
                if (s !== -1 && e !== -1) setResult(JSON.parse(clean.slice(s, e+1)))
              } catch {}
            }
          } catch {}
        }
      }
      setStage('result')
    } catch (e) {
      console.error(e)
      setStage('input')
    }
  }

  if (stage === 'loading') return <LoadingScreen name={form.name} character={selectedChar} />

  // ── 결과 화면 ──────────────────────────────────────
  if (stage === 'result') {
    const avgScore = result.overall_score
      ? Math.round(((result.overall_score||0) + (result.money_score||0) + (result.love_score||0) + (result.health_score||0)) / 4)
      : 0

    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
        <div className="max-w-md mx-auto px-4 pt-6">

          {/* 헤더 */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setStage('input')} className="text-gray-400 text-xl">←</button>
            <div>
              <h1 className="text-lg font-bold">{form.name}님의 일일 운세</h1>
              <p className="text-gray-500 text-xs">{todayStr} · {selectedChar.name}</p>
            </div>
            <div className="ml-auto w-10 h-10 rounded-full overflow-hidden border-2 flex-shrink-0"
              style={{ borderColor: selectedChar.color }}>
              <img src={selectedChar.img} alt="" className="w-full h-full object-cover object-top" />
            </div>
          </div>

          {/* 오늘의 한마디 */}
          {result.today_word && (
            <div className="rounded-2xl p-4 mb-4 text-center"
              style={{ background: `linear-gradient(135deg, ${selectedChar.color}20, ${selectedChar.color}10)`, border: `1px solid ${selectedChar.color}40` }}>
              <p className="text-xs text-gray-500 mb-1">오늘의 한마디</p>
              <p className="font-black text-base text-white">"{result.today_word}"</p>
            </div>
          )}

          {/* 종합 점수 */}
          {avgScore > 0 && (
            <div className="rounded-2xl p-4 bg-[#111118] border border-gray-800 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold">📊 오늘의 운세 점수</span>
                <span className="text-2xl font-black" style={{ color: selectedChar.color }}>{avgScore}점</span>
              </div>
              <div className="space-y-2">
                {SECTIONS.map(s => (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-12 flex-shrink-0">{s.icon} {s.title.replace('오늘의 ', '')}</span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${result[s.scoreKey as keyof DailyResult] || 0}%`, background: s.color }} />
                    </div>
                    <span className="text-xs font-bold w-6 text-right" style={{ color: s.color }}>
                      {result[s.scoreKey as keyof DailyResult] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 만세력 */}
          {manse && <ManseTableMini manse={manse} charColor={selectedChar.color} />}

          {/* 섹션들 */}
          <div className="space-y-3">
            {SECTIONS.map(s => {
              const content = result[s.key as keyof DailyResult] as string
              if (!content) return null
              return (
                <div key={s.key} className="rounded-2xl p-4 bg-[#111118] border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{s.icon}</span>
                    <span className="font-bold text-sm" style={{ color: s.color }}>{s.title}</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{content}</p>
                </div>
              )
            })}

            {/* 행운 포인트 */}
            {result.lucky && (
              <div className="rounded-2xl p-4 bg-[#111118] border border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">🍀</span>
                  <span className="font-bold text-sm text-purple-400">행운 포인트</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{result.lucky.replace(/ \/ /g, '\n')}</p>
              </div>
            )}

            {/* 조심할 것 */}
            {result.warning && (
              <div className="rounded-2xl p-4 border" style={{ background: '#1a0808', borderColor: 'rgba(239,68,68,.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">⚠️</span>
                  <span className="font-bold text-sm text-red-400">오늘 조심할 것</span>
                </div>
                <p className="text-red-200 text-sm leading-relaxed">{result.warning}</p>
              </div>
            )}
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

  // ── 입력 화면 ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-5">
          <Link href="/" className="text-gray-400 text-xl">←</Link>
          <div>
            <h1 className="text-xl font-bold">⭐ 일일 운세</h1>
            <p className="text-gray-500 text-xs mt-0.5">{todayStr} · 무료</p>
          </div>
        </div>

        {/* 캐릭터 선택 */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-2 block">운세 봐줄 신령 선택</label>
          <div className="grid grid-cols-4 gap-2">
            {CHARACTERS.map(c => (
              <button key={c.id} onClick={() => setSelectedChar(c)}
                className="flex flex-col items-center gap-1 p-2 rounded-2xl border transition-all"
                style={selectedChar.id === c.id
                  ? { borderColor: c.color, background: `${c.color}15` }
                  : { borderColor: '#1f2937', background: '#111118' }}>
                <div className="w-12 h-12 rounded-full overflow-hidden border-2"
                  style={{ borderColor: selectedChar.id === c.id ? c.color : '#374151' }}>
                  <img src={c.img} alt={c.name} className="w-full h-full object-cover object-top"
                    onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                </div>
                <p className="text-[10px] font-bold text-center leading-tight" style={{ color: selectedChar.id === c.id ? c.color : '#9CA3AF' }}>
                  {c.name.replace('건물주 ', '').replace('무등산 ', '')}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 입력 폼 */}
        <div className="bg-[#111118] rounded-2xl p-4 mb-4 border border-gray-800 space-y-3">
          <p className="text-xs font-medium" style={{ color: selectedChar.color }}>✨ 오늘 하루의 운세를 확인하세요</p>

          {/* 이름 */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">이름</label>
            <input type="text" placeholder="이름을 입력하세요" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none" />
          </div>

          {/* 생년월일 */}
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

          {/* 태어난 시간 */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              태어난 시간 <span className="text-gray-600">(선택 · 정확할수록 좋아요)</span>
            </label>
            <input type="time" value={form.hour}
              onChange={e => setForm(f => ({ ...f, hour: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
              style={{ colorScheme: 'dark' }} />
            <p className="text-xs text-gray-600 mt-1">모르면 비워두세요</p>
          </div>

          {/* 성별 */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">성별</label>
            <div className="grid grid-cols-2 gap-2">
              {['male','female'].map(g => (
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
        </div>

        <button onClick={handleSubmit} disabled={!form.name}
          className="w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${selectedChar.color}, ${selectedChar.color}bb)` }}>
          {selectedChar.name}에게 오늘 운세 묻기 ✨
        </button>
        <p className="text-center text-gray-600 text-xs mt-3">매일 무료 · 만세력 기반 분석</p>
      </div>
    </div>
  )
}
