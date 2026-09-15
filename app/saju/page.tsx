'use client'
import AccessNotice from '@/app/components/AccessNotice'
import ReadingResult, { sajuReadingSections } from '@/app/components/reading/ReadingResult'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import TimeNumberInput from '@/app/components/TimeNumberInput'
import { KOREA_REGIONS } from '@/lib/solarTime'
import { appendSseChunk, parseSseFrame } from '@/lib/sajuSse'
import { assessCompletion, GROUP_IDS, LAST_GROUP_INDEX, normalizePersonalAnswer, sortTitlesById } from '@/lib/sajuContract'

interface SajuTitle {
  id: string; category?: string; title: string; teaser: string; is_free: boolean; content: string
}
interface LifecycleItem {
  age: string; score: number; season: string; desc: string
}
interface Strategy {
  overview: string; golden_period: string; lifecycle: LifecycleItem[]; peak_guide: string; warning: string; final_word?: string
}
interface SajuResult {
  titles: SajuTitle[]; strategy: Strategy; disclaimer?: string; personalAnswer?: { question: string; answer: string }
}
interface MansePillar {
  stem: string; branch: string; stemKr?: string; branchKr?: string
  stemElement: string; branchElement: string; sipsinStem?: string; sipsinBranch?: string
}
interface ManseData {
  yearPillar: MansePillar; monthPillar: MansePillar; dayPillar: MansePillar; hourPillar: MansePillar | null
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
  '인생 흐름 계산하는 중...',
  '전성기 전략 수립하는 중...',
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

export default function SajuPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-500 text-sm">불러오는 중...</div>}><SajuRoute /></Suspense>
}

function SajuRoute() {
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  return <SajuForm key={query} initialQuery={query} />
}

