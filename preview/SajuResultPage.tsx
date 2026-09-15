'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import ReadingResult,{Lifecycle} from './ReadingResult'
import { UNLOCK_PRICE } from '@/lib/pricing'
import PersonalQuestionCard from '@/components/PersonalQuestionCard'
import { sanitizeText } from '@/lib/sajuSanitize'
import { appendSseChunk, parseSseFrame } from '@/lib/sajuSse'
import { normalizePersonalAnswer, PEAK_GUIDE_LABEL, readingPersonalView } from '@/lib/sajuContract'
import { KOREA_REGIONS } from '@/lib/solarTime'
import { ensureKakaoReady, getKakaoDiagnostics, KAKAO_READY_MESSAGE } from '@/lib/kakaoShare'

interface Section { id: string; emoji: string; title: string; body: string }
interface SajuTitle { id: string; category?: string; title: string; teaser: string; is_free: boolean; content: string }

const CHARACTER_IMG: Record<string, string> = {
  baekhalma: '/characters/baekhalma.png',
  doRyeong:  '/characters/doryeong.png',
  gumiho:    '/characters/gumiho.png',
  sinRyeong: '/characters/sinryeong.png',
}
const CHARACTER_COLOR: Record<string, string> = {
  baekhalma: '#C6A66D',
  doRyeong:  '#80A5C4',
  gumiho:    '#C18C9D',
  sinRyeong: '#8BAB98',
}
const CHARACTER_NAMES: Record<string, string> = {
  baekhalma: '건물주 백할매',
  doRyeong:  '근본도령',
  gumiho:    '구미호 선생',
  sinRyeong: '무등산 신령님',
}

const SECTION_ICONS: Record<string, { svg: string; color: string; bg: string }> = {
  energy:  { svg:'M13 10V3L4 14h7v7l9-11h-7z', color:'#fbbf24', bg:'rgba(251,191,36,.15)' },
  money:   { svg:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color:'#fbbf24', bg:'rgba(251,191,36,.15)' },
  career:  { svg:'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color:'#a78bfa', bg:'rgba(167,139,250,.15)' },
  love:    { svg:'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', color:'#f472b6', bg:'rgba(244,114,182,.15)' },
  health:  { svg:'M4.5 12.75l6 6 9-13.5', color:'#4ade80', bg:'rgba(74,222,128,.15)' },
  warning: { svg:'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z', color:'#f87171', bg:'rgba(248,113,113,.15)' },
  lucky:   { svg:'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z', color:'#fbbf24', bg:'rgba(251,191,36,.15)' },
}

function SectionIcon({ id }: { id: string }) {
  const icon = SECTION_ICONS[id] || SECTION_ICONS['energy']
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: icon.bg }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={icon.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon.svg} />
      </svg>
    </div>
  )
}

const elementColor = (el: string) => ({ '木':'#4ade80','火':'#f87171','土':'#fbbf24','金':'#d1d5db','水':'#60a5fa' }[el] || '#888')
const elementBg    = (el: string) => ({ '木':'rgba(34,197,94,.12)','火':'rgba(239,68,68,.12)','土':'rgba(234,179,8,.12)','金':'rgba(156,163,175,.12)','水':'rgba(96,165,250,.12)' }[el] || 'rgba(100,100,100,.1)')

