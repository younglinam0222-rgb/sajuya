'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import TimeNumberInput from '@/app/components/TimeNumberInput'
import { KOREA_REGIONS } from '@/lib/solarTime'
import { sanitizeText } from '@/lib/sajuSanitize'
import { appendSseChunk, parseSseFrame } from '@/lib/sajuSse'
import { assessFreeStage, FREE_TITLE_IDS } from '@/lib/sajuScope'
import { normalizePersonalAnswer, PEAK_GUIDE_LABEL, sortTitlesById } from '@/lib/sajuContract'
import { titleIsFree } from '@/lib/readingAccess'
import { SAJU_UNLOCK_NYANG } from '@/lib/pricing'

interface SajuTitle {
  id: string; category?: string; title: string; teaser: string; is_free: boolean; content: string
}
interface LifecycleItem {
  age: string; score?: number; season: string; desc: string
}
interface Strategy {
  overview: string; golden_period: string; lifecycle: LifecycleItem[]; peak_guide: string; warning: string; final_word?: string
}
interface SajuResult {
  titles: SajuTitle[]; strategy: Strategy; disclaimer?: string; personalAnswer?: { question: string; answer: string }
}
interface ManseData {
  yearPillar: any; monthPillar: any; dayPillar: any; hourPillar: any
  elementCount: Record<string, number>; animal: string; hourStr: string
}

