'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ReadingResult from './ReadingResult'
import {DailyNextStep} from './ConversionContent'
import ReadingProgress from '@/components/palace/ReadingProgress'
import { useSession,signIn } from 'next-auth/react'
import {readDailyTrial} from './daily-trial'

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
  { id: 'baekhalma', name: '건물주 백할매', img: '/characters/baekhalma.png', color: '#C6A66D', desc: '직설 팩폭' },
  { id: 'doRyeong',  name: '근본도령',      img: '/characters/doryeong.png',  color: '#80A5C4', desc: '다정 분석' },
  { id: 'gumiho',    name: '구미호 선생',   img: '/characters/gumiho.png',    color: '#C18C9D', desc: '감성 운세' },
  { id: 'sinRyeong', name: '무등산 신령님', img: '/characters/sinryeong.png', color: '#8BAB98', desc: '묵직 판결' },
]

const ELEMENT_COLORS: Record<string, string> = { '木':'#4ade80','火':'#f87171','土':'#fbbf24','金':'#d1d5db','水':'#60a5fa' }
const ELEMENT_BG:    Record<string, string> = { '木':'rgba(34,197,94,.15)','火':'rgba(239,68,68,.15)','土':'rgba(234,179,8,.15)','金':'rgba(156,163,175,.15)','水':'rgba(96,165,250,.15)' }