function SajuForm({ initialQuery }: { initialQuery: string }) {
  const initialParams = new URLSearchParams(initialQuery)
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
  const [selectedChar, setSelectedChar] = useState(() => CHARACTERS.find(character => character.id === initialParams.get('character')) ?? CHARACTERS[0])
  const [calType, setCalType] = useState<'solar'|'lunar'>(() => initialParams.get('calType') === 'lunar' ? 'lunar' : 'solar')
  const [form, setForm] = useState(() => ({
    name: initialParams.get('name') ?? '', year: initialParams.get('year') ?? '1990',
    month: initialParams.get('month') ?? '1', day: initialParams.get('day') ?? '1',
    hour: initialParams.get('hour') ?? '', gender: initialParams.get('gender') === 'male' ? 'male' : 'female',
    occupation: '직장인', maritalStatus: '미혼(솔로)', questionIntent: '인생 전반', personalQuestion: '', birthPlace: '',
  }))
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
  const requestBodyRef = useRef<string | null>(null)
  const submittingRef = useRef(false)
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

  const publishResult = (next: Partial<SajuResult>) => {
    finalResultRef.current = next
    setResult(next)
  }

  const mergeTitleList = (): SajuTitle[] => sortTitlesById([...titlesByIdRef.current.values()])

  const currentAssessment = () => assessCompletion({
    titles: mergeTitleList(),
    strategy: finalResultRef.current.strategy,
    personal: finalResultRef.current.personalAnswer,
    requestedPersonal: requestedPersonalRef.current,
    receivedGroupIndexes: receivedGroupsRef.current,
    gotDone: gotDoneRef.current,
  })

  const hintFromReport = (report: ReturnType<typeof assessCompletion>) => {
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
        body: JSON.stringify({ requestId }),
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
    if (!form.name.trim()) return
    if (status !== 'authenticated') {
      setErrorMsg('로그인 후 이용할 수 있어요.')
      return
    }

    if (submittingRef.current) return
    submittingRef.current = true
    abortRef.current?.abort()
    saveAbortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    const requestId = mode === 'retry' && requestIdRef.current ? requestIdRef.current : crypto.randomUUID()
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

    let fatalMessage = ''
    try {
      const selectedRegion = KOREA_REGIONS.find(r => r.name === form.birthPlace)
      if(mode==='full'||!requestBodyRef.current)requestBodyRef.current=JSON.stringify({
        ...form,personalQuestion:form.personalQuestion,occupation:form.occupation||'일반인',calType,
        characterId:selectedChar.id,partnerInfo:isRomance?partnerForm:undefined,longitude:selectedRegion?.longitude,requestId,
      })
      const res = await fetch('/api/saju', {
        method:'POST',headers:{'Content-Type':'application/json'},signal:ac.signal,body:requestBodyRef.current,
      })
      if (requestIdRef.current !== requestId) return
      if (!res.ok) {
        const info = await res.json().catch(() => ({}))
        setErrorMsg(info.error || `서버 오류(${res.status}). 다시 시도해주세요.`)
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
          if (typeof parsed.groupIndex !== 'number' || parsed.groupIndex < 0 || parsed.groupIndex > LAST_GROUP_INDEX) {
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
    } finally {
      submittingRef.current = false
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
          <span className="text-yellow-400 font-bold">계정당 첫 일일운세 1회 무료</span>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <button onClick={() => signIn('kakao', { callbackUrl: `/saju?character=${encodeURIComponent(selectedChar.id)}` })}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95"
            style={{ background: '#fee500', color: '#3c1e1e' }}>
            <span className="text-xl">💬</span> 카카오로 시작하기
          </button>
          <button onClick={() => signIn('google', { callbackUrl: `/saju?character=${encodeURIComponent(selectedChar.id)}` })}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95"
            style={{ background: '#fff', color: '#333', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#4285F4' }}>G</span> 구글로 시작하기
          </button>
          <button onClick={() => signIn('naver', { callbackUrl: `/saju?character=${encodeURIComponent(selectedChar.id)}` })}
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
    const titleMap = new Map((result.titles ?? []).map(item => [String(item.id), item]))
    const generating = genStatus === 'generating'
    const readingSections = sajuReadingSections({
      titles: GROUP_IDS.flat().map(id => titleMap.get(String(id)) ?? { id: String(id), title: `${id}번째 해석`, content: '' }),
      strategy: result.strategy,
      personal: form.personalQuestion.trim() ? { question: form.personalQuestion, answer: result.personalAnswer?.answer || '' } : null,
      pendingPersonal: <div className="rr-prose"><p>{generating ? '질문에 대한 답변을 작성하는 중이에요.' : '질문의 답변을 아직 받지 못했어요.'}</p>
        {!generating && <button type="button" onClick={() => handleSubmit('retry')}>같은 요청 다시 확인</button>}</div>,
      finalWordLabel: FINAL_WORD_LABEL[selectedChar.id]?.label,
    })
    return <ReadingResult
      title={`${form.name}님의 사주 해석`}
      subtitle={`${form.year}.${form.month}.${form.day} · ${calType === 'lunar' ? '음력' : '양력'} · ${form.questionIntent}`}
      character={selectedChar.id}
      characterName={selectedChar.name}
      manse={manse}
      sections={readingSections}
      expectedCoreCount={12}
      pending={generating}
      statusLabel={generating ? '해석 작성 중' : genStatus === 'complete' ? '나의 해석' : '도착한 해석'}
      disclaimer={result.disclaimer}
      onBack={leaveToInput}
      actionLabel="입력 화면으로"
      notice={<>
        {generating && <aside className="rr-status" role="status">해석을 생성하는 중입니다. 먼저 도착한 결과부터 보여드려요.</aside>}
        {genStatus === 'partial' && <aside className="rr-status" role="status"><strong>일부 해석만 완성됐어요.</strong>{missingHint.length > 0 && <p>누락: {missingHint.join(' · ')}</p>}</aside>}
        {genStatus === 'complete' && saveStatus === 'failed' && <aside className="rr-status" role="status">해석은 완료됐지만 저장에 실패했어요.</aside>}
        {genStatus === 'complete' && saveStatus === 'saving' && <aside className="rr-status" role="status">해석 완료 · 저장 중...</aside>}
        {saveStatus === 'failed' && <div className="rr-status"><button type="button" onClick={() => requestIdRef.current && saveReading(requestIdRef.current, genStatus === 'complete')}>저장만 다시 시도</button></div>}
        {genStatus === 'partial' && !generating && <div className="rr-status"><button type="button" onClick={() => handleSubmit('retry')}>같은 요청 다시 확인</button></div>}
        {incompleteSaved && savedShareId && genStatus !== 'complete' && <aside className="rr-status">미완료 상태로 임시 저장했어요. 완성본으로 저장하지 않았습니다.</aside>}
        {failedParts.length > 0 && !generating && <aside className="rr-status">{failedParts.map((part, index) => <p key={`${part.part}-${part.groupIndex ?? 'x'}-${index}`}>
          {part.part === 'group' ? `${(part.groupIndex ?? 0) + 1}번 그룹` : part.part === 'strategy' ? '인생 전략' : part.part === 'personal' ? '족집게 질문' : '전체'} 실패{part.retryable ? '' : ' (재시도 불가)'}
        </p>)}</aside>}
      </>}
    >
      {savedShareId && <Link href={`/result/${encodeURIComponent(savedShareId)}`}>저장된 결과 보기 →</Link>}
    </ReadingResult>
  }

  return (
    <div className="palace-page palace-saju min-h-screen bg-[#0a0a0f] text-white pb-24">
      <AccessNotice />
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-gray-400 text-xl">←</Link>
          <div>
            <h1 className="text-xl font-bold">사주 풀이</h1>
            <p className="text-gray-500 text-xs mt-0.5">새 풀이 1회 1냥 · 로그인 필요</p>
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
                  {t === 'solar' ? '양력' : '음력(평달)'}
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

        <button onClick={() => handleSubmit('full')} disabled={!form.name.trim()}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${selectedChar.color}, ${selectedChar.color}bb)` }}>
          {selectedChar.name}에게 물어보기 →
        </button>
        <p className="text-center text-gray-600 text-xs mt-3">새 풀이 1회 1냥 · 로그인 필요</p>
      </div>
    </div>
  )
}
