'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import ReadingResult, { sajuReadingSections, type ReadingSection } from '@/app/components/reading/ReadingResult'
import ReadingShareActions from '@/app/components/reading/ReadingShareActions'
import { readingPersonalView } from '@/lib/sajuContract'

interface Section { id: string; emoji: string; title: string; body: string }
interface ViewPillar { stem?:string; branch?:string; stemElement?:string; branchElement?:string; stemKr?:string; branchKr?:string; sipsinStem?:string; sipsinBranch?:string }
interface ViewManse { yearPillar?:ViewPillar; monthPillar?:ViewPillar; dayPillar?:ViewPillar; hourPillar?:ViewPillar; elementCount?:Record<string,number>; animal?:string; hourStr?:string }
interface ViewForm { name?:string; year?:number; month?:number; day?:number; gender?:string; calType?:string; personalQuestion?:string }
interface ViewStrategy { overview?:string; lifecycle?:{age:string;score:number;season:string;desc:string}[]; golden_period?:string; peak_guide?:string; warning?:string; final_word?:string }
interface SavedProfile { form?:ViewForm; saju?:ViewManse }
interface SajuTitle { id: string; category?: string; title: string; teaser: string; is_free: boolean; content: string }

const CHARACTER_IMG: Record<string, string> = {
  baekhalma: '/characters/baekhalma.png',
  doRyeong:  '/characters/doryeong.png',
  gumiho:    '/characters/gumiho.png',
  sinRyeong: '/characters/sinryeong.png',
}
const CHARACTER_NAMES: Record<string, string> = {
  baekhalma: '건물주 백할매',
  doRyeong:  '근본도령',
  gumiho:    '구미호 선생',
  sinRyeong: '무등산 신령님',
}

export default function ResultPage() {
  const params = useParams()
  const {data:session,status} = useSession()
  return <ResultPageContent key={`${String(params.shareId)}:${status}:${(session?.user as {id?:string})?.id ?? ''}`}/>
}

