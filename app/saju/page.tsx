'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import TimeNumberInput from '@/app/components/TimeNumberInput'
import { KOREA_REGIONS } from '@/lib/solarTime'

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

type Stage = 'input' | 'loading' | 'saving' | 'result'

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
  const maxScore = Math.max(...data.map(d => d.score), 1)
  return (
    <div className="rounded-2xl p-4 bg-[#111118] border border-gray-800">
      <div className="flex items-center gap-2 mb-4"><span>📊</span><span className="font-bold text-sm text-white">나이대별 운의 흐름</span></div>
      <div className="flex items-end gap-2 h-28 mb-3">
        {data.map(d => (
          <div key={d.age} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-gray-400">{d.score}</span>
            <div className="w-full rounded-t-lg" style={{ height: `${Math.max((d.score/maxScore)*100,8)}%`, background: SEASON_COLORS[d.season]??'#8B5CF6', minHeight: 8 }} />
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

function TitleCard({ item, charColor, idx }: { item: SajuTitle; charColor: string; idx: number }) {
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
        </div>
        <p className="font-bold text-base leading-snug text-white">{item.title}</p>
        {item.content && (
          <div className="text-gray-300 text-sm leading-relaxed mt-4">
            {item.content.split('\n').map((line, i) => (
              line.startsWith('⚠️')
                ? <p key={i} className="mt-4 text-yellow-300 font-medium">{line}</p>
                : line === ''
                  ? <div key={i} className="h-4" />
                  : <p key={i}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FormattedStrategyText({ text, highlightColor = '#fbbf24' }: { text: string; highlightColor?: string }) {
  const normalized = text.replace(/\s*(첫째,|둘째,|셋째,|넷째,|다섯째,|⚠️)/g, '\n$1').trim()
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
  const [showCustomOcc, setShowCustomOcc] = useState(false)

  const finalResultRef = useRef<Partial<SajuResult>>({})
  const finalManseRef  = useRef<ManseData | null>(null)
  // ✅ 신규: 판결문은 그룹 단위(3개씩)로 완료 순서가 뒤섞여 도착할 수 있어서,
  // id를 key로 하는 맵에 누적한 뒤 항상 숫자 순으로 정렬해서 화면/저장에 반영한다.
  const titlesMapRef = useRef<Record<string, SajuTitle>>({})

  const isRomance = form.questionIntent === '연애/결혼'

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

  const handleSubmit = async () => {
    if (!form.name) return
    if (status === 'unauthenticated') {
      setErrorMsg('로그인 후 이용할 수 있어요.')
      return
    }
    setStage('loading')
    setErrorMsg(null)
    setResult({})
    setManse(null)
    finalResultRef.current = {}
    finalManseRef.current  = null
    titlesMapRef.current   = {}

    try {
      const selectedRegion = KOREA_REGIONS.find(r => r.name === form.birthPlace)
      const res = await fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form, occupation: form.occupation || '일반인', calType, characterId: selectedChar.id,
          partnerInfo: isRomance ? partnerForm : undefined,
          longitude: selectedRegion?.longitude,
        }),
      })
      if (!res.body) {
        setErrorMsg('서버 응답을 받지 못했어요. 다시 시도해주세요.')
        setStage('input')
        return
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let fatalError = false
      let partialErrorCount = 0

      // ✅ 신규: 도착한 판결문 그룹을 id 기준으로 정렬해서 result/ref에 반영하는 헬퍼
      const applySortedTitles = () => {
        const sorted = Object.values(titlesMapRef.current).sort((a, b) => Number(a.id) - Number(b.id))
        finalResultRef.current = { ...finalResultRef.current, titles: sorted }
        setResult(r => ({ ...r, titles: sorted }))
      }

      while (!done) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { done = true; break }

          let parsed: any
          try {
            parsed = JSON.parse(data)
          } catch {
            continue
          }

          switch (parsed.type) {
            case 'manse': {
              finalManseRef.current = parsed.data
              setManse(parsed.data)
              break
            }
            case 'group': {
              (parsed.titles as SajuTitle[]).forEach(t => { titlesMapRef.current[t.id] = t })
              applySortedTitles()
              break
            }
            case 'strategy': {
              finalResultRef.current = { ...finalResultRef.current, strategy: parsed.data }
              setResult(r => ({ ...r, strategy: parsed.data }))
              break
            }
            case 'personal': {
              const personalAnswer = { question: parsed.question, answer: parsed.data.answer }
              finalResultRef.current = { ...finalResultRef.current, personalAnswer }
              setResult(r => ({ ...r, personalAnswer }))
              break
            }
            case 'meta': {
              finalResultRef.current = { ...finalResultRef.current, disclaimer: parsed.disclaimer }
              setResult(r => ({ ...r, disclaimer: parsed.disclaimer }))
              break
            }
            case 'error': {
              // fatal(전체 실패)만 즉시 중단하고, group/strategy/personal 부분 실패는
              // 로그만 남기고 이미 도착한 나머지 결과로 계속 진행한다.
              console.error('[사주궁] 부분 오류 이벤트', parsed)
              if (parsed.scope === 'fatal') {
                fatalError = true
                setErrorMsg(parsed.message || '분석 중 오류가 발생했습니다. 다시 시도해주세요.')
              } else {
                partialErrorCount++
              }
              break
            }
            default:
              break
          }
        }
      }

      if (fatalError || !finalResultRef.current.titles || finalResultRef.current.titles.length === 0) {
        if (!fatalError) setErrorMsg('풀이 생성에 실패했어요. 다시 시도해주세요.')
        setStage('input')
        return
      }

      if (partialErrorCount > 0) {
        console.warn(`[사주궁] 일부 항목(${partialErrorCount}개) 생성 실패 — 나머지 결과로 진행`)
      }

      // 저장
      setStage('saving')
      try {
        const saveRes = await fetch('/api/readings/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: selectedChar.id,
            occupationId: form.occupation,
            sajuData: {
              form: { ...form, calType },
              saju: finalManseRef.current,
              partner: isRomance ? partnerForm : null,
            },
            aiResult: JSON.stringify(finalResultRef.current),
            isPaid: false,
          }),
        })
        if (saveRes.ok) {
          const { shareId } = await saveRes.json()
          router.push(`/result/${shareId}`)
          return
        }
      } catch (saveErr) {
        console.error('저장 실패 (무시):', saveErr)
      }

      setStage('result')
    } catch (e) {
      console.error(e)
      setErrorMsg('분석 중 오류가 발생했습니다. 다시 시도해주세요.')
      setStage('input')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-500 text-sm">
        불러오는 중...
      </div>
    )
  }

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
  if (stage === 'saving') return <LoadingScreen name={form.name} character={selectedChar} saving />

  if (stage === 'result' && result.titles) {
    const allTitles = result.titles
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

          {manse && <ManseTable manse={manse} charColor={selectedChar.color} />}

          {result.personalAnswer && (
            <div className="mb-4 rounded-2xl p-4 border-2" style={{ background: `${selectedChar.color}18`, borderColor: selectedChar.color }}>
              <div className="flex items-center gap-2 mb-2">
                <span>🔮</span>
                <span className="font-bold text-sm" style={{ color: selectedChar.color }}>
                  족집게 질문 — &ldquo;{result.personalAnswer.question}&rdquo;
                </span>
              </div>
              <FormattedStrategyText text={result.personalAnswer.answer} highlightColor={selectedChar.color} />
            </div>
          )}

          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-2 font-medium">✨ 판결 {allTitles.length}가지</p>
            <div className="space-y-3">
              {allTitles.map((t, i) => <TitleCard key={t.id} item={t} charColor={selectedChar.color} idx={i} />)}
            </div>
          </div>

          {result.strategy && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">⚔️</span>
                <h2 className="font-bold text-base">인생 전략 분석</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">책사 모드</span>
              </div>
              {result.strategy.overview && (
                <div className="rounded-2xl p-4 bg-[#111118] border border-gray-800">
                  <div className="flex items-center gap-2 mb-2"><span>🌌</span><span className="font-bold text-sm">인생의 큰 그림</span></div>
                  <p className="text-gray-300 text-sm leading-relaxed">{result.strategy.overview}</p>
                </div>
              )}
              {result.strategy.lifecycle?.length > 0 && <LifecycleChart data={result.strategy.lifecycle} />}
              {result.strategy.golden_period && (
                <div className="rounded-2xl p-4 bg-[#111118] border border-yellow-900/30">
                  <div className="flex items-center gap-2 mb-2"><span>🏆</span><span className="font-bold text-sm text-yellow-400">전성기는 언제?</span></div>
                  <FormattedStrategyText text={result.strategy.golden_period} />
                </div>
              )}
              {result.strategy.peak_guide && (
                <div className="rounded-2xl p-4 bg-[#111118] border border-gray-800">
                  <div className="flex items-center gap-2 mb-2"><span>🚀</span><span className="font-bold text-sm text-green-400">전성기 실전 전략</span></div>
                  <FormattedStrategyText text={result.strategy.peak_guide} highlightColor="#4ade80" />
                </div>
              )}
              {result.strategy.warning && (
                <div className="rounded-2xl p-4 bg-[#111118] border border-yellow-700/40">
                  <div className="flex items-center gap-2 mb-2"><span>⚠️</span><span className="font-bold text-sm text-yellow-400">조심할 시기</span></div>
                  <FormattedStrategyText text={result.strategy.warning} highlightColor="#fbbf24" />
                </div>
              )}
              {result.strategy.final_word && (() => {
                const fw = FINAL_WORD_LABEL[selectedChar.id] ?? { icon: '💬', label: '마지막 한마디' }
                return (
                  <div className="rounded-2xl p-4 border" style={{ background: `${selectedChar.color}14`, borderColor: `${selectedChar.color}55` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span>{fw.icon}</span>
                      <span className="font-bold text-sm" style={{ color: selectedChar.color }}>{fw.label}</span>
                    </div>
                    <p className="text-gray-200 text-sm leading-relaxed">{result.strategy.final_word}</p>
                  </div>
                )
              })()}
            </div>
          )}

          {result.disclaimer && <p className="text-gray-600 text-xs text-center mt-6">{result.disclaimer}</p>}
          <button onClick={() => setStage('input')} className="w-full mt-4 py-3 rounded-2xl text-sm text-gray-400 border border-gray-800">다시 분석하기</button>
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
            <p className="text-gray-500 text-xs mt-0.5">로그인하면 전체 무료 공개</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

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

        <button onClick={handleSubmit} disabled={!form.name}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${selectedChar.color}, ${selectedChar.color}bb)` }}>
          {selectedChar.name}에게 물어보기 →
        </button>
        <p className="text-center text-gray-600 text-xs mt-3">로그인하면 전체 무료 공개</p>
      </div>
    </div>
  )
}
