'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import AccessNotice from '@/app/components/AccessNotice'
import ReadingResult, { type ReadingSection } from '@/app/components/reading/ReadingResult'
import ReadingShareActions from '@/app/components/reading/ReadingShareActions'
import { useSession } from 'next-auth/react'

// ─── 타입 ─────────────────────────────────────────────
interface DailyResult {
  overall: string;     overall_score: number
  money: string;       money_score: number
  love: string;        love_score: number
  health: string;      health_score: number
  lucky: string;       warning: string;      today_word: string
}
interface MansePillar {
  stem: string; branch: string; stemKr?: string; branchKr?: string
  stemElement: string; branchElement: string
}
interface ManseData {
  yearPillar: MansePillar; monthPillar: MansePillar; dayPillar: MansePillar; hourPillar: MansePillar | null
  elementCount: Record<string, number>; animal: string; todayPillar: MansePillar
}

// ─── 상수 ─────────────────────────────────────────────
const MONTHS  = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS    = Array.from({ length: 31 }, (_, i) => i + 1)

const CHARACTERS = [
  { id: 'baekhalma', name: '건물주 백할매', img: '/characters/baekhalma.png', color: '#8B5CF6', desc: '직설 팩폭' },
  { id: 'doRyeong',  name: '근본도령',      img: '/characters/doryeong.png',  color: '#3B82F6', desc: '다정 분석' },
  { id: 'gumiho',    name: '구미호 선생',   img: '/characters/gumiho.png',    color: '#EC4899', desc: '감성 운세' },
  { id: 'sinRyeong', name: '무등산 신령님', img: '/characters/sinryeong.png', color: '#10B981', desc: '묵직 판결' },
]

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

