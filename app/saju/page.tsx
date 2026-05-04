'use client'
import { useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { SIJIN_NAMES, SIJIN_RANGES, timeStrToBranchIndex } from '@/lib/manse'
import { CHARACTERS, CharacterId } from '@/lib/characters'
import { OCCUPATIONS, OccupationId } from '@/lib/occupations'
import Link from 'next/link'

interface Section { id:string; emoji:string; title:string; body:string }
type PageState = 'input'|'loading'|'result'

const LEGAL_DISCLAIMER = `본 서비스는 사주명리학(四柱命理學) 이론을 AI가 분석한 참고용 엔터테인먼트 콘텐츠입니다. 실제 투자·재무·의료·법률 등 중요한 의사결정의 근거로 사용하지 마십시오. 동일한 사주라도 개인의 노력과 환경에 따라 결과는 달라질 수 있습니다. © 사주야(saju-ya.com)`

function SajuPageContent() {
  const searchParams = useSearchParams()
  const defaultChar = (searchParams.get('character') || 'baekhalma') as CharacterId
  const defaultOcc = (searchParams.get('occupation') || 'general') as OccupationId

  const [state, setState] = useState<PageState>('input')
  const [characterId, setCharacterId] = useState<CharacterId>(defaultChar)
  const [occupationId, setOccupationId] = useState<OccupationId>(defaultOcc)
  const [form, setForm] = useState({
    name:'', year:'1990', month:'6', day:'15',
    timeStr:'10:30',
    unknownTime:false,
    gender:'male' as 'male'|'female',
    isLunar:false,
  })
  const [freeSections, setFreeSections] = useState<Section[]>([])
  const [paidSections, setPaidSections] = useState<Section[]>([])
  const [shareId, setShareId] = useState('')
  const [shareTitle, setShareTitle] = useState('')
  const [adContext, setAdContext] = useState('general')
  const [openIdx, setOpenIdx] = useState<number[]>([0])
  const [isPaid, setIsPaid] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState('')
  const [sajuData, setSajuData] = useState<any>(null)
  const streamRef = useRef('')

  const character = CHARACTERS[characterId]
  const currentSijinIdx = timeStrToBranchIndex(form.unknownTime ? null : form.timeStr)
  const sijinName = SIJIN_NAMES[currentSijinIdx]
  const sijinRange = SIJIN_RANGES[currentSijinIdx]
  const isYajasi = !form.unknownTime && form.timeStr?.startsWith('23:')

  const handleSubmit = async () => {
    if (!form.name || !form.year || !form.month || !form.day) {
      setError('이름과 생년월일을 입력해주세요'); return
    }
    setError(''); setState('loading'); streamRef.current = ''

    try {
      const payload = {
        form: {
          name: form.name,
          year: parseInt(form.year),
          month: parseInt(form.month),
          day: parseInt(form.day),
          timeStr: form.unknownTime ? null : form.timeStr,
          gender: form.gender,
          isLunar: form.isLunar,
        },
        characterId,
        occupationId,
      }

      const res = await fetch('/api/saju', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('API 오류')

      setState('result')
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) { streamRef.current += data.text; setStreamText(streamRef.current) }
            if (data.done && data.shareId) {
              setShareId(data.shareId)
              if (data.sajuData) setSajuData(data.sajuData)
              parseResult(streamRef.current)
            }
          } catch {}
        }
      }
    } catch {
      setState('result')
      const fallback = getFallback(form.name, characterId, occupationId)
      setFreeSections(fallback.slice(0,3)); setPaidSections(fallback.slice(3))
      setShareTitle(`${form.name}님 사주 풀이 완료`)
    }
  }

  const parseResult = (text: string) => {
    try {
      let clean = text.trim()
      clean = clean.replace(/^```json\s*/i, '')
      clean = clean.replace(/^```\s*/i, '')
      clean = clean.replace(/\s*```$/i, '')
      clean = clean.trim()
      const start = clean.indexOf('{')
      const end = clean.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        clean = clean.slice(start, end + 1)
      }
      const parsed = JSON.parse(clean)
      if (parsed.sections && parsed.sections.length > 0) {
        setFreeSections(parsed.sections.slice(0,3))
        setPaidSections(parsed.sections.slice(3))
        setShareTitle(parsed.shareTitle || `${form.name}님 사주`)
        setAdContext(parsed.adContext || 'general')
      } else {
        throw new Error('sections 없음')
      }
    } catch {
      const f = getFallback(form.name, characterId, occupationId)
      setFreeSections(f.slice(0,3)); setPaidSections(f.slice(3))
    }
  }

  const handlePayment = async () => {
    if (!shareId) { alert('먼저 사주 풀이를 완료해주세요'); return }
    try {
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
      const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
      const payment = tossPayments.payment({ customerKey: `user-${shareId}` })
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: 990 },
        orderId: `saju_${shareId}_${Date.now()}`,
        orderName: '사주야 전체 풀이 열람권',
        successUrl: `${window.location.origin}/pay/confirm?shareId=${shareId}`,
        failUrl: `${window.location.origin}/saju?error=payment_failed`,
      })
    } catch (e) {
      console.error('Payment error:', e)
      alert('결제 중 오류가 발생했습니다')
    }
  }

  const toggleSection = (idx:number) => {
    setOpenIdx(prev => prev.includes(idx) ? prev.filter(i=>i!==idx) : [...prev,idx])
  }

  const elementColor = (el: string) => {
    switch(el) {
      case '木': return '#4ade80'
      case '火': return '#f87171'
      case '土': return '#fbbf24'
      case '金': return '#d1d5db'
      case '水': return '#60a5fa'
      default: return '#888'
    }
  }
  const elementBg = (el: string) => {
    switch(el) {
      case '木': return 'rgba(34,197,94,.12)'
      case '火': return 'rgba(239,68,68,.12)'
      case '土': return 'rgba(234,179,8,.12)'
      case '金': return 'rgba(156,163,175,.12)'
      case '水': return 'rgba(96,165,250,.12)'
      default: return 'rgba(100,100,100,.1)'
    }
  }

  // ─── INPUT ───
  if (state === 'input') return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto pb-8">
      <div className="bg-[#111] px-4 py-3 flex items-center gap-3 border-b border-[#1a1a1a]">
        <Link href="/" className="text-lg text-[#888]">←</Link>
        <span className="font-black text-purple-400">사주야</span>
      </div>
      <div className="p-4">
        <div className="mb-5">
          <div className="text-xs font-bold text-[#666] mb-2">신탁 마스터 선택</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(CHARACTERS).map(c => (
              <button key={c.id} onClick={()=>setCharacterId(c.id as CharacterId)}
                className={`p-3 rounded-xl border transition-all text-left flex items-center gap-2.5 ${characterId===c.id?'border-purple-500 bg-purple-950/30':'border-[#222] bg-[#111]'}`}>
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[#2a2a2a] relative" style={{background:c.bgColor}}>
                  <Image src={c.image} alt={c.name} fill className="object-cover"
                    onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
                </div>
                <div>
                  <div className={`text-xs font-bold ${characterId===c.id?'text-purple-300':'text-white'}`}>{c.name}</div>
                  <div className="text-[9px] text-[#555] mt-0.5">{c.specialty[0]}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-[#111] rounded-2xl p-4 border border-[#1a1a1a]">
          <div className="mb-4">
            <label className="text-xs font-bold text-[#666] block mb-1.5">이름</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-600"
              placeholder="이름을 입력하세요" />
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-[#666]">생년월일</label>
              <button onClick={()=>setForm({...form,isLunar:!form.isLunar})}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg ${form.isLunar?'bg-yellow-900/50 text-yellow-400':'bg-[#1a1a1a] text-[#666]'}`}>
                {form.isLunar?'🌙 음력':'☀️ 양력'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([['year','년'],['month','월'],['day','일']] as [keyof typeof form, string][]).map(([key,ph])=>(
                <input key={key} type="number" value={form[key] as string}
                  onChange={e=>setForm({...form,[key]:e.target.value})}
                  className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-purple-600 text-center"
                  placeholder={ph} />
              ))}
            </div>
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-[#666]">출생 시각 <span className="text-purple-400 font-normal">(HH:MM)</span></label>
              <button onClick={()=>setForm({...form,unknownTime:!form.unknownTime})}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg ${form.unknownTime?'bg-yellow-900/50 text-yellow-400':'bg-[#1a1a1a] text-[#666]'}`}>
                {form.unknownTime?'⏰ 모름':'시간 모름?'}
              </button>
            </div>
            <input type="time" value={form.unknownTime?'':form.timeStr}
              onChange={e=>setForm({...form,timeStr:e.target.value})}
              disabled={form.unknownTime}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-600 disabled:opacity-40"
              style={{colorScheme:'dark'}} />
            {!form.unknownTime && form.timeStr && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-purple-400 font-bold">{sijinName}</span>
                <span className="text-[9px] text-[#444]">({sijinRange})</span>
                {isYajasi && <span className="text-[9px] bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded">야자시</span>}
              </div>
            )}
            {form.unknownTime && <div className="text-[10px] text-[#444] mt-1.5">시간 미입력 시 오시(낮 12시)로 계산됩니다</div>}
          </div>
          <div className="mb-4">
            <label className="text-xs font-bold text-[#666] block mb-1.5">성별</label>
            <div className="grid grid-cols-2 gap-2">
              {([['male','👨 남성'],['female','👩 여성']] as ['male'|'female',string][]).map(([val,label])=>(
                <button key={val} onClick={()=>setForm({...form,gender:val})}
                  className={`py-3 rounded-xl text-sm font-bold border transition-all ${form.gender===val?'border-purple-500 bg-purple-950/40 text-purple-300':'border-[#222] bg-[#0a0a0a] text-[#666]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#666]">직업 선택</label>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{background:'rgba(34,197,94,.12)',color:'#4ade80'}}>더 정확한 풀이</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.values(OCCUPATIONS) as typeof OCCUPATIONS[OccupationId][]).map(occ=>(
                <button key={occ.id} onClick={()=>setOccupationId(occ.id)}
                  className={`py-2.5 px-3 rounded-xl text-left border transition-all ${occ.id==='general'?'col-span-2':''} ${occupationId===occ.id?'border-purple-500 bg-purple-950/10':'border-[#222] bg-[#0a0a0a]'}`}>
                  <span className="mr-1.5">{occ.emoji}</span>
                  <span className={`text-sm font-bold ${occupationId===occ.id?'text-purple-300':'text-[#666]'}`}>{occ.label}</span>
                  <span className="block text-[9px] mt-0.5 ml-5" style={{color:occupationId===occ.id?'rgba(192,132,252,.6)':'#444'}}>{occ.subLabel}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {error && <div className="text-red-400 text-xs text-center mt-3">{error}</div>}
        <button onClick={handleSubmit}
          className="w-full mt-4 py-4 rounded-2xl font-black text-lg text-yellow-400 transition-all active:scale-98"
          style={{background:'linear-gradient(135deg,#1a1a1a,#333)',boxShadow:'0 4px 20px rgba(0,0,0,.4)'}}>
          {character.emoji} {character.name}에게 물어보기
        </button>
        <div className="text-center text-xs text-[#444] mt-2">무료 3개 · 전체 열람 🪙 1엽전 (990원)</div>
      </div>
    </div>
  )

  // ─── LOADING ───
  if (state === 'loading') return (
    <div className="bg-[#0a0a0a] min-h-screen flex flex-col items-center justify-center text-white max-w-[430px] mx-auto">
      <div className="relative w-20 h-20 mb-8">
        <div className="absolute inset-0 rounded-full border-[3px] border-purple-500 border-t-transparent animate-spin" />
        <div className="absolute inset-2 rounded-full border-[3px] border-yellow-500 border-r-transparent animate-spin" style={{animationDuration:'1.5s',animationDirection:'reverse'}} />
        <div className="absolute inset-0 flex items-center justify-center text-xl">{character.emoji}</div>
      </div>
      <div className="text-xl font-black mb-2">{character.name}이 보는 중...</div>
      <div className="text-sm text-[#666]">{form.name}님의 사주를 분석하고 있어요</div>
    </div>
  )

  // ─── RESULT ───
  const occupation = OCCUPATIONS[occupationId]
  const occColors: Record<OccupationId,string> = {
    business:'#f59e0b',employee:'#a78bfa',housewife:'#f472b6',student:'#4ade80',general:'#60a5fa'
  }

  const manjuPillars = sajuData ? [
    { label: '시주', pillar: sajuData.hourPillar },
    { label: '일주', pillar: sajuData.dayPillar },
    { label: '월주', pillar: sajuData.monthPillar },
    { label: '연주', pillar: sajuData.yearPillar },
  ] : []

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto pb-8">
      {/* 헤더 */}
      <div className="relative overflow-hidden px-6 py-8 text-center" style={{background:'linear-gradient(160deg,#050010,#0f0030,#050010)'}}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4"
          style={{background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.3)',color:'#c4b5fd'}}>
          {character.emoji} {character.name} 신탁
          <span className="px-2 py-0.5 rounded text-[9px] font-bold"
            style={{background:`rgba(${occupationId==='business'?'245,158,11':occupationId==='employee'?'139,92,246':occupationId==='housewife'?'236,72,153':'34,197,94'},.15)`,color:occColors[occupationId]}}>
            {occupation.emoji} {occupation.label}
          </span>
        </div>
        <div className="text-2xl font-black text-white mb-1">{form.name} 님의 사주팔자</div>
        <div className="text-xs text-[#555]">
          {form.year}.{form.month}.{form.day} {form.unknownTime?'(시간미상)':form.timeStr} · {form.gender==='male'?'남성':'여성'} · {form.isLunar?'음력':'양력'}
        </div>
      </div>

      {/* 만세력 테이블 - 풀버전 */}
      {sajuData && (
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{border:'1px solid #222'}}>
          {/* 헤더 */}
          <div className="py-2.5 text-center text-xs font-black text-yellow-400 tracking-widest"
            style={{background:'#111',borderBottom:'1px solid #222'}}>
            만세력 (四柱八字)
          </div>

          {/* 주 레이블 */}
          <div className="grid grid-cols-4 text-center" style={{borderBottom:'1px solid #222'}}>
            {manjuPillars.map(({label})=>(
              <div key={label} className="py-1.5 text-[10px] font-bold"
                style={{background:'#0d0d0d',borderRight:'1px solid #222',color:'#666'}}>
                {label}
              </div>
            ))}
          </div>

          {/* 천간 + 십신 */}
          <div className="grid grid-cols-4 text-center" style={{borderBottom:'1px solid #222'}}>
            {manjuPillars.map(({label, pillar})=>(
              <div key={label} className="py-2.5" style={{
                background: elementBg(pillar?.stemElement),
                borderRight:'1px solid #222'
              }}>
                <div className="text-3xl font-black leading-none" style={{color: elementColor(pillar?.stemElement)}}>
                  {pillar?.stem ?? '?'}
                </div>
                <div className="text-[9px] mt-1" style={{color:'rgba(255,255,255,0.4)'}}>
                  {pillar?.stemElement}
                </div>
                <div className="text-[9px] font-bold mt-0.5" style={{color:'rgba(255,255,255,0.6)'}}>
                  {pillar?.sipsinStem}
                </div>
              </div>
            ))}
          </div>

          {/* 지지 + 십신 */}
          <div className="grid grid-cols-4 text-center" style={{borderBottom:'1px solid #222'}}>
            {manjuPillars.map(({label, pillar})=>(
              <div key={label} className="py-2.5" style={{
                background: elementBg(pillar?.branchElement),
                borderRight:'1px solid #222'
              }}>
                <div className="text-3xl font-black leading-none" style={{color: elementColor(pillar?.branchElement)}}>
                  {pillar?.branch ?? '?'}
                </div>
                <div className="text-[9px] mt-1" style={{color:'rgba(255,255,255,0.4)'}}>
                  {pillar?.branchElement}
                </div>
                <div className="text-[9px] font-bold mt-0.5" style={{color:'rgba(255,255,255,0.6)'}}>
                  {pillar?.sipsinBranch}
                </div>
              </div>
            ))}
          </div>

          {/* 12운성 */}
          <div className="grid grid-cols-4 text-center" style={{borderBottom:'1px solid #222',background:'#0f0f0f'}}>
            {manjuPillars.map(({label, pillar})=>(
              <div key={label} className="py-2" style={{borderRight:'1px solid #222'}}>
                <div className="text-[9px] text-[#555]">운성</div>
                <div className="text-[10px] font-bold text-purple-400 mt-0.5">{pillar?.sipsung || '-'}</div>
              </div>
            ))}
          </div>

          {/* 지장간 */}
          <div className="grid grid-cols-4 text-center" style={{borderBottom:'1px solid #222',background:'#0a0a0a'}}>
            {manjuPillars.map(({label, pillar})=>(
              <div key={label} className="py-2" style={{borderRight:'1px solid #222'}}>
                <div className="text-[9px] text-[#555] mb-1">지장간</div>
                <div className="flex flex-col gap-0.5 items-center">
                  {(pillar?.jijanggan || []).map((s:string,i:number)=>(
                    <span key={i} className="text-[9px] font-bold"
                      style={{color: elementColor(pillar?.stemElement)}}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 신살 */}
          <div className="grid grid-cols-4 text-center" style={{borderBottom:'1px solid #222',background:'#0d0d0d'}}>
            {manjuPillars.map(({label, pillar})=>(
              <div key={label} className="py-2 px-1" style={{borderRight:'1px solid #222'}}>
                <div className="text-[9px] text-[#555] mb-1">신살</div>
                <div className="flex flex-col gap-0.5 items-center">
                  {(pillar?.sinsal || []).length > 0
                    ? (pillar?.sinsal || []).map((s:string,i:number)=>(
                        <span key={i} className="text-[8px] font-bold"
                          style={{color: s.includes('귀인') ? '#fbbf24' : s === '공망' ? '#f87171' : '#a78bfa'}}>
                          {s}
                        </span>
                      ))
                    : <span className="text-[9px] text-[#333]">-</span>
                  }
                </div>
              </div>
            ))}
          </div>

          {/* 오행 카운트 */}
          {sajuData.elementCount && (
            <div className="grid grid-cols-5 text-center" style={{background:'#0d0d0d',borderBottom:'1px solid #222'}}>
              {(['木','火','土','金','水'] as const).map(el=>(
                <div key={el} className="py-2" style={{borderRight:'1px solid #222'}}>
                  <div className="text-xs font-black" style={{color: elementColor(el)}}>{el}</div>
                  <div className="text-[10px] text-[#555] mt-0.5">{sajuData.elementCount[el] ?? 0}개</div>
                </div>
              ))}
            </div>
          )}

          {/* 합충 */}
          {sajuData.hapchung && sajuData.hapchung.length > 0 && (
            <div className="px-3 py-2.5" style={{background:'#0a0a0a',borderBottom:'1px solid #222'}}>
              <div className="text-[9px] text-[#555] mb-1.5">합충</div>
              <div className="flex flex-wrap gap-1.5">
                {sajuData.hapchung.map((hc:any, i:number)=>(
                  <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: hc.type === 'chung' ? 'rgba(239,68,68,.15)' : 'rgba(34,197,94,.12)',
                      color: hc.type === 'chung' ? '#f87171' : '#4ade80',
                      border: `1px solid ${hc.type==='chung'?'rgba(239,68,68,.3)':'rgba(34,197,94,.2)'}`
                    }}>
                    {hc.name} ({hc.pillars.join('·')})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 공망 + 띠 + 대운 */}
          <div className="flex items-center gap-3 px-4 py-2.5 flex-wrap" style={{background:'#111'}}>
            {sajuData.animal && (
              <span className="text-xs font-bold text-yellow-400">{sajuData.animal}띠</span>
            )}
            {sajuData.gongmang && sajuData.gongmang.length > 0 && (
              <span className="text-[10px] text-red-400 font-bold">
                공망: {sajuData.gongmang.join('·')}
              </span>
            )}
            {sajuData.currentDaeun && (
              <span className="text-[10px] text-[#555]">
                현재 대운: <span className="text-purple-400 font-bold">
                  {sajuData.currentDaeun.stem}{sajuData.currentDaeun.branch}
                </span> ({sajuData.currentDaeun.startAge}~{sajuData.currentDaeun.endAge}세)
              </span>
            )}
          </div>
        </div>
      )}

      {/* 무료 섹션 */}
      <div className="px-4 pt-4">
        <div className="text-xs font-bold text-[#555] mb-3">✦ 무료 풀이 (3개)</div>
        {freeSections.length>0 ? freeSections.map((sec,idx)=>(
          <SectionCard key={sec.id} section={sec} idx={idx}
            isOpen={openIdx.includes(idx)} onToggle={()=>toggleSection(idx)} isFree />
        )) : streamText ? (
          <div className="text-xs text-[#666] p-4 bg-[#111] rounded-xl">분석 중...</div>
        ) : null}
      </div>

      {/* 유료 잠금 */}
      {!isPaid && paidSections.length>0 && (
        <div className="mx-4 my-4 rounded-2xl p-5 text-center" style={{background:'linear-gradient(135deg,#1a1a1a,#2a2a2a)'}}>
          {paidSections.slice(0,4).map(s=>(
            <div key={s.id} className="flex items-center gap-3 mb-2.5 p-3 rounded-xl text-left" style={{background:'rgba(255,255,255,.04)'}}>
              <SectionIcon id={s.id} />
              <span className="text-sm font-bold flex-1" style={{color:'rgba(255,255,255,.4)'}}>{s.title}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
          ))}
          {paidSections.length > 4 && (
            <div className="text-xs text-[#555] mb-3">+ {paidSections.length - 4}개 더 있어요</div>
          )}
          <div className="text-lg font-black text-white mb-2 mt-3">나머지 풀이가 궁금하죠? 🔮</div>
          <div className="text-sm text-[#888] mb-4">990원에 전체 열람 · 한번 결제하면 평생 다시 볼 수 있어요</div>
          <button onClick={handlePayment}
            className="w-full py-4 rounded-2xl font-black text-base text-white"
            style={{background:'linear-gradient(135deg,#f59e0b,#f97316)',boxShadow:'0 4px 16px rgba(245,158,11,.4)'}}>
            💳 🪙 1엽전으로 전부 보기 (990원)
          </button>
          <div className="text-xs text-[#555] mt-2">카카오페이 · 토스페이먼츠 · 신용카드</div>
        </div>
      )}

      {/* 유료 섹션 */}
      {isPaid && paidSections.length>0 && (
        <div className="px-4 mt-2">
          <div className="flex items-center gap-2 p-3 rounded-xl mb-3" style={{background:'rgba(34,197,94,.08)',border:'1px solid rgba(34,197,94,.2)'}}>
            <span className="text-2xl">✅</span>
            <div>
              <div className="text-sm font-bold text-green-400">결제 완료! 전체 풀이 열람 가능 🎉</div>
              <div className="text-xs text-[#555]">로그인하면 언제든 다시 볼 수 있어요</div>
            </div>
          </div>
          {paidSections.map((sec,idx)=>(
            <SectionCard key={sec.id} section={sec} idx={idx+3}
              isOpen={openIdx.includes(idx+3)} onToggle={()=>toggleSection(idx+3)} />
          ))}
        </div>
      )}

      {/* 광고 */}
      <div className="mx-4 mt-4 h-20 rounded-xl flex items-center justify-center gap-2" style={{background:'#111',border:'1.5px dashed #2a2a2a'}}>
        <span>📢</span><span className="text-xs text-[#333]">광고 영역 · Google AdSense</span>
      </div>

      {/* 공유/다시하기 */}
      <div className="px-4 mt-4 space-y-3">
        <button className="w-full py-4 rounded-2xl font-black text-base" style={{background:'#fee500',color:'#3c1e1e'}}
          onClick={()=>alert(`카카오톡 공유!\n"${shareTitle}"\nhttps://saju-ya.com/result/${shareId}`)}>
          💬 뼈 맞은 내 운세 카톡 공유하기
        </button>
        <button onClick={()=>{setState('input');setFreeSections([]);setPaidSections([]);setIsPaid(false);setStreamText('');setSajuData(null)}}
          className="w-full py-3 rounded-2xl font-bold text-sm" style={{background:'#111',border:'1px solid #222',color:'#666'}}>
          ↺ 다시 풀이하기
        </button>
      </div>

      {/* 법적 고지 */}
      <div className="mx-4 mt-6 px-3 py-3 rounded-xl" style={{background:'#0a0a0a',border:'0.5px solid #111'}}>
        <p className="text-[9px] leading-relaxed" style={{color:'#3a3a3a'}}>{LEGAL_DISCLAIMER}</p>
      </div>
    </div>
  )
}

// 섹션별 SVG 아이콘 맵
const SECTION_ICONS: Record<string, { svg: string; color: string; bg: string }> = {
  energy:        { svg:'M13 10V3L4 14h7v7l9-11h-7z', color:'#fbbf24', bg:'rgba(251,191,36,.15)' },
  money:         { svg:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color:'#fbbf24', bg:'rgba(251,191,36,.15)' },
  career:        { svg:'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color:'#a78bfa', bg:'rgba(167,139,250,.15)' },
  love:          { svg:'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', color:'#f472b6', bg:'rgba(244,114,182,.15)' },
  marriage:      { svg:'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z', color:'#f472b6', bg:'rgba(244,114,182,.15)' },
  health:        { svg:'M4.5 12.75l6 6 9-13.5', color:'#4ade80', bg:'rgba(74,222,128,.15)' },
  warning:       { svg:'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z', color:'#f87171', bg:'rgba(248,113,113,.15)' },
  lucky:         { svg:'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z', color:'#fbbf24', bg:'rgba(251,191,36,.15)' },
  relation:      { svg:'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', color:'#60a5fa', bg:'rgba(96,165,250,.15)' },
  money2:        { svg:'M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9', color:'#34d399', bg:'rgba(52,211,153,.15)' },
  thisyear:      { svg:'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z', color:'#fbbf24', bg:'rgba(251,191,36,.15)' },
  nextyear:      { svg:'M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z', color:'#818cf8', bg:'rgba(129,140,248,.15)' },
  daymaster:     { svg:'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418', color:'#a78bfa', bg:'rgba(167,139,250,.15)' },
  personality:   { svg:'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z', color:'#c084fc', bg:'rgba(192,132,252,.15)' },
  fortune:       { svg:'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z', color:'#60a5fa', bg:'rgba(96,165,250,.15)' },
  loveStyle:     { svg:'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z', color:'#f472b6', bg:'rgba(244,114,182,.15)' },
  idealType:     { svg:'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z', color:'#fb923c', bg:'rgba(251,146,60,.15)' },
  compatibility: { svg:'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244', color:'#f472b6', bg:'rgba(244,114,182,.15)' },
  exlove:        { svg:'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z', color:'#9ca3af', bg:'rgba(156,163,175,.12)' },
  bigPicture:    { svg:'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z', color:'#4ade80', bg:'rgba(74,222,128,.15)' },
  daeun:         { svg:'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6', color:'#60a5fa', bg:'rgba(96,165,250,.15)' },
  spiritual:     { svg:'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z', color:'#4ade80', bg:'rgba(74,222,128,.15)' },
}

function SectionIcon({ id }: { id: string }) {
  const icon = SECTION_ICONS[id] || SECTION_ICONS['energy']
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: icon.bg }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke={icon.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon.svg} />
      </svg>
    </div>
  )
}

function SectionCard({section,idx,isOpen,onToggle,isFree=false}:{section:Section,idx:number,isOpen:boolean,onToggle:()=>void,isFree?:boolean}) {
  const isWarning = section.id === 'warning'
  return (
    <div className="rounded-2xl mb-3 overflow-hidden" style={{
      background: isWarning ? '#1a0808' : '#111',
      border: `1px solid ${isWarning ? 'rgba(239,68,68,.2)' : '#1e1e1e'}`
    }}>
      <button className="w-full px-4 py-3.5 flex items-center gap-3 text-left" onClick={onToggle}>
        <SectionIcon id={section.id} />
        <span className={`flex-1 text-sm font-bold ${isWarning?'text-red-300':'text-white'} leading-snug`}>
          {section.title}
        </span>
        {isFree && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
            style={{background:'rgba(34,197,94,.15)',color:'#4ade80'}}>무료</span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#555" strokeWidth="2" strokeLinecap="round"
          style={{transform:isOpen?'rotate(180deg)':'',transition:'transform .2s',flexShrink:0}}>
          <path d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-5 border-t" style={{borderColor:isWarning?'rgba(239,68,68,.12)':'#1e1e1e'}}>
          <p className="text-sm leading-[1.95] pt-4 whitespace-pre-line"
            style={{color:isWarning?'#fca5a5':'#bbb'}}>{section.body}</p>
        </div>
      )}
    </div>
  )
}

function getFallback(name:string, charId:CharacterId, occId:OccupationId): Section[] {
  const occMap:Record<OccupationId,string> = {
    business:'사업',employee:'직장',housewife:'가정',student:'학업',general:'일상'
  }
  const occ = occMap[occId]
  return [
    {
      id:'energy', emoji:'⚡', title:`${name}님, 불 꺼지기 직전의 엔진 타입`,
      body:`할미가 볼 땐 넌 완전 불 체질이야. 오행에 火가 강하게 붙어서 태어난 사람이야. 겉으로는 열정 넘치고 추진력 있어 보이는데, 정작 몸 안에 물 기운(水)은 약해서 일은 산더미인데 에너지는 부족한 구조야. 요즘 유독 소화 안 되고 명치 끝이 꽉 막힌 느낌 있지? 스트레스가 위장으로 다 가는 거야. 이제부터는 무작정 달리기보다 의식적으로 쉼을 장착해야 해. 스마트폰도 충전해야 쓰잖아, 인간아.`
    },
    {
      id:'money', emoji:'💰', title:`돈은 버는데 새는 구멍이 더 큰 팔자`,
      body:`돈 버는 능력은 있는데 굴러들어온 돈을 집어 담을 그릇이 작다는 게야. 할미가 보니까 지금 당장 현금 흐름부터 틀어막아야 해. 이자 비싼 대출 있으면 갈아타고, 쓸데없는 보험부터 정리해라 인간아. 올 하반기 9~11월 사이에 예상치 못한 지출이 한 번 있을 수 있으니 그 시기 전에 비상금 3개월치 꼭 따로 빼놔라.`
    },
    {
      id:'career', emoji:'💼', title:`${occ} 방향, 지금이 딱 결정 타이밍이야`,
      body:`넌 지금 ${occ}에서 본인 능력의 70%도 못 쓰고 있어. 쯧쯧. 창의력이나 표현력 쪽으로 재능이 넘치는 구조인데, 지금 하는 일이 그 재능을 발휘하는 환경인지 한번 따져봐. 내년 3월 이후부터 서서히 방향을 틀어가는 게 이 사주엔 맞아. 지금은 실력 쌓고 인맥 다져두는 시기야, 인간아.`
    },
  ]
}

export default function SajuPage() {
  return <Suspense fallback={<div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center text-white">로딩중...</div>}>
    <SajuPageContent />
  </Suspense>
}