function ResultPageContent() {
  const params  = useParams()
  const shareId = params.shareId as string
  const { status: authStatus } = useSession()

  const [loadedFor, setLoadedFor] = useState<string|null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [sections,    setSections]    = useState<Section[]>([])
  const [titles,      setTitles]      = useState<SajuTitle[]>([])
  const [strategy,    setStrategy]    = useState<ViewStrategy|null>(null)
  const [characterId, setCharacterId] = useState('baekhalma')
  const [formInfo,    setFormInfo]    = useState<ViewForm|null>(null)
  const [sajuData,    setSajuData]    = useState<ViewManse|null>(null)
  const [isPaid,      setIsPaid]      = useState(false)
  const [fullAccess,  setFullAccess]  = useState(false)
  const [locked,      setLocked]      = useState(false)
  const [product,     setProduct]     = useState('')
  const [personalAnswer, setPersonalAnswer] = useState<{ question: string; answer: string } | null>(null)
  const [isCompleteResult, setIsCompleteResult] = useState(true)
  const fetchReading = useCallback((signal: AbortSignal) => {
    return fetch(`/api/readings/${shareId}`, { signal, cache: 'no-store' })
      .then(async res => { if (!res.ok) throw new Error(res.status === 401 ? 'login_required' : 'not found'); return res.json() })
      .then(data => {
        if (signal.aborted) return
      setCharacterId(data.character_id ?? 'baekhalma')
      setIsPaid(data.is_paid ?? false)
      setFullAccess(!!data.full_access)
      setLocked(!!data.locked)
      setProduct(typeof data.product === 'string' ? data.product : '')

      setError('')
      setTitles([])
      setSections([])
      setStrategy(null)
      setPersonalAnswer(null)
      setSajuData(null)
      setFormInfo(null)
      setIsCompleteResult(true)
      let sajuParsed: SavedProfile | null = null
      if (data.saju_data) {
        sajuParsed = typeof data.saju_data === 'string'
          ? JSON.parse(data.saju_data)
          : data.saju_data
        setFormInfo(sajuParsed?.form ?? null)
        setSajuData(sajuParsed?.saju ?? null)
      }

      if (data.ai_result) {
        try {
          let clean = (typeof data.ai_result === 'string' ? data.ai_result : JSON.stringify(data.ai_result))
            .trim()
            .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
          const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
          if (s !== -1 && e !== -1) clean = clean.slice(s, e + 1)
          const parsed = JSON.parse(clean)
          if (parsed.titles) { setTitles(data.full_access ? parsed.titles : parsed.titles.slice(0, data.product === 'saju' ? 3 : 1)); setStrategy(data.full_access ? parsed.strategy ?? null : null) }
          const view = readingPersonalView(parsed, sajuParsed)
          if (view.requested) setPersonalAnswer({ question: view.question, answer: view.answer })
          else setPersonalAnswer(null)
          if (parsed.sections) { setSections(data.full_access ? parsed.sections : parsed.sections.slice(0, 1)) }
          else if(data.product && data.product!=='saju' && data.full_access) {
            const labels:Record<string,string>={overall:'총운',yearOverall:'연간 총운',firstHalf:'상반기',secondHalf:'하반기',current:'현재 대운',next10:'향후 10년',career:'직업',money:'재물',love:'관계',health:'건강',warning:'조심할 것',advice:'조언',intro:'총평',lucky:'행운 정보',today_word:'오늘의 한마디',personality:'성격 궁합',longterm:'장기 궁합',best1:'첫 번째 길일',best2:'두 번째 길일',best3:'세 번째 길일',avoid:'피할 날'}
            setSections(Object.entries(labels).filter(([k])=>parsed[k]!=null).map(([id,title])=>({id,title,emoji:'',body:typeof parsed[id]==='string'?parsed[id]:Object.values(parsed[id]).join(' · ')})))
          }
          if (parsed._meta && parsed._meta.isComplete === false) setIsCompleteResult(false)
        } catch {
          setError('풀이 데이터를 불러오는 중 오류가 발생했습니다.')
        }
      } else if (sajuParsed) {
        const view = readingPersonalView(null, sajuParsed)
        if (view.requested) setPersonalAnswer({ question: view.question, answer: view.answer })
      }
      })
      .catch(e => { if (!signal.aborted) setError(e instanceof Error && e.message === 'login_required'
        ? '이 브라우저의 비로그인 풀이가 아니거나, 기존 회원 결과입니다. 기존 회원 결과는 해당 계정으로 로그인해주세요.'
        : '저장된 풀이를 찾을 수 없습니다.') })
      .finally(() => { if (!signal.aborted) { setLoading(false); setLoadedFor(shareId) } })
  }, [shareId])

  useEffect(() => {
    const controller = new AbortController()
    if (authStatus !== 'loading') void fetchReading(controller.signal)
    return () => controller.abort()
  }, [fetchReading, authStatus])

  const charImg   = CHARACTER_IMG[characterId]   ?? '/characters/baekhalma.png'
  const charName  = CHARACTER_NAMES[characterId] ?? characterId

  // Server-verified account or protected guest cookie ownership is required before reading.
  if (authStatus === 'loading') {
    return (
      <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center text-gray-500 text-sm">
        불러오는 중...
      </div>
    )
  }

  // ── 로딩 ──────────────────────────────────────────
  if (loading || loadedFor !== shareId) return (
    <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center text-white">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin">🔮</div>
        <div className="text-sm text-[#9aa6b8]">풀이를 불러오는 중...</div>
      </div>
    </div>
  )

  // ── 에러 ──────────────────────────────────────────
  if (error) return (
    <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center text-white max-w-[430px] mx-auto px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">😶</div>
        <div className="text-lg font-black mb-2">풀이를 찾을 수 없어요</div>
        <div className="text-sm text-[#9aa6b8] mb-6">{error}</div>
        <Link href={`/login?callbackUrl=${encodeURIComponent(`/result/${shareId}`)}`} className="block mb-4 text-sm underline">기존 회원 결과라면 로그인하기</Link>
        <Link href="/saju" className="px-6 py-3 rounded-2xl font-bold text-sm" style={{ background: '#7c3aed', color: '#fff' }}>새로 풀이받기</Link>
      </div>
    </div>
  )

  // Locked sections have already been omitted by the API. Never reconstruct them in the browser.
  const allowedTitles = fullAccess ? titles : titles.slice(0, product === 'saju' ? 3 : 1)
  const allowedSections = fullAccess ? sections : sections.slice(0, 1)
  const question = fullAccess ? personalAnswer?.question || formInfo?.personalQuestion || '' : ''
  const readingSections: ReadingSection[] = sajuReadingSections({
    titles: allowedTitles,
    strategy: fullAccess ? strategy : null,
    personal: question.trim() ? { question, answer: personalAnswer?.answer || '' } : null,
    pendingPersonal: <div className="rr-prose"><p>답변을 불러오지 못했어요. 이미 이용한 결과의 누락된 답변은 추가 결제 전에 확인을 요청해주세요.</p><Link href="/payments">결제 내역에서 확인하기 →</Link></div>,
  })
  if (allowedTitles.length === 0) readingSections.unshift(...allowedSections.map(section => ({
    id: section.id, title: section.title, body: section.body,
  })))
  const reloadReading = () => { void fetchReading(new AbortController().signal) }

  const canShare = isPaid && !locked && isCompleteResult && product !== 'conversation'

  return <ReadingResult
    title={formInfo?.name ? `${formInfo.name}님의 사주 해석` : '나의 사주 해석'}
    subtitle={formInfo ? [formInfo.year && `${formInfo.year}.${formInfo.month}.${formInfo.day}`, formInfo.gender === 'male' ? '남성' : formInfo.gender === 'female' ? '여성' : '', formInfo.calType === 'lunar' ? '음력' : '양력'].filter(Boolean).join(' · ') : undefined}
    character={characterId}
    characterName={charName}
    manse={sajuData}
    sections={readingSections}
    expectedCoreCount={fullAccess && product === 'saju' && titles.length > 0 ? 12 : undefined}
    statusLabel={fullAccess ? (isPaid ? '보관함 · 나의 해석' : '전체 무료 풀이') : product === 'saju' ? '무료 풀이 3개' : '무료 샘플 1개'}
    onReload={reloadReading}
    share={canShare ? <ReadingShareActions
      shareId={shareId}
      title={formInfo?.name ? `${formInfo.name}님의 사주 풀이` : '사주궁 풀이'}
      description={`${charName}이 본 해석입니다. 생년월일과 선택 질문은 공유에 넣지 않습니다.`}
      imagePath={charImg}
    /> : undefined}
    notice={<>
      {locked && <section className="rr-status"><h2>무료 풀이 {product === 'saju' ? '3개' : '1개'}</h2><p>{product === 'saju' ? '이 결과는 이전에 3개만 생성되어 저장됐어요. 새 사주풀이를 받으면 판결문 12개와 인생 전략을 무료로 볼 수 있어요.' : '나머지 해석은 구매 확인 후 열립니다.'}</p>{product === 'saju' && formInfo?.personalQuestion && <p>족집게 질문: {formInfo.personalQuestion}<br />새 사주풀이에서 질문 답변을 함께 받을 수 있어요.</p>}<p>기존 구매 결과는 결제 내역에서 확인할 수 있어요.</p><Link href="/payments">결제 내역 확인하기 →</Link></section>}
      {!isCompleteResult && <aside className="rr-status" role="status">이 풀이는 미완료 상태로 저장된 임시본입니다. 완성본이 아닙니다.</aside>}
    </>}
  >
    {isPaid && product !== 'conversation' && <Link href={`/chat?guide=${characterId.toLowerCase()}&source=${encodeURIComponent(shareId)}`} className="rr-conversation-link">이 사주로 1:1 대화하기 →</Link>}
    <Link href="/storage">보관함으로 →</Link>
    <Link href="/saju">새로 풀이받기 →</Link>
  </ReadingResult>
}