const SECTIONS = [
  { key: 'overall', scoreKey: 'overall_score', icon: '⭐', title: '오늘의 총운', color: '#F59E0B' },
  { key: 'money',   scoreKey: 'money_score',   icon: '💰', title: '재물운',     color: '#8BAB98' },
  { key: 'love',    scoreKey: 'love_score',     icon: '💕', title: '연애운',     color: '#C18C9D' },
  { key: 'health',  scoreKey: 'health_score',   icon: '🌿', title: '건강운',     color: '#80A5C4' },
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
    { label: '재물', score: result.money_score   ?? 0, color: '#8BAB98', icon: '💰' },
    { label: '연애', score: result.love_score    ?? 0, color: '#C18C9D', icon: '💕' },
    { label: '건강', score: result.health_score  ?? 0, color: '#80A5C4', icon: '🌿' },
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
function LoadingScreen({name,character}:{name:string;character:typeof CHARACTERS[0]}){return <div className="palace-loading-page"><ReadingProgress name={name} character={character.name} image={character.img}/></div>}

// ─── 메인 ─────────────────────────────────────────────
export default function DailyPage() {
  const { data: session, status } = useSession()
  const [stage, setStage]       = useState<'input'|'loading'|'result'>('input')
  const [result, setResult]     = useState<Partial<DailyResult>>({})
  const [manse, setManse]       = useState<ManseData | null>(null)
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0])
  const [calType, setCalType] = useState<'solar'|'lunar'>('solar')
  const [form, setForm] = useState({
    name: '', year: '1990', month: '1', day: '1', hour: '', gender: 'female',
  })
  const [checkingCache, setCheckingCache] = useState(false)
  const [error,setError]=useState('')
  const trial=readDailyTrial()
  const todayStr = stage==='result'&&trial?trial.date:getTodayKST()

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
          }))
          if (p.calType) setCalType(p.calType)
          if (p.characterId) {
            const char = CHARACTERS.find(c => c.id === p.characterId)
            if (char) setSelectedChar(char)
          }
        }
      })
      .catch(() => {})
      .finally(() => setCheckingCache(false))
  }, [status])

  const handleSubmit = async () => {
    if (!form.name||!session) return
    setError('')
    setStage('loading')
    setResult({})
    setManse(null)

    try {
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, calType, characterId: selectedChar.id }),
      })
      if(!res.ok){const data=await res.json();throw new Error(data.error||'다시 시도해주세요.')}
      if (!res.body) throw new Error('해석을 불러오지 못했어요.')

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
      setError(e instanceof Error?e.message:'다시 시도해주세요.')
      setStage('input')
    }
  }

  if(!session)return <div className="trial-notice"><Link href="/">← 홈으로</Link><p>처음 만나는 사주궁</p><h1>일일운세 첫 1회 무료</h1><p>가입 계정당 최초 한 번 제공됩니다.<br/>받은 결과는 추가 차감 없이 다시 볼 수 있어요.</p><button onClick={()=>signIn('kakao')}>카카오 예시 로그인</button><button onClick={()=>signIn('naver')}>네이버 예시 로그인</button><small>비공개 샘플의 가상 로그인입니다.</small></div>
  if(stage==='input'&&trial)return <div className="trial-notice"><Link href="/">← 홈으로</Link><p>무료 체험 완료</p><h1>첫 운세를 확인하셨네요</h1><p>무료 체험은 계정당 최초 1회입니다.<br/>다음 날이나 다른 신령을 선택해도 다시 지급되지 않아요.</p><button onClick={()=>{setManse(trial.manse);setResult(trial.result);setSelectedChar(CHARACTERS.find(c=>c.id===trial.characterId)??CHARACTERS[0]);setStage('result')}}>저장된 결과 다시 보기</button><div className="trial-price"><b>추가 일일운세 이용권 준비 중</b><p>가격이 정해지면 안내해드릴게요.<br/>이 화면에서는 결제나 추가 생성이 발생하지 않습니다.</p></div></div>

  if (stage === 'loading') return <LoadingScreen name={form.name} character={selectedChar} />

  // ✅ 추가: 로그인 사용자의 오늘자 캐시 확인 중 잠깐 뜨는 화면 (깜빡임 방지)
  if (checkingCache && stage === 'input') {
    return (
      <div className="palace-page palace-daily min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-500 text-sm">
        오늘의 운세 불러오는 중...
      </div>
    )
  }

  // ── 결과 화면 ──────────────────────────────────────
  if (stage === 'result') return <ReadingResult title={`${form.name||'회원'}님의 일일운세`} subtitle={todayStr} character={selectedChar.id} characterName={selectedChar.name} quote={result.today_word} manse={manse} scores={SECTIONS.map(s=>({label:s.title,value:result[s.scoreKey as keyof DailyResult] as number|undefined}))} sections={[...SECTIONS.map(s=>({id:s.key,title:s.title,body:result[s.key as keyof DailyResult] as string})),{id:'lucky',title:'행운 포인트',body:result.lucky?.replace(/ \/ /g,'\n')},{id:'warning',title:'오늘 조심할 것',body:result.warning},{id:'biorhythm',title:'오늘의 바이오리듬',content:<BiorhythmChart result={result} charColor="#c9ac86"/>}]} onBack={()=>setStage('input')} actionLabel="새로운 운세 이용 안내"><DailyNextStep/></ReadingResult>

  // ── 입력 화면 ──────────────────────────────────────
  return (
    <div className="palace-page palace-daily min-h-screen bg-[#0a0a0f] text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-5">
          <Link href="/" className="text-gray-400 text-xl">←</Link>
          <div>
            <h1 className="text-xl font-bold">⭐ 일일 운세</h1>
            <p className="text-gray-500 text-xs mt-0.5">{todayStr} · 최초 1회 무료</p>
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
                    ? { background: selectedChar.color, color: '#17202a' }
                    : { background: '#1F2937', color: '#9CA3AF', border: '1px solid #374151' }}>
                  {t === 'solar' ? '양력' : '음력'}
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
                    ? { background: selectedChar.color, color: '#17202a' }
                    : { background: '#111827', color: '#9CA3AF', border: '1px solid #374151' }}>
                  {g === 'male' ? '남성' : '여성'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error&&<p role="alert" className="trial-error">{error}</p>}
        <button onClick={handleSubmit} disabled={!form.name}
          className="w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${selectedChar.color}, ${selectedChar.color}bb)`, color: '#17202a' }}>
          {selectedChar.name}에게 오늘 운세 묻기 ✨
        </button>
        <p className="text-center text-gray-600 text-xs mt-3">계정당 최초 1회 무료 · 저장 결과 재열람 무료</p>
      </div>
    </div>
  )
}