const YEARS = Array.from({ length: 80 }, (_, i) => 2005 - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const OCCUPATIONS = ['직장인', '사업가', '학생', '주부', '프리랜서', '기타']
const MARITAL_STATUSES = ['미혼(솔로)', '연애중', '기혼', '이혼/사별']
const QUESTION_INTENTS = ['인생 전반', '돈/재물', '연애/결혼', '직업/진로', '건강']

const CHARACTERS = [
  { id: 'baekhalma', name: '건물주 백할매', img: '/characters/baekhalma.png', desc: '팩폭 재물 전문', color: '#8B5CF6' },
  { id: 'doRyeong',  name: '근본도령',       img: '/characters/doryeong.png',  desc: '다정한 종합 분석', color: '#3B82F6' },
  { id: 'gumiho',    name: '구미호 선생',    img: '/characters/gumiho.png',    desc: '연애 궁합 전문',  color: '#EC4899' },
  { id: 'sinRyeong', name: '무등산 신령님',  img: '/characters/sinryeong.png', desc: '대운 인생 전문',  color: '#10B981' },
]

const SEASON_COLORS: Record<string, string> = { '봄':'#10B981','여름':'#F59E0B','가을':'#F97316','겨울':'#3B82F6' }
const SEASON_ICONS:  Record<string, string> = { '봄':'🌱','여름':'☀️','가을':'🍂','겨울':'❄️' }
const ELEMENT_COLORS: Record<string, string> = { '木':'#4ade80','火':'#f87171','土':'#fbbf24','金':'#d1d5db','水':'#60a5fa' }
const ELEMENT_BG:    Record<string, string> = { '木':'rgba(34,197,94,.15)','火':'rgba(239,68,68,.15)','土':'rgba(234,179,8,.15)','金':'rgba(156,163,175,.15)','水':'rgba(96,165,250,.15)' }

// ✅ 신규: 전략 결과 맨 아래에 캐릭터별로 다르게 붙는 마무리 한마디 라벨
const FINAL_WORD_LABEL: Record<string, { icon: string; label: string }> = {
  baekhalma: { icon: '🧓', label: '할매의 진심 한마디' },
  doRyeong:  { icon: '🙏', label: '도령이 마지막으로 하고 싶은 말' },
  gumiho:    { icon: '🦊', label: '선생님의 진심 어린 한마디' },
  sinRyeong: { icon: '🙏', label: '신령님의 마지막 당부' },
}

const LOADING_TIPS = [
  '사주팔자 계산하는 중...',
  '오행 분석하는 중...',
  '판결문 12개 작성하는 중...',
  '인생 흐름 정리하는 중...',
  '전략 문장 작성하는 중...',
]

type Stage = 'input' | 'loading' | 'result'
type GenStatus = 'idle' | 'generating' | 'partial' | 'complete' | 'failed'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed'
type FailedPart = {
  part: 'group' | 'strategy' | 'personal' | 'fatal'
  groupIndex?: number
  message: string
  retryable: boolean
}

function ManseTable({ manse, charColor }: { manse: ManseData; charColor: string }) {
  const pillars = [
    { label: '시주', p: manse.hourPillar },
    { label: '일주', p: manse.dayPillar },
    { label: '월주', p: manse.monthPillar },
    { label: '연주', p: manse.yearPillar },
  ]
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-800 mb-4">
      <div className="py-2 text-center text-xs font-black text-yellow-400 tracking-widest bg-[#111118] border-b border-gray-800">
        만세력 (四柱八字)
      </div>
      <div className="grid grid-cols-4 text-center border-b border-gray-800">
        {pillars.map(({ label }) => (
          <div key={label} className="py-1.5 text-[10px] font-bold text-gray-600 bg-[#0d0d0d]">{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-4 text-center border-b border-gray-800">
        {pillars.map(({ label, p }) => (
          <div key={label} className="py-2" style={{ background: p ? ELEMENT_BG[p.stemElement]||'#111118' : '#111118' }}>
            <div className="text-2xl font-black leading-none" style={{ color: p ? ELEMENT_COLORS[p.stemElement]||'#fff' : '#333' }}>{p ? p.stem : '?'}</div>
            <div className="text-[10px] text-gray-400 font-bold mt-0.5">{p?.stemKr ?? ''}</div>
            <div className="text-[9px] text-gray-500 mt-0.5">{p?.stemElement}</div>
            <div className="text-[9px] text-gray-500">{p?.sipsinStem}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 text-center border-b border-gray-800">
        {pillars.map(({ label, p }) => (
          <div key={label} className="py-2" style={{ background: p ? ELEMENT_BG[p.branchElement]||'#111118' : '#111118' }}>
            <div className="text-2xl font-black leading-none" style={{ color: p ? ELEMENT_COLORS[p.branchElement]||'#fff' : '#333' }}>{p ? p.branch : '?'}</div>
            <div className="text-[10px] text-gray-400 font-bold mt-0.5">{p?.branchKr ?? ''}</div>
            <div className="text-[9px] text-gray-500 mt-0.5">{p?.branchElement}</div>
            <div className="text-[9px] text-gray-500">{p?.sipsinBranch}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 text-center bg-[#0d0d0d]">
        {(['木','火','土','金','水'] as const).map(el => (
          <div key={el} className="py-1.5 border-r border-gray-800 last:border-r-0">
            <div className="text-xs font-black" style={{ color: ELEMENT_COLORS[el] }}>{el}</div>
            <div className="text-[10px] text-gray-600">{manse.elementCount[el]??0}개</div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 bg-[#111118] text-xs text-gray-500">
        {manse.animal}띠 · {manse.hourStr}
        <div className="text-[10px] text-gray-600 mt-1">오행 개수는 겉글자 기준. 지지 십성은 본기(정기). 지장간 합산 아님.</div>
      </div>
    </div>
  )
}

function LoadingScreen({ name, character, saving }: { name: string; character: typeof CHARACTERS[0]; saving?: boolean }) {
  const [tipIdx, setTipIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const t1 = setInterval(() => setTipIdx(i => (i + 1) % LOADING_TIPS.length), 2000)
    const t2 = setInterval(() => setProgress(p => Math.min(p + 2, saving ? 99 : 90)), 300)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [saving])
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-4">
      <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-2" style={{ borderColor: character.color }}>
        <img src={character.img} alt={character.name} className="w-full h-full object-cover object-top animate-breathe" />
      </div>
      <h2 className="text-xl font-bold mb-1">{saving ? '풀이 저장 중...' : `${name}님의 사주 분석 중`}</h2>
      <p className="text-gray-500 text-sm mb-8">{saving ? '잠시만 기다려주세요' : `${character.name}이(가) 보고 있어요`}</p>
      <div className="w-72 h-1.5 bg-gray-800 rounded-full overflow-hidden mb-4">
        <div className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${character.color}, ${character.color}aa)` }} />
      </div>
      <p className="text-gray-400 text-xs animate-pulse">{saving ? '저장 완료 후 자동으로 이동해요' : LOADING_TIPS[tipIdx]}</p>
    </div>
  )
}

function LifecycleChart({ data }: { data: LifecycleItem[] }) {
  if (!data?.length) return null
  return (
    <div className="rounded-2xl p-4 bg-[#111118] border border-gray-800">
      <div className="flex items-center gap-2 mb-4"><span>📊</span><span className="font-bold text-sm text-white">나이대별 흐름</span><span className="text-[10px] text-gray-500">해석 · 계산 점수 아님</span></div>
      <div className="flex items-end gap-2 h-16 mb-3">
        {data.map(d => (
          <div key={d.age} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-lg h-10" style={{ background: SEASON_COLORS[d.season]??'#8B5CF6' }} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-3">
        {data.map(d => (
          <div key={d.age} className="flex-1 text-center">
            <p className="text-xs text-gray-400">{d.age}</p>
            <p className="text-xs">{SEASON_ICONS[d.season]??'✨'}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {data.map(d => (
          <div key={d.age} className="flex items-start gap-2">
            <span className="text-xs font-bold text-gray-500 w-8 flex-shrink-0">{d.age}</span>
            <span className="text-xs" style={{ color: SEASON_COLORS[d.season]??'#fff' }}>{SEASON_ICONS[d.season]} {d.season}</span>
            <span className="text-xs text-gray-400">{d.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ✅ 수정: 데드코드(open state) 제거
function TitleCard({ item, charColor, idx, locked }: { item: SajuTitle; charColor: string; idx: number; locked?: boolean }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: `${charColor}40`, background: '#111118' }}>
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="inline-block text-xs font-bold px-2 py-1 rounded-full"
            style={{ background: `${charColor}25`, color: charColor }}>{idx+1}</span>
          {item.category && (
            <span className="inline-block text-[10px] font-bold px-2 py-1 rounded-full bg-gray-800 text-gray-300">
              {item.category}
            </span>
          )}
          {locked && <span className="ml-auto text-gray-600">🔒</span>}
        </div>
        <p className="font-bold text-base leading-snug text-white">{sanitizeText(item.title)}</p>
        {locked ? (
          <>
            {item.teaser && <p className="text-xs text-gray-500 mt-1">{sanitizeText(item.teaser)}</p>}
            <p className="text-xs text-gray-600 mt-3">전체보기는 결과 화면에서 엽전 {SAJU_UNLOCK_NYANG}냥으로 열 수 있어요.</p>
          </>
        ) : item.content ? (
          <div className="text-gray-300 text-sm leading-relaxed mt-4">
            {sanitizeText(item.content).split('\n').map((line, i) => (
              line.startsWith('⚠️')
                ? <p key={i} className="mt-4 text-yellow-300 font-medium">{line}</p>
                : line === ''
                  ? <div key={i} className="h-4" />
                  : <p key={i}>{line}</p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ✅ 신규: "인생 전략 분석" 섹션(전성기 활용법·조심할 시기)도 판결문 카드처럼
// 항목별 줄바꿈 + 강조 색상이 먹히도록, 텍스트를 줄 단위로 쪼개서 렌더링하는 공용 헬퍼.
// ⚠️ 수정: AI가 응답에 실제 줄바꿈(\n)을 안 넣어주는 경우가 있어서, 줄바꿈 유무와
// 상관없이 "첫째/둘째/셋째/⚠️" 앞에서 강제로 문단을 끊도록 정규식으로 보강.
function FormattedStrategyText({ text, highlightColor = '#fbbf24' }: { text: string; highlightColor?: string }) {
  const normalized = sanitizeText(text).replace(/\s*(첫째,|둘째,|셋째,|넷째,|다섯째,|⚠️)/g, '\n$1').trim()
  const lines = normalized.split('\n').map(l => l.trim()).filter(l => l !== '')
  return (
    <div className="text-gray-300 text-sm leading-relaxed space-y-3">
      {lines.map((line, i) => {
        const isNumbered = /^(첫째|둘째|셋째|넷째|다섯째|\d+[.)])/.test(line)
        const isWarning = line.startsWith('⚠️')
        return (isNumbered || isWarning) ? (
          <p key={i} className="font-semibold" style={{ color: highlightColor }}>{line}</p>
        ) : (
          <p key={i}>{line}</p>
        )
      })}
    </div>
  )
}

export default function SajuPage() {
  const router = useRouter()
  const { status } = useSession()
  const [stage, setStage] = useState<Stage>('input')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [result, setResult] = useState<Partial<SajuResult>>({})
  const [manse, setManse] = useState<ManseData | null>(null)
  const [genStatus, setGenStatus] = useState<GenStatus>('idle')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [failedParts, setFailedParts] = useState<FailedPart[]>([])
  const [missingHint, setMissingHint] = useState<string[]>([])
  const [savedShareId, setSavedShareId] = useState<string | null>(null)
  const [incompleteSaved, setIncompleteSaved] = useState(false)
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0])
  const [calType, setCalType] = useState<'solar'|'lunar'>('solar')
  const [form, setForm] = useState({
    name: '', year: '1990', month: '1', day: '1',
    hour: '', gender: 'female', occupation: '직장인', maritalStatus: '미혼(솔로)', questionIntent: '인생 전반', personalQuestion: '',
    birthPlace: '',
  })
  const [partnerForm, setPartnerForm] = useState({
    name: '', year: '1990', month: '1', day: '1', hour: '', gender: 'male',
  })
  // ✅ 신규: 직업 '기타(직접입력)' — 목록에 없는 직업은 자유롭게 타이핑
  const [showCustomOcc, setShowCustomOcc] = useState(false)

  const finalResultRef = useRef<Partial<SajuResult>>({})
  const finalManseRef  = useRef<ManseData | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const saveAbortRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef<string | null>(null)
  const receivedGroupsRef = useRef<Set<number>>(new Set())
  const titlesByIdRef = useRef<Map<string, SajuTitle>>(new Map())
  const gotDoneRef = useRef(false)
  const requestedPersonalRef = useRef(false)
  const savedShareIdRef = useRef<string | null>(null)
  const saveFingerprintRef = useRef<string | null>(null)
  const timingRef = useRef<{ submitAt: number; firstManse?: number; firstJudgment?: number; allRequired?: number; saveDone?: number }>({ submitAt: 0 })

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      saveAbortRef.current?.abort()
    }
  }, [])

  const isRomance = form.questionIntent === '연애/결혼'

  // ✅ 신규: 오늘의 운세(/daily) 등에서 "전체 사주 풀이 보기" 버튼으로 넘어올 때
  // URL 쿼리(?name=...&year=...)로 입력값을 미리 채워줌 (전환 마찰 감소)
  // useSearchParams 훅 대신 window.location으로 읽어서 정적 프리렌더링 이슈(Suspense 필요) 회피
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (!params.has('name')) return
    setForm(f => ({
      ...f,
      name: params.get('name') ?? f.name,
      year: params.get('year') ?? f.year,
      month: params.get('month') ?? f.month,
      day: params.get('day') ?? f.day,
      hour: params.get('hour') ?? f.hour,
      gender: params.get('gender') ?? f.gender,
    }))
    const cal = params.get('calType')
    if (cal === 'lunar' || cal === 'solar') setCalType(cal)
  }, [])

  const publishResult = (next: Partial<SajuResult>) => {
    finalResultRef.current = next
    setResult(next)
  }

  const mergeTitleList = (): SajuTitle[] => sortTitlesById([...titlesByIdRef.current.values()])

  const currentAssessment = () => assessFreeStage({
    titles: mergeTitleList(),
    receivedGroupIndexes: receivedGroupsRef.current,
    gotDone: gotDoneRef.current,
  })

  const hintFromReport = (report: ReturnType<typeof assessFreeStage>) => {
    const hints: string[] = []
    if (!report.gotDone) hints.push('서버 완료 신호([DONE]) 없음')
    if (report.missingGroups.length) hints.push(`그룹 ${report.missingGroups.map(g => g + 1).join(', ')}`)
    if (report.missingIds.length) hints.push(`판결문 ${report.missingIds.join(', ')}번`)
    if (!report.strategyOk) hints.push('인생 전략')
    if (!report.personalOk) hints.push('족집게 질문')
    return hints
  }

  const clientLog = (event: string, extra: Record<string, unknown> = {}) => {
    console.log(JSON.stringify({
      tag: '사주궁:client',
      requestId: requestIdRef.current,
      event,
      ...extra,
    }))
  }

  const leaveToInput = () => {
    abortRef.current?.abort()
    saveAbortRef.current?.abort()
    requestIdRef.current = null
    setStage('input')
    setGenStatus('idle')
    setSaveStatus('idle')
  }

  const saveReading = async (requestId: string, complete: boolean) => {
    if (requestIdRef.current !== requestId) return
    const askedQuestion = form.personalQuestion.trim()
    const personalAnswer = normalizePersonalAnswer(
      finalResultRef.current.personalAnswer,
      askedQuestion,
    ) ?? (askedQuestion ? { question: askedQuestion, answer: '' } : undefined)
    const payload = {
      titles: mergeTitleList(),
      strategy: finalResultRef.current.strategy,
      ...(personalAnswer ? { personalAnswer } : {}),
      disclaimer: finalResultRef.current.disclaimer ?? '본 풀이는 엔터테인먼트 및 참고 목적이며, 중요한 결정은 전문가와 상담하세요.',
    }
    const fingerprint = `${requestId}:${complete}:${payload.titles.map(t => t.id).join(',')}:${payload.strategy ? 1 : 0}:${personalAnswer?.answer ? 1 : 0}`
    if (saveFingerprintRef.current === fingerprint && savedShareIdRef.current) {
      clientLog('save_skipped_duplicate', { complete })
      if (complete) {
        setSaveStatus('saved')
        router.push(`/result/${savedShareIdRef.current}`)
      }
      return
    }

    saveAbortRef.current?.abort()
    const saveAbort = new AbortController()
    saveAbortRef.current = saveAbort
    setSaveStatus('saving')

    try {
      const saveRes = await fetch('/api/readings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: saveAbort.signal,
        body: JSON.stringify({
          shareId: savedShareIdRef.current ?? undefined,
          requestId,
          isComplete: complete,
          characterId: selectedChar.id,
          occupationId: form.occupation,
          sajuData: {
            form: { ...form, calType },
            saju: finalManseRef.current,
            partner: isRomance ? partnerForm : null,
          },
          aiResult: JSON.stringify(payload),
          isPaid: false,
        }),
      })
      if (requestIdRef.current !== requestId) return
      if (!saveRes.ok) throw new Error(`save_http_${saveRes.status}`)
      const data = await saveRes.json()
      if (requestIdRef.current !== requestId) return
      savedShareIdRef.current = data.shareId
      saveFingerprintRef.current = fingerprint
      setSavedShareId(data.shareId)
      setIncompleteSaved(!complete)
      setSaveStatus('saved')
      const saveDoneAt = performance.now()
      timingRef.current.saveDone = saveDoneAt
      clientLog('save_done', {
        complete,
        updated: !!data.updated,
        msFromSubmit: Math.round(saveDoneAt - timingRef.current.submitAt),
        msFromComplete: timingRef.current.allRequired
          ? Math.round(saveDoneAt - timingRef.current.allRequired)
          : null,
      })
      if (complete) router.push(`/result/${data.shareId}`)
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return
      if (requestIdRef.current !== requestId) return
      console.error(JSON.stringify({
        tag: '사주궁:client',
        requestId,
        event: 'save_failed',
        err: e instanceof Error ? e.message : String(e),
      }))
      setSaveStatus('failed')
      setIncompleteSaved(false)
    }
  }

  const handleSubmit = async (mode: 'full' | 'retry' = 'full') => {
    if (mode !== 'full' && mode !== 'retry') mode = 'full'
    if (!form.name) return
    if (status === 'unauthenticated') {
      setErrorMsg('로그인 후 이용할 수 있어요.')
      return
    }

    abortRef.current?.abort()
    saveAbortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    const requestId = crypto.randomUUID()
    requestIdRef.current = requestId
    requestedPersonalRef.current = form.personalQuestion.trim().length > 0
    gotDoneRef.current = false
    timingRef.current = { submitAt: performance.now() }

    if (mode === 'full') {
      setErrorMsg(null)
      setResult({})
      setManse(null)
      setFailedParts([])
      setMissingHint([])
      setSavedShareId(null)
      setIncompleteSaved(false)
      setSaveStatus('idle')
      finalResultRef.current = {}
      finalManseRef.current = null
      receivedGroupsRef.current = new Set()
      titlesByIdRef.current = new Map()
      savedShareIdRef.current = null
      saveFingerprintRef.current = null
    } else {
      setFailedParts([])
      setErrorMsg(null)
    }

    setGenStatus('generating')
    setStage(mode === 'retry' && (finalManseRef.current || titlesByIdRef.current.size > 0) ? 'result' : 'loading')
    clientLog('submit', {
      mode,
      hasPersonalQuestion: form.personalQuestion.trim().length > 0,
      personalQuestionChars: form.personalQuestion.trim().length,
    })

    const reportNow = currentAssessment()
    const retry = mode === 'retry'
      ? {
          groups: [...new Set([
            ...reportNow.missingGroups,
            ...failedParts.filter(p => p.part === 'group' && typeof p.groupIndex === 'number').map(p => p.groupIndex as number),
          ])].filter(g => g === 0),
          strategy: false,
          personal: false,
        }
      : undefined

    let fatalMessage = ''
    try {
      const selectedRegion = KOREA_REGIONS.find(r => r.name === form.birthPlace)
      const res = await fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ac.signal,
        body: JSON.stringify({
          ...form,
          personalQuestion: form.personalQuestion,
          occupation: form.occupation,
          calType,
          characterId: selectedChar.id,
          partnerInfo: isRomance ? partnerForm : undefined,
          longitude: selectedRegion?.longitude,
          requestId,
          retry,
          phase: 'free',
        }),
      })
      if (requestIdRef.current !== requestId) return
      if (!res.ok) {
        setErrorMsg(res.status === 401 ? '로그인 후 이용할 수 있어요.' : `서버 오류(${res.status}). 다시 시도해주세요.`)
        setGenStatus('failed')
        setStage('input')
        return
      }
      if (!res.body) {
        setErrorMsg('서버 응답을 받지 못했어요. 다시 시도해주세요.')
        setGenStatus('failed')
        setStage('input')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let sseBuffer = ''
      let streamEnded = false

      const applyEvent = (parsed: Record<string, unknown>) => {
        if (parsed.requestId && parsed.requestId !== requestId) return
        if (parsed.type === 'error') {
          const rawPart = parsed.part ?? parsed.scope
          const part = (rawPart === 'group' || rawPart === 'strategy' || rawPart === 'personal' || rawPart === 'fatal'
            ? rawPart
            : 'fatal') as FailedPart['part']
          const failed: FailedPart = {
            part,
            groupIndex: typeof parsed.groupIndex === 'number' ? parsed.groupIndex : undefined,
            message: typeof parsed.message === 'string' ? parsed.message : '분석 중 오류가 발생했습니다.',
            retryable: parsed.retryable !== false,
          }
          setFailedParts(prev => [...prev, failed])
          console.error('[사주궁] 부분 오류 이벤트', failed.message, {
            part,
            groupIndex: failed.groupIndex,
            code: parsed.code ?? null,
          })
          if (!fatalMessage && failed.message) fatalMessage = failed.message
          if (part === 'fatal') setErrorMsg(failed.message)
          clientLog('part_error', { part, groupIndex: failed.groupIndex, retryable: failed.retryable, code: parsed.code ?? null, message: failed.message })
          return
        }
        if (parsed.type === 'manse') {
          finalManseRef.current = parsed.data as ManseData
          setManse(parsed.data as ManseData)
          if (!timingRef.current.firstManse) {
            timingRef.current.firstManse = performance.now()
            clientLog('first_manse', { ms: Math.round(timingRef.current.firstManse - timingRef.current.submitAt) })
          }
          setStage('result')
          return
        }
        if (parsed.type === 'group') {
          if (typeof parsed.groupIndex !== 'number' || parsed.groupIndex !== 0) {
            clientLog('invalid_group_index', { groupIndex: parsed.groupIndex ?? null })
            return
          }
          receivedGroupsRef.current.add(parsed.groupIndex)
          const titles = Array.isArray(parsed.titles) ? parsed.titles as SajuTitle[] : []
          for (const title of titles) {
            if (title && title.id != null) titlesByIdRef.current.set(String(title.id), title)
          }
          publishResult({ ...finalResultRef.current, titles: mergeTitleList() })
          if (!timingRef.current.firstJudgment && titles.length) {
            timingRef.current.firstJudgment = performance.now()
            clientLog('first_judgment', { ms: Math.round(timingRef.current.firstJudgment - timingRef.current.submitAt), groupIndex: parsed.groupIndex })
          }
          setStage('result')
          return
        }
        if (parsed.type === 'strategy') {
          publishResult({ ...finalResultRef.current, strategy: parsed.data as Strategy, titles: mergeTitleList() })
          setStage('result')
          return
        }
        if (parsed.type === 'personal' || parsed.type === 'personalAnswer') {
          const personalAnswer = normalizePersonalAnswer(parsed, form.personalQuestion)
          if (!personalAnswer) {
            clientLog('personal_event_ignored', { hasData: parsed.data != null, keys: Object.keys(parsed) })
            return
          }
          publishResult({
            ...finalResultRef.current,
            personalAnswer,
            titles: mergeTitleList(),
          })
          clientLog('personal_received', { questionChars: personalAnswer.question.length, answerChars: personalAnswer.answer.length })
          setStage('result')
          return
        }
        if (typeof parsed.text === 'string') {
          const combined = `${(finalResultRef.current as { _textBuf?: string })._textBuf ?? ''}${parsed.text}`
          ;(finalResultRef.current as { _textBuf?: string })._textBuf = combined
          try {
            const s = combined.indexOf('{')
            const e = combined.lastIndexOf('}')
            if (s !== -1 && e !== -1) {
              const interim = JSON.parse(combined.slice(s, e + 1))
              const personalAnswer = normalizePersonalAnswer(interim, form.personalQuestion)
              if (personalAnswer) {
                publishResult({
                  ...finalResultRef.current,
                  personalAnswer,
                  titles: Array.isArray(interim.titles) ? interim.titles : mergeTitleList(),
                  strategy: interim.strategy ?? finalResultRef.current.strategy,
                })
                setStage('result')
              }
            }
          } catch { /* 누적 중 */ }
        }
      }

      while (!streamEnded) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        if (requestIdRef.current !== requestId) return
        const chunk = decoder.decode(value, { stream: true })
        const split = appendSseChunk(sseBuffer, chunk)
        sseBuffer = split.buffer
        for (const frame of split.frames) {
          const parsedFrame = parseSseFrame(frame)
          if (parsedFrame.kind === 'done') {
            gotDoneRef.current = true
            streamEnded = true
            break
          }
          if (parsedFrame.kind === 'parse_error') {
            clientLog('sse_parse_error', {
              error: parsedFrame.error,
              payloadLength: parsedFrame.payloadLength,
              head: parsedFrame.head,
            })
            continue
          }
          if (parsedFrame.kind === 'event') applyEvent(parsedFrame.data)
        }
      }

      if (requestIdRef.current !== requestId) return
      if (sseBuffer.trim() && !gotDoneRef.current) {
        const trailing = parseSseFrame(sseBuffer)
        if (trailing.kind === 'parse_error') {
          clientLog('sse_trailing_parse_error', {
            error: trailing.error,
            payloadLength: trailing.payloadLength,
            head: trailing.head,
          })
        }
      }

      const report = currentAssessment()
      setMissingHint(hintFromReport(report))
      clientLog('stream_end', {
        gotDone: report.gotDone,
        complete: report.complete,
        missingIds: report.missingIds,
        missingGroups: report.missingGroups,
        strategyOk: report.strategyOk,
        personalOk: report.personalOk,
        titleCount: mergeTitleList().length,
      })

      if (report.complete) {
        if (!timingRef.current.allRequired) {
          timingRef.current.allRequired = performance.now()
          clientLog('all_required', { ms: Math.round(timingRef.current.allRequired - timingRef.current.submitAt) })
        }
        setGenStatus('complete')
        setStage('result')
        await saveReading(requestId, true)
        return
      }

      const hasAny = mergeTitleList().length > 0 || !!finalResultRef.current.strategy || !!finalResultRef.current.personalAnswer || !!finalManseRef.current
      setGenStatus(hasAny ? 'partial' : 'failed')
      setStage(hasAny ? 'result' : 'input')
      if (!hasAny) {
        setErrorMsg(fatalMessage || (report.gotDone ? '풀이 생성에 실패했어요. 다시 시도해주세요.' : '생성이 끝까지 끝나지 않았어요. 다시 시도해주세요.'))
        return
      }
      if (!report.gotDone) {
        setErrorMsg('연결이 완료 신호 없이 끊어졌어요. 성공한 결과만 남겨두었습니다.')
      }
      await saveReading(requestId, false)
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return
      if (requestIdRef.current !== requestId) return
      console.error(e)
      const hasAny = mergeTitleList().length > 0 || !!finalResultRef.current.strategy
      setGenStatus(hasAny ? 'partial' : 'failed')
      setErrorMsg('분석 중 오류가 발생했습니다. 다시 시도해주세요.')
      setStage(hasAny ? 'result' : 'input')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-500 text-sm">
        불러오는 중...
      </div>
    )
  }

  // ✅ 추가: 로그인 안 하면 사주 풀이 기능 자체를 못 쓰게 막음
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
        <div className="text-5xl mb-5">🔮</div>
        <div className="text-xl font-black mb-2">로그인하고 사주 풀이 받기</div>
        <div className="text-sm text-gray-500 mb-8 leading-relaxed">
          사주 풀이는 로그인 후 이용할 수 있어요<br />
          <span className="text-yellow-400 font-bold">가입 즉시 🪙 1엽전 지급!</span>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <button onClick={() => signIn('kakao', { callbackUrl: '/saju' })}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95"
            style={{ background: '#fee500', color: '#3c1e1e' }}>
            <span className="text-xl">💬</span> 카카오로 시작하기
          </button>
          <button onClick={() => signIn('google', { callbackUrl: '/saju' })}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95"
            style={{ background: '#fff', color: '#333', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#4285F4' }}>G</span> 구글로 시작하기
          </button>
          <button onClick={() => signIn('naver', { callbackUrl: '/saju' })}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95"
            style={{ background: '#03c75a', color: '#fff' }}>
            <span className="text-xl font-black">N</span> 네이버로 시작하기
          </button>
        </div>
        <Link href="/" className="mt-6 text-xs text-gray-600">← 홈으로 돌아가기</Link>
      </div>
    )
  }

  if (stage === 'loading') return <LoadingScreen name={form.name} character={selectedChar} />

  if (stage === 'result' && (result.titles?.length || manse || result.strategy || result.personalAnswer || genStatus === 'generating')) {
    const allTitles = result.titles ?? []
    const titleMap = new Map(allTitles.map(t => [String(t.id), t]))
    const generating = genStatus === 'generating'
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
        <div className="max-w-md mx-auto px-4 pt-6">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={leaveToInput} className="text-gray-400 text-xl">←</button>
            <div>
              <h1 className="text-lg font-bold">{form.name}님의 사주 풀이</h1>
              <p className="text-gray-500 text-xs">{selectedChar.name} · {form.questionIntent}</p>
            </div>
          </div>

          {generating && (
            <div className="mb-4 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs">
              해석을 생성하는 중입니다. 먼저 도착한 결과부터 보여드려요.
            </div>
          )}
          {genStatus === 'partial' && (
            <div className="mb-4 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs">
              일부 해석만 완성됐어요.
              {missingHint.length > 0 && <span> 누락: {missingHint.join(' · ')}</span>}
            </div>
          )}
          {genStatus === 'complete' && saveStatus === 'failed' && (
            <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              해석은 완료됐지만 저장에 실패했어요.
            </div>
          )}
          {genStatus === 'complete' && saveStatus === 'saving' && (
            <div className="mb-4 px-3 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs">
              해석 완료 · 저장 중...
            </div>
          )}
          {saveStatus === 'failed' && (
            <button
              onClick={() => requestIdRef.current && saveReading(requestIdRef.current, genStatus === 'complete')}
              className="w-full mb-4 py-2.5 rounded-xl text-sm font-bold bg-red-500/20 text-red-200 border border-red-500/30">
              저장만 다시 시도
            </button>
          )}
          {genStatus === 'partial' && !generating && (
            <button
              onClick={() => handleSubmit('retry')}
              className="w-full mb-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: selectedChar.color }}>
              실패한 항목만 다시 생성
            </button>
          )}
          {incompleteSaved && savedShareId && genStatus !== 'complete' && (
            <div className="mb-4 px-3 py-2 rounded-xl bg-gray-800 text-gray-400 text-xs">
              미완료 상태로 임시 저장했어요. 완성본으로 저장하지 않았습니다.
            </div>
          )}
          {failedParts.length > 0 && !generating && (
            <div className="mb-4 px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 text-xs space-y-1">
              {failedParts.map((p, i) => (
                <p key={`${p.part}-${p.groupIndex ?? 'x'}-${i}`}>
                  {p.part === 'group' ? `${(p.groupIndex ?? 0) + 1}번 그룹` : p.part === 'strategy' ? '인생 전략' : p.part === 'personal' ? '족집게 질문' : '전체'} 실패
                  {p.retryable ? '' : ' (재시도 불가)'}
                </p>
              ))}
            </div>
          )}

          {(result.personalAnswer || form.personalQuestion.trim()) && (
            <div className="mb-4 rounded-2xl p-4 border-2" style={{ background: `${selectedChar.color}18`, borderColor: selectedChar.color }}>
              <div className="flex items-center gap-2 mb-2">
                <span>🔮</span>
                <span className="font-bold text-sm" style={{ color: selectedChar.color }}>족집게 질문</span>
              </div>
              <p className="text-sm text-white font-medium mb-3">
                “{sanitizeText(result.personalAnswer?.question || form.personalQuestion)}”
              </p>
              {result.personalAnswer?.answer ? (
                <p className="text-sm text-gray-500">족집게 답변은 결과 화면에서 엽전 {SAJU_UNLOCK_NYANG}냥으로 전체보기할 수 있어요.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">
                    {generating
                      ? '질문에 대한 답변을 작성하는 중...'
                      : failedParts.some(p => p.part === 'personal')
                        ? '족집게 답변 생성에 실패했어요.'
                        : '족집게 답변이 아직 도착하지 않았어요.'}
                  </p>
                  {!generating && (
                    <button
                      onClick={() => handleSubmit('retry')}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{ background: selectedChar.color }}>
                      이 질문만 다시 생성
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {manse && <ManseTable manse={manse} charColor={selectedChar.color} />}

          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-2 font-medium">✨ 판결 {allTitles.length}가지{generating ? ' · 도착하는 대로 표시' : ''}</p>
            <div className="space-y-3">
              {FREE_TITLE_IDS.map((id, i) => {
                const item = titleMap.get(String(id))
                if (item) {
                  const titleIndex = allTitles.findIndex(t => String(t.id) === String(item.id))
                  const locked = !titleIsFree(item, titleIndex >= 0 ? titleIndex : i, allTitles)
                  return <TitleCard key={item.id} item={item} charColor={selectedChar.color} idx={i} locked={locked} />
                }
                return (
                  <div key={`pending-${id}`} className="rounded-2xl border border-dashed border-gray-800 bg-[#111118] p-4 text-xs text-gray-500">
                    {id}번 판결문 {generating ? '작성 중...' : '아직 도착하지 않았어요'}
                  </div>
                )
              })}
            </div>
          </div>

          {result.strategy && (
            <div className="mt-6 rounded-2xl p-4 bg-[#111118] border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚔️</span>
                  <h2 className="font-bold text-base">인생 전략 분석</h2>
                </div>
                <span className="text-gray-600">🔒</span>
              </div>
              <p className="text-xs text-gray-500">전체보기는 결과 화면에서 엽전 {SAJU_UNLOCK_NYANG}냥입니다.</p>
            </div>
          )}

          {savedShareId && (
            <Link href={`/result/${savedShareId}`}
              className="block w-full mt-4 py-3.5 rounded-2xl font-bold text-sm text-white text-center"
              style={{ background: selectedChar.color }}>
              결과에서 전체보기 (1냥)
            </Link>
          )}

          {result.disclaimer && <p className="text-gray-600 text-xs text-center mt-6">{result.disclaimer}</p>}
          <button onClick={leaveToInput} className="w-full mt-4 py-3 rounded-2xl text-sm text-gray-400 border border-gray-800">다시 분석하기</button>
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
            <h1 className="text-xl font-bold">사주 풀이</h1>
            <p className="text-gray-500 text-xs mt-0.5">전체보기는 엽전 1냥</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs space-y-1">
            <p>{errorMsg}</p>
            {failedParts.length > 0 && failedParts.slice(0, 3).map((p, i) => (
              <p key={`${p.part}-${p.groupIndex ?? 'x'}-${i}`} className="text-red-300/80">
                {p.part === 'group' ? `${(p.groupIndex ?? 0) + 1}번 그룹` : p.part === 'strategy' ? '인생 전략' : p.part === 'personal' ? '족집게 질문' : '전체'}
                {p.message ? ` · ${p.message}` : ''}
              </p>
            ))}
          </div>
        )}

        {/* 캐릭터 선택 */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-2 block">신령 선택</label>
          <div className="grid grid-cols-2 gap-2">
            {CHARACTERS.map(c => (
              <button key={c.id} onClick={() => setSelectedChar(c)}
                className="p-3 rounded-2xl text-left transition-all border overflow-hidden"
                style={selectedChar.id === c.id
                  ? { borderColor: c.color, background: `${c.color}15` }
                  : { borderColor: '#1f2937', background: '#111118' }}>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border"
                    style={{ borderColor: selectedChar.id === c.id ? c.color : '#374151' }}>
                    <img src={c.img} alt={c.name} className="w-full h-full object-cover object-top"
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
              <button key={q} onClick={() => setForm(f => ({ ...f, questionIntent: q }))}
                className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={form.questionIntent === q
                  ? { background: selectedChar.color, color: 'white' }
                  : { background: '#111827', color: '#9CA3AF', border: '1px solid #374151' }}>
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ 신규: 직접 궁금한 거 자유 입력 (선택) — 채워지면 결과 맨 위에 전용 답변 카드로 표시 */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-2 block">
            🔮 족집게 질문 <span className="text-gray-600">(선택)</span>
          </label>
          <textarea
            value={form.personalQuestion}
            onChange={e => setForm(f => ({ ...f, personalQuestion: e.target.value }))}
            placeholder="예: 지금 회사 계속 다녀도 될까요? / 그 사람이랑 다시 잘될 수 있을까요?"
            rows={2}
            maxLength={200}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none resize-none"
          />
          <p className="text-xs text-gray-600 mt-1">비워두면 위에서 고른 주제로만 풀이해드려요</p>
        </div>

        {/* 내 정보 */}
        <div className="bg-[#111118] rounded-2xl p-4 mb-3 border border-gray-800 space-y-3">
          <p className="text-xs font-bold text-gray-400">{isRomance ? '👤 내 정보' : '👤 기본 정보'}</p>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">이름</label>
            <input type="text" placeholder="이름을 입력하세요" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">생년월일</label>
            <div className="flex gap-2 mb-2">
              {(['solar','lunar'] as const).map(t => (
                <button key={t} onClick={() => setCalType(t)}
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
            <label className="text-xs text-gray-400 mb-1.5 block">
              태어난 시간 <span className="text-gray-600">(선택 · 정확할수록 좋아요)</span>
            </label>
            <TimeNumberInput value={form.hour} onChange={v => setForm(f => ({ ...f, hour: v }))} />
            <p className="text-xs text-gray-600 mt-1">모르면 비워두세요</p>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              태어난 지역 <span className="text-gray-600">(선택 · 시주 정확도 up)</span>
            </label>
            <select value={form.birthPlace} onChange={e => setForm(f => ({ ...f, birthPlace: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
              <option value="">선택 안 함 (표준시로 계산)</option>
              {KOREA_REGIONS.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
            </select>
            {form.birthPlace && (() => {
              const region = KOREA_REGIONS.find(r => r.name === form.birthPlace)
              return region ? (
                <p className="text-xs text-purple-300/70 mt-1.5 font-mono tracking-wide">
                  📍 북위 {region.latitude.toFixed(2)}° · 동경 {region.longitude.toFixed(2)}°
                </p>
              ) : null
            })()}
            <p className="text-xs text-gray-600 mt-1">한국 표준시는 태어난 곳마다 실제 시간과 몇 분씩 차이가 나요. 안 넣어도 무방합니다</p>
          </div>
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
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">결혼 상태</label>
            <div className="grid grid-cols-2 gap-2">
              {MARITAL_STATUSES.map(m => (
                <button key={m} onClick={() => setForm(f => ({ ...f, maritalStatus: m }))}
                  className="py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={form.maritalStatus === m
                    ? { background: selectedChar.color, color: 'white' }
                    : { background: '#111827', color: '#9CA3AF', border: '1px solid #374151' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">직업</label>
            <div className="flex flex-wrap gap-2">
              {OCCUPATIONS.map(o => (
                <button key={o} onClick={() => {
                    if (o === '기타') { setShowCustomOcc(true); setForm(f => ({ ...f, occupation: '' })) }
                    else { setShowCustomOcc(false); setForm(f => ({ ...f, occupation: o })) }
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={(o === '기타' ? showCustomOcc : (!showCustomOcc && form.occupation === o))
                    ? { background: selectedChar.color, color: 'white' }
                    : { background: '#1F2937', color: '#9CA3AF', border: '1px solid #374151' }}>
                  {o === '기타' ? '기타(직접입력)' : o}
                </button>
              ))}
            </div>
            {showCustomOcc && (
              <input type="text" placeholder="직업을 직접 입력해주세요 (예: 요리사, 공무원)"
                value={form.occupation}
                onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}
                className="w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none" />
            )}
          </div>
        </div>

        {/* 상대방 정보 */}
        {isRomance && (
          <div className="bg-[#111118] rounded-2xl p-4 mb-3 border space-y-3"
            style={{ borderColor: `${selectedChar.color}40` }}>
            <p className="text-xs font-bold" style={{ color: selectedChar.color }}>
              {form.maritalStatus === '기혼' ? '💍 배우자 정보' : '💕 상대방 정보'}
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
              <TimeNumberInput value={partnerForm.hour} onChange={v => setPartnerForm(f => ({ ...f, hour: v }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">상대방 성별</label>
              <div className="grid grid-cols-2 gap-2">
                {['male','female'].map(g => (
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

        <button onClick={() => handleSubmit('full')} disabled={!form.name}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${selectedChar.color}, ${selectedChar.color}bb)` }}>
          {selectedChar.name}에게 물어보기 →
        </button>
        <p className="text-center text-gray-600 text-xs mt-3">전체보기는 엽전 1냥 · 이후 무료 재열람</p>
      </div>
    </div>
  )
}
