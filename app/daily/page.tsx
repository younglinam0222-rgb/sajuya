'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import BirthProfileFields from '@/app/components/BirthProfileFields'
import EntertainmentConsent from '@/app/components/EntertainmentConsent'
import MaritalStatusField from '@/app/components/MaritalStatusField'
import OccupationField from '@/app/components/OccupationField'
import { servicePriceLine } from '@/lib/priceDisplay'
import { CONSENT_REQUIRED_MESSAGE } from '@/lib/entertainmentConsent'
import { DAILY_FREE_USED_MESSAGE, DAILY_LOGIN_REQUIRED_MESSAGE } from '@/lib/dailyQuota'

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

// ─── 바이오리듬 차트 ──────────────────────────────────
function BiorhythmChart({ result, charColor }: { result: Partial<DailyResult>; charColor: string }) {
  const scores = [
    { label: '총운', score: result.overall_score ?? 0, color: '#F59E0B', icon: '⭐' },
    { label: '재물', score: result.money_score   ?? 0, color: '#10B981', icon: '💰' },
    { label: '연애', score: result.love_score    ?? 0, color: '#EC4899', icon: '💕' },
    { label: '건강', score: result.health_score  ?? 0, color: '#3B82F6', icon: '🌿' },
  ]

  // SVG 사인파 생성 (7일치 — 오늘 중심)
  const W = 340, H = 100, days = 7, todayX = W / 2
  const getY = (score: number, dayOffset: number, freq: number) => {
    const base = H / 2
    const amp  = (score / 100) * (H / 2 - 10)
    return base - amp * Math.sin((dayOffset / days) * Math.PI * freq + Math.PI / 2)
  }

  const buildPath = (score: number, freq: number) => {
    const pts: string[] = []
    for (let i = 0; i <= W; i += 4) {
      const dayOffset = ((i / W) * days) - days / 2
      const y = getY(score, dayOffset, freq)
      pts.push(`${i === 0 ? 'M' : 'L'} ${i} ${y}`)
    }
    return pts.join(' ')
  }

  return (
    <div className="rounded-2xl p-4 bg-[#111118] border border-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <span>📈</span>
        <span className="font-bold text-sm text-white">오늘의 운세 바이오리듬</span>
        <span className="text-xs text-gray-600 ml-auto">← 어제 · 오늘 · 내일 →</span>
      </div>

      {/* SVG 파형 차트 */}
      <div className="relative overflow-hidden rounded-xl bg-[#0d0d0d] mb-3" style={{ height: H + 20 }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0">
          {/* 중앙선 */}
          <line x1="0" y1={H/2} x2={W} y2={H/2} stroke="#ffffff10" strokeWidth="1" strokeDasharray="4 4" />
          {/* 오늘 수직선 */}
          <line x1={todayX} y1="0" x2={todayX} y2={H} stroke="#ffffff20" strokeWidth="1" />

          {/* 각 운세 파형 */}
          {scores.map((s, i) => (
            <path key={s.label}
              d={buildPath(s.score, 1 + i * 0.15)}
              fill="none"
              stroke={s.color}
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />
          ))}

          {/* 오늘 점 표시 */}
          {scores.map((s, i) => {
            const y = getY(s.score, 0, 1 + i * 0.15)
            return (
              <circle key={s.label} cx={todayX} cy={y} r="3"
                fill={s.color} stroke="#0d0d0d" strokeWidth="1.5" />
            )
          })}
        </svg>

        {/* 오늘 레이블 */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
          <span className="text-[10px] text-gray-500 font-bold">오늘</span>
        </div>
      </div>

      {/* 점수 범례 */}
      <div className="grid grid-cols-4 gap-2">
        {scores.map(s => (
          <div key={s.label} className="text-center">
            <div className="text-base mb-0.5">{s.icon}</div>
            <div className="text-lg font-black" style={{ color: s.color }}>{s.score}</div>
            <div className="text-[10px] text-gray-500">{s.label}</div>
            {/* 미니 게이지 */}
            <div className="mt-1 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${s.score}%`, background: s.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
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
  const { data: session, status } = useSession()
  const [stage, setStage]       = useState<'input'|'loading'|'result'>('input')
  const [result, setResult]     = useState<Partial<DailyResult>>({})
  const [manse, setManse]       = useState<ManseData | null>(null)
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0])
  const [agreed, setAgreed] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', year: '1990', month: '1', day: '1', hour: '', gender: 'female',
    calType: 'solar' as 'solar' | 'lunar',
    isLeapMonth: false,
    timeMode: 'unknown' as 'exact' | 'period' | 'unknown',
    timePeriod: '' as '' | 'dawn' | 'morning' | 'afternoon' | 'evening',
    birthPlace: '',
    maritalStatus: '미혼(솔로)',
    occupation: '직장인',
  })
  const [checkingCache, setCheckingCache] = useState(false)
  const [paymentsEnabled, setPaymentsEnabled] = useState(false)
  const [canGenerateFree, setCanGenerateFree] = useState(true)
  const [hasCachedResult, setHasCachedResult] = useState(false)
  const [quotaMessage, setQuotaMessage] = useState<string | null>(null)
  const [confirmPaid, setConfirmPaid] = useState(false)
  const requestIdRef = useRef<string | null>(null)
  const inFlightRef = useRef(false)
  const todayStr = getTodayKST()

  // ✅ 추가: 로그인된 사용자면 오늘자 캐시가 있는지 먼저 확인.
  // 있으면 폼 없이 바로 결과 화면으로, 없으면 마지막 입력 프로필로 폼을 채워줌.
  // 비로그인 사용자는 이 로직 자체가 실행 안 되므로 기존처럼 매번 새로 입력·생성.
  useEffect(() => {
    if (status !== 'authenticated') return
    setCheckingCache(true)
    fetch('/api/daily')
      .then(res => res.json())
      .then(data => {
        if (data.cached) {
          const char = CHARACTERS.find(c => c.id === data.cached.characterId) ?? CHARACTERS[0]
          setSelectedChar(char)
          setManse(data.cached.manse)
          setResult(data.cached.result)
          setStage('result')
        } else if (data.birthProfile) {
          const p = data.birthProfile
          setForm(f => ({
            ...f,
            name: p.name ?? f.name, year: p.year ?? f.year, month: p.month ?? f.month,
            day: p.day ?? f.day, hour: p.hour ?? f.hour, gender: p.gender ?? f.gender,
            calType: p.calType === 'lunar' ? 'lunar' : f.calType,
            isLeapMonth: !!p.isLeapMonth,
            timeMode: p.timeMode === 'exact' || p.timeMode === 'period' || p.timeMode === 'unknown' ? p.timeMode : (p.hour ? 'exact' : f.timeMode),
            timePeriod: p.timePeriod ?? f.timePeriod,
            birthPlace: p.birthPlace ?? f.birthPlace,
            maritalStatus: p.maritalStatus ?? f.maritalStatus,
            occupation: p.occupation ?? f.occupation,
          }))
          if (p.characterId) {
            const char = CHARACTERS.find(c => c.id === p.characterId)
            if (char) setSelectedChar(char)
          }
        }
        if (typeof data.paymentsEnabled === 'boolean') setPaymentsEnabled(data.paymentsEnabled)
        if (data.quota) {
          setCanGenerateFree(!!data.quota.canGenerateFree)
          setHasCachedResult(!!data.quota.hasCachedResult)
          setQuotaMessage(typeof data.quota.message === 'string' ? data.quota.message : null)
        }
      })
      .catch(() => {})
      .finally(() => setCheckingCache(false))
  }, [status])

  const handleSubmit = async () => {
    if (!form.name) return
    if (status !== 'authenticated') {
      setErrorMsg(DAILY_LOGIN_REQUIRED_MESSAGE)
      return
    }
    if (!agreed) {
      setErrorMsg(CONSENT_REQUIRED_MESSAGE)
      return
    }
    if (!canGenerateFree) {
      if (!paymentsEnabled) {
        setErrorMsg(quotaMessage || DAILY_FREE_USED_MESSAGE)
        return
      }
      if (!confirmPaid) {
        setErrorMsg('다른 결과로 다시 생성하려면 1냥 사용에 동의해야 합니다.')
        return
      }
    }
    if (inFlightRef.current) return
    inFlightRef.current = true
    if (!requestIdRef.current) requestIdRef.current = crypto.randomUUID()
    setErrorMsg(null)
    setStage('loading')
    setResult({})
    setManse(null)

    try {
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          characterId: selectedChar.id,
          agreedEntertainment: true,
          requestId: requestIdRef.current,
          confirmPaidRegenerate: paymentsEnabled && !canGenerateFree && confirmPaid,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setErrorMsg(typeof err.error === 'string' ? err.error : `서버 오류(${res.status})`)
        if (res.status !== 500) requestIdRef.current = null
        if (res.status === 403 || res.status === 409) {
          setCanGenerateFree(false)
        }
        setStage(hasCachedResult ? 'result' : 'input')
        return
      }
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
      setCanGenerateFree(false)
      setHasCachedResult(true)
      requestIdRef.current = null
      setStage('result')
    } catch (e) {
      console.error(e)
      setStage('input')
    } finally {
      inFlightRef.current = false
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
          {result.overall && (
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

            {/* 바이오리듬 차트 */}
            {result.overall !== undefined && (
              <BiorhythmChart result={result} charColor={selectedChar.color} />
            )}
          </div>

          <button onClick={() => setStage('input')}
            className="w-full mt-6 py-3 rounded-2xl text-sm text-gray-400 border border-gray-800">
            입력 화면으로
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
            <p className="text-gray-500 text-xs mt-0.5">{todayStr} · {servicePriceLine('daily')}</p>
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

        {hasCachedResult && (
          <div className="mb-4 rounded-2xl border border-gray-800 bg-[#111118] p-4">
            <p className="text-sm text-gray-300 mb-3">{quotaMessage || DAILY_FREE_USED_MESSAGE}</p>
            <button onClick={() => setStage('result')}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white"
              style={{ background: selectedChar.color }}>
              오늘 결과 다시 보기
            </button>
          </div>
        )}

        {status !== 'authenticated' && status !== 'loading' && (
          <div className="mb-4 rounded-2xl border border-gray-800 bg-[#111118] p-4">
            <p className="text-sm text-gray-300 mb-3">로그인하면 하루에 한 번 오늘의 운세를 볼 수 있어요.</p>
            <button onClick={() => signIn('kakao', { callbackUrl: '/daily' })}
              className="w-full py-3 rounded-2xl font-bold text-sm text-black"
              style={{ background: '#FEE500' }}>
              카카오로 로그인
            </button>
          </div>
        )}
        <div className="bg-[#111118] rounded-2xl p-4 mb-4 border border-gray-800 space-y-3">
          <p className="text-xs font-medium" style={{ color: selectedChar.color }}>✨ 오늘 하루의 운세를 확인하세요</p>

          {/* 이름 */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">이름</label>
            <input type="text" placeholder="이름을 입력하세요" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none" />
          </div>

          <BirthProfileFields
            value={form}
            onChange={patch => setForm(f => ({ ...f, ...patch }))}
            accentColor={selectedChar.color}
            gender={form.gender}
            onGenderChange={g => setForm(f => ({ ...f, gender: g }))}
          />
          <MaritalStatusField
            value={form.maritalStatus}
            onChange={m => setForm(f => ({ ...f, maritalStatus: m }))}
            accentColor={selectedChar.color}
          />
          <OccupationField
            value={form.occupation}
            onChange={o => setForm(f => ({ ...f, occupation: o }))}
            accentColor={selectedChar.color}
          />
        </div>

        {errorMsg && (
          <p className="mb-3 text-xs text-red-400">{errorMsg}</p>
        )}
        {!canGenerateFree && !paymentsEnabled && !hasCachedResult && (
          <p className="mb-3 text-xs text-amber-300">{quotaMessage || DAILY_FREE_USED_MESSAGE}</p>
        )}
        {paymentsEnabled && !canGenerateFree && (
          <label className="mb-3 flex items-start gap-2 text-sm text-gray-200">
            <input type="checkbox" checked={confirmPaid} onChange={e => setConfirmPaid(e.target.checked)}
              className="mt-0.5 accent-yellow-500" />
            <span>1냥을 사용하여 다른 결과로 다시 생성합니다.</span>
          </label>
        )}
        <EntertainmentConsent agreed={agreed} onChange={setAgreed} />
        <button onClick={handleSubmit} disabled={
          !form.name
          || !agreed
          || status !== 'authenticated'
          || (!canGenerateFree && !paymentsEnabled)
          || (!canGenerateFree && paymentsEnabled && !confirmPaid)
        }
          className="w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${selectedChar.color}, ${selectedChar.color}bb)` }}>
          {status !== 'authenticated'
            ? '로그인 후 오늘 운세 보기'
            : !canGenerateFree && !paymentsEnabled
              ? '오늘은 이용을 완료했어요'
              : `${selectedChar.name}에게 오늘 운세 묻기 ✨`}
        </button>
        <p className="text-center text-gray-600 text-xs mt-3">만세력 기반 분석 · {servicePriceLine('daily')}</p>
      </div>
    </div>
  )
}