const DAILY_LOADING_TIPS = ['오늘 날짜 기운 계산 중...', '만세력 대조 중...', '오늘 운세 판결 중...', '행운 포인트 찾는 중...']
function LoadingScreen({ name, character }: { name: string; character: typeof CHARACTERS[0] }) {
  const [progress, setProgress] = useState(0)
  const [tipIdx, setTipIdx] = useState(0)
  useEffect(() => {
    const t1 = setInterval(() => setProgress(p => Math.min(p + 3, 90)), 200)
    const t2 = setInterval(() => setTipIdx(i => (i + 1) % DAILY_LOADING_TIPS.length), 1800)
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
      <p className="text-xs text-gray-400 animate-pulse">{DAILY_LOADING_TIPS[tipIdx]}</p>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────
export default function DailyPage() {
  const { data: session, status } = useSession()
  if (status === 'loading') return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-500 text-sm">불러오는 중...</div>
  const userId = (session?.user as { id?: string } | undefined)?.id
  return <DailyReading key={userId ?? status} authenticated={status === 'authenticated'} />
}

function DailyReading({ authenticated }: { authenticated: boolean }) {
  const [error, setError] = useState('')
  const submittingRef = useRef(false)
  const requestRef = useRef<{ input: string; body: string } | null>(null)
  const [trialUsed, setTrialUsed] = useState(false)
  const [stage, setStage]       = useState<'input'|'loading'|'result'>('input')
  const [result, setResult]     = useState<Partial<DailyResult>>({})
  const [manse, setManse]       = useState<ManseData | null>(null)
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0])
  const [calType, setCalType] = useState<'solar'|'lunar'>('solar')
  const [form, setForm] = useState({
    name: '', year: '1990', month: '1', day: '1', hour: '', gender: 'female',
  })
  const [checkingCache, setCheckingCache] = useState(authenticated)
  const [shareId, setShareId] = useState('')
  const todayStr = getTodayKST()

  // ✅ 추가: 로그인된 사용자면 오늘자 캐시가 있는지 먼저 확인.
  // 있으면 폼 없이 바로 결과 화면으로, 없으면 마지막 입력 프로필로 폼을 채워줌.
  // 새 생성은 로그인과 서버의 최초 무료 이용권 확인을 통과해야 합니다.
  useEffect(() => {
    if (!authenticated) return
    const controller = new AbortController()
    fetch('/api/daily', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (controller.signal.aborted) return
        setTrialUsed(data.trialUsed === true)
        if (data.cached) {
          const char = CHARACTERS.find(c => c.id === data.cached.characterId) ?? CHARACTERS[0]
          setSelectedChar(char)
          setManse(data.cached.manse)
          setResult(data.cached.result)
          setShareId(typeof data.cached.shareId === 'string' ? data.cached.shareId : '')
          setStage('result')
        }
        if (data.birthProfile) {
          const p = data.birthProfile
          setForm(f => ({
            ...f,
            name: p.name ?? f.name, year: p.year ?? f.year, month: p.month ?? f.month,
            day: p.day ?? f.day, hour: p.hour ?? f.hour, gender: p.gender ?? f.gender,
          }))
          if (p.calType) setCalType(p.calType)
          if (p.characterId) {
            const char = CHARACTERS.find(c => c.id === p.characterId)
            if (char) setSelectedChar(char)
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setCheckingCache(false) })
    return () => controller.abort()
  }, [authenticated])

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    if (!authenticated) {
      setError('로그인 후 계정당 첫 일일운세를 무료로 이용할 수 있어요.')
      return
    }
    if (submittingRef.current) return
    submittingRef.current = true
    setError('')
    setStage('loading')
    setResult({})
    setManse(null)

    try {
      const input = JSON.stringify({ ...form, calType, characterId: selectedChar.id })
      if (requestRef.current?.input !== input) {
        requestRef.current = { input, body: JSON.stringify({ ...JSON.parse(input), requestId: crypto.randomUUID() }) }
      }
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(310_000),
        body: requestRef.current.body,
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
        if(event.type==='manse') setManse(event.data)
        if(typeof event.text==='string') accumulated+=event.text
      }
      if(!complete) throw new Error('연결이 끊겼습니다. 같은 입력으로 다시 확인해주세요.')
      const clean=accumulated.replace(/```json|```/g,'').trim()
      setResult(JSON.parse(clean.slice(clean.indexOf('{'),clean.lastIndexOf('}')+1)))
      setTrialUsed(true)
      requestRef.current = null
      setStage('result')
      void fetch('/api/daily', { cache: 'no-store' }).then(r => r.json()).then(data => {
        if (typeof data?.cached?.shareId === 'string') setShareId(data.cached.shareId)
      }).catch(() => {})
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

  if (stage === 'loading') return <LoadingScreen name={form.name} character={selectedChar} />

  // ✅ 추가: 로그인 사용자의 오늘자 캐시 확인 중 잠깐 뜨는 화면 (깜빡임 방지)
  if (checkingCache && stage === 'input') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-500 text-sm">
        오늘의 운세 불러오는 중...
      </div>
    )
  }

  // ── 결과 화면 ──────────────────────────────────────
  if (stage === 'result') {
    const readingSections: ReadingSection[] = SECTIONS.flatMap(section => {
      const body = result[section.key as keyof DailyResult]
      return typeof body === 'string' && body ? [{ id: section.key, title: section.title, body }] : []
    })
    if (result.lucky) readingSections.push({ id: 'lucky', title: '행운 포인트', body: result.lucky.replace(/ \/ /g, '\n') })
    if (result.warning) readingSections.push({ id: 'warning', title: '오늘 조심할 것', body: result.warning })
    const scores = SECTIONS.map(section => {
      const value = result[section.scoreKey as keyof DailyResult]
      return { label: section.title.replace('오늘의 ', ''), value: typeof value === 'number' ? value : undefined }
    })
    return <ReadingResult
      title={form.name ? `${form.name}님의 오늘 운세` : '오늘의 운세'}
      subtitle={todayStr}
      character={selectedChar.id}
      characterName={selectedChar.name}
      statusLabel="일일운세 · 나의 해석"
      quote={result.today_word}
      sections={readingSections}
      scores={scores}
      manse={manse}
      onBack={() => setStage('input')}
      actionLabel="입력 화면으로"
      share={shareId ? <ReadingShareActions
        shareId={shareId}
        title={form.name ? `${form.name}님의 오늘 운세` : '오늘의 운세'}
        description={`${selectedChar.name}이 본 일일운세입니다. 생년월일은 공유에 넣지 않습니다.`}
        imagePath={selectedChar.img}
      /> : undefined}
    >
      <Link href={`/chat?guide=${selectedChar.id.toLowerCase()}`}>이어서 1:1 대화하기 →</Link>
      <Link href="/storage">내 보관함 보기 →</Link>
    </ReadingResult>
  }

  // ── 입력 화면 ──────────────────────────────────────
  return (
    <div className="palace-page palace-daily min-h-screen bg-[#0a0a0f] text-white pb-24">
      <AccessNotice daily />
      {trialUsed && <p className="mx-4 mb-4 rounded-xl border border-violet-500/40 bg-violet-500/10 p-3 text-sm text-violet-100">첫 무료 운세를 이미 이용하셨어요. <Link href="/storage" className="underline">보관함에서 결과 다시 보기</Link></p>}
      <div className="max-w-md mx-auto px-4 pt-6">
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-5">
          <Link href="/" className="text-gray-400 text-xl">←</Link>
          <div>
            <h1 className="text-xl font-bold">⭐ 일일 운세</h1>
            <p className="text-gray-500 text-xs mt-0.5">{todayStr} · 계정당 최초 1회 무료</p>
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
            <div className="flex gap-2 mb-2">
              {(['solar','lunar'] as const).map(t => (
                <button key={t} onClick={() => setCalType(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={calType === t
                    ? { background: selectedChar.color, color: 'white' }
                    : { background: '#1F2937', color: '#9CA3AF', border: '1px solid #374151' }}>
                  {t === 'solar' ? '양력' : '음력(평달)'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number" placeholder="출생연도" value={form.year}
                min={1920} max={2010}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none"
              />
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

        <button onClick={handleSubmit} disabled={!form.name.trim() || trialUsed}
          className="w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${selectedChar.color}, ${selectedChar.color}bb)` }}>
          {trialUsed ? '첫 무료 운세 이용 완료' : `${selectedChar.name}에게 오늘 운세 묻기 ✨`}
        </button>
        <p className="text-center text-gray-600 text-xs mt-3">계정당 최초 1회 무료 · 저장된 결과 다시보기 무료</p>
      </div>
    </div>
  )
}