export default function ResultPage() {
  const params  = useParams()
  const router  = useRouter()
  const shareId = params.shareId as string
  const { status: authStatus } = useSession()

  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [sections,    setSections]    = useState<Section[]>([])
  const [titles,      setTitles]      = useState<SajuTitle[]>([])
  const [strategy,    setStrategy]    = useState<any>(null)
  const [openIdx,     setOpenIdx]     = useState<number[]>([0])
  const [characterId, setCharacterId] = useState('baekhalma')
  const [formInfo,    setFormInfo]    = useState<any>(null)
  const [sajuData,    setSajuData]    = useState<any>(null)
  const [isPaid,      setIsPaid]      = useState(false)
  const [copied,      setCopied]      = useState(false)
  const [shareError,  setShareError]  = useState('')
  const [sharing,     setSharing]     = useState(false)
  const [personalAnswer, setPersonalAnswer] = useState<{ question: string; answer: string } | null>(null)
  const [isCompleteResult, setIsCompleteResult] = useState(true)
  const [personalRetrying, setPersonalRetrying] = useState(false)
  const [personalRetryError, setPersonalRetryError] = useState('')

  useEffect(() => {
    if (authStatus === 'authenticated') fetchReading()
  }, [shareId, authStatus])

  const fetchReading = async () => {
    try {
      // ✅ 수정: /api/result → /api/readings
      const res = await fetch(`/api/readings/${shareId}`)
      if (!res.ok) throw new Error('not found')
      const data = await res.json()

      setCharacterId(data.character_id ?? 'baekhalma')
      setIsPaid(data.is_paid ?? false)

      let sajuParsed: any = null
      if (data.saju_data) {
        sajuParsed = typeof data.saju_data === 'string'
          ? JSON.parse(data.saju_data)
          : data.saju_data
        setFormInfo(sajuParsed.form ?? null)
        setSajuData(sajuParsed.saju ?? null)
      }

      if (data.ai_result) {
        try {
          let clean = (typeof data.ai_result === 'string' ? data.ai_result : JSON.stringify(data.ai_result))
            .trim()
            .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
          const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
          if (s !== -1 && e !== -1) clean = clean.slice(s, e + 1)
          const parsed = JSON.parse(clean)
          if (parsed.titles)   { setTitles(parsed.titles); setStrategy(parsed.strategy ?? null) }
          const view = readingPersonalView(parsed, sajuParsed)
          if (view.requested) setPersonalAnswer({ question: view.question, answer: view.answer })
          else setPersonalAnswer(null)
          if (parsed.sections) { setSections(parsed.sections) }
          if (parsed._meta && parsed._meta.isComplete === false) setIsCompleteResult(false)
        } catch {
          setError('풀이 데이터를 불러오는 중 오류가 발생했습니다.')
        }
      } else if (sajuParsed) {
        const view = readingPersonalView(null, sajuParsed)
        if (view.requested) setPersonalAnswer({ question: view.question, answer: view.answer })
      }
    } catch {
      setError('저장된 풀이를 찾을 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const retryPersonalAnswer = async () => {
    const question = (personalAnswer?.question || formInfo?.personalQuestion || '').trim()
    if (!question || !formInfo) {
      setPersonalRetryError('질문 정보가 없어 다시 생성할 수 없어요.')
      return
    }
    setPersonalRetrying(true)
    setPersonalRetryError('')
    try {
      const selectedRegion = KOREA_REGIONS.find(r => r.name === formInfo.birthPlace)
      const res = await fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formInfo,
          personalQuestion: question,
          occupation: formInfo.occupation || '일반인',
          characterId,
          longitude: selectedRegion?.longitude,
          retry: { groups: [], strategy: false, personal: true },
        }),
      })
      if (!res.ok || !res.body) throw new Error('생성 요청에 실패했어요.')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let nextAnswer: { question: string; answer: string } | null = null
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const stepped = appendSseChunk(buffer, decoder.decode(value, { stream: true }))
        buffer = stepped.buffer
        for (const frame of stepped.frames) {
          const parsed = parseSseFrame(frame)
          if (parsed.kind !== 'event') continue
          if (parsed.data.type === 'personal' || parsed.data.type === 'personalAnswer') {
            nextAnswer = normalizePersonalAnswer(parsed.data, question)
          }
        }
      }
      if (!nextAnswer?.answer) throw new Error('답변을 다시 받지 못했어요.')

      setPersonalAnswer(nextAnswer)
      const saveRes = await fetch('/api/readings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareId,
          characterId,
          occupationId: formInfo.occupation || 'general',
          sajuData: { form: { ...formInfo, personalQuestion: question }, saju: sajuData },
          aiResult: JSON.stringify({
            titles,
            strategy,
            personalAnswer: nextAnswer,
            disclaimer: '본 풀이는 엔터테인먼트 및 참고 목적이며, 중요한 결정은 전문가와 상담하세요.',
          }),
          isComplete: true,
        }),
      })
      if (!saveRes.ok) throw new Error('답변은 받았지만 저장에 실패했어요.')
    } catch (e) {
      setPersonalRetryError(e instanceof Error ? e.message : '다시 생성에 실패했어요.')
    } finally {
      setPersonalRetrying(false)
    }
  }

  const charImg   = CHARACTER_IMG[characterId]   ?? '/characters/baekhalma.png'
  const charColor = CHARACTER_COLOR[characterId] ?? '#C6A66D'
  const charName  = CHARACTER_NAMES[characterId] ?? characterId

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setShareError(''); setTimeout(() => setCopied(false), 2000) }
    catch { setShareError('링크를 복사하지 못했어요. 주소창의 링크를 복사해주세요.') }
  }

  const handleKakaoShare = async () => {
    setShareError('')
    setSharing(true)
    const url   = window.location.href
    const title = formInfo ? `${formInfo.name}님의 사주팔자 풀이` : '사주궁 풀이 결과'
    const desc  = `${charName}이 직접 본 사주 결과 — 지금 확인해보세요`
    const imageUrl = `${window.location.origin}${charImg}`
    const diag = getKakaoDiagnostics()
    console.log(JSON.stringify({
      tag: '사주궁:kakao',
      event: 'share_attempt',
      ...diag,
      imageHost: (() => { try { return new URL(imageUrl).host } catch { return 'invalid' } })(),
    }))

    const ready = await ensureKakaoReady()
    if (!ready.ok) {
      console.error(JSON.stringify({ tag: '사주궁:kakao', event: 'share_not_ready', reason: ready.reason, ...getKakaoDiagnostics() }))
      setShareError(KAKAO_READY_MESSAGE[ready.reason])
      setSharing(false)
      return
    }

    try {
      ;(window as any).Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title, description: desc,
          imageUrl,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [{ title: '풀이 보기', link: { mobileWebUrl: url, webUrl: url } }],
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.error(JSON.stringify({
        tag: '사주궁:kakao',
        event: 'share_send_failed',
        err: message,
        ...getKakaoDiagnostics(),
      }))
      setShareError(message || '카카오 공유에 실패했어요.')
    } finally {
      setSharing(false)
    }
  }

  // 로그인 확인 후 서버의 구매 권한에 따라 샘플 또는 전체 해석을 표시.
  // 데이터 로딩/에러 체크보다 먼저 와야 함 (비로그인 상태에선 fetchReading 자체를 안 돌림)
  if (authStatus === 'loading') {
    return (
      <div className="palace-page palace-result bg-[#0a0a0a] min-h-screen flex items-center justify-center text-gray-500 text-sm">
        불러오는 중...
      </div>
    )
  }

  if (authStatus === 'unauthenticated') {
    return (
      <div className="palace-page palace-result bg-[#0a0a0a] min-h-screen flex flex-col items-center justify-center text-white px-6 text-center max-w-[740px] mx-auto">
        <div className="text-5xl mb-5">🔒</div>
        <div className="text-xl font-black mb-2">로그인하고 결과 확인하기</div>
        <div className="text-sm text-gray-500 mb-8 leading-relaxed">
          사주 풀이 결과는 로그인 후 볼 수 있어요<br />
          <span className="text-yellow-400 font-bold">일일운세 최초 1회 무료</span>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <button onClick={() => signIn('kakao', { callbackUrl: `/result/${shareId}` })}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95"
            style={{ background: '#fee500', color: '#3c1e1e' }}>
            <span className="text-xl">💬</span> 카카오로 시작하기
          </button>
          <button onClick={() => signIn('google', { callbackUrl: `/result/${shareId}` })}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95"
            style={{ background: '#fff', color: '#333', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#4285F4' }}>G</span> 구글로 시작하기
          </button>
          <button onClick={() => signIn('naver', { callbackUrl: `/result/${shareId}` })}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95"
            style={{ background: '#03c75a', color: '#fff' }}>
            <span className="text-xl font-black">N</span> 네이버로 시작하기
          </button>
        </div>
        <Link href="/" className="mt-6 text-xs text-gray-600">← 홈으로 돌아가기</Link>
      </div>
    )
  }

  // ── 로딩 ──────────────────────────────────────────
  if (loading) return (
    <div className="palace-page palace-result bg-[#0a0a0a] min-h-screen flex items-center justify-center text-white">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin">🔮</div>
        <div className="text-sm text-[#9aa6b8]">풀이를 불러오는 중...</div>
      </div>
    </div>
  )

  // ── 에러 ──────────────────────────────────────────
  if (error) return (
    <div className="palace-page palace-result bg-[#0a0a0a] min-h-screen flex items-center justify-center text-white max-w-[740px] mx-auto px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">😶</div>
        <div className="text-lg font-black mb-2">풀이를 찾을 수 없어요</div>
        <div className="text-sm text-[#9aa6b8] mb-6">{error}</div>
        <Link href="/saju" className="px-6 py-3 rounded-2xl font-bold text-sm" style={{ background: '#7c3aed', color: '#fff' }}>새로 풀이받기</Link>
      </div>
    </div>
  )

  return <ReadingResult expectedCoreCount={isPaid?12:undefined} onReload={fetchReading} quote={isPaid?undefined:'무료 샘플 1개 · 로그인만으로 전체 해석이 열리지는 않습니다.'} title={`${formInfo?.name||'회원'}님의 사주 해석`} subtitle={formInfo?`${formInfo.year}.${formInfo.month}.${formInfo.day} · ${formInfo.gender==='female'?'여성':'남성'} · ${formInfo.calType==='lunar'?'음력':'양력'}`:''} character={characterId} characterName={charName} manse={sajuData} sections={[
    ...(isPaid&&(personalAnswer?.question||formInfo?.personalQuestion)?[{id:'personal',title:'나의 질문에 대한 답',content:<PersonalQuestionCard question={personalAnswer?.question||formInfo?.personalQuestion||''} answer={personalAnswer?.answer||''} charColor="#afc8dc" retrying={personalRetrying} retryError={personalRetryError} onRetry={retryPersonalAnswer}/>}]:[]),
    ...(isPaid?titles:titles.slice(0,1)).map((t,i)=>({id:'title-'+i,core:true,category:t.category,title:sanitizeText(t.title),note:t.teaser?sanitizeText(t.teaser):undefined,body:sanitizeText(t.content)})),
    ...(isPaid?sections:[]).map((s,i)=>({id:'legacy-'+i,core:true,title:s.title,body:s.body})),
    ...(isPaid&&strategy?[{id:'overview',title:'인생의 큰 그림',body:sanitizeText(strategy.overview||'')},...(strategy.lifecycle?.length?[{id:'lifecycle',title:'나이대별 운의 흐름',content:<Lifecycle items={strategy.lifecycle}/>}]:[]),...(['golden_period','peak_guide','warning','final_word'] as const).map((k,i)=>({id:k,title:['전성기는 언제?',PEAK_GUIDE_LABEL,'조심할 시기','마지막 한마디'][i],body:sanitizeText(strategy[k]||'')}))]:[])
  ]} onBack={()=>router.push('/saju')} actionLabel="새로 풀이받기">{!isPaid&&<aside className="rr-incomplete"><strong>나머지 11개 해석과 조언은 잠겨 있어요.</strong><p>샘플은 한 항목만 제공됩니다. 전체 해석은 구매 확인 후 열립니다.</p><Link href="/pay/demo-current">전체 해석 열기 →</Link><p>검토용: <Link href="/?reading=saju">결제 후 12개 화면 시안 보기</Link></p></aside>}<button className="rr-kakao-share" disabled={sharing} onClick={handleKakaoShare}>{sharing?'공유 준비 중…':'카카오톡 공유하기'}</button><button onClick={handleCopyLink}>{copied?'링크를 복사했어요':'결과 링크 복사'}</button>{shareError&&<p role="alert">{shareError}</p>}</ReadingResult>
}
