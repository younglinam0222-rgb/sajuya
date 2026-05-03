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
            if (data.done && data.shareId) { setShareId(data.shareId); parseResult(streamRef.current) }
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
      // 백틱 코드블록 모두 제거
      clean = clean.replace(/^```json\s*/i, '')
      clean = clean.replace(/^```\s*/i, '')
      clean = clean.replace(/\s*```$/i, '')
      clean = clean.trim()
      // JSON 객체 추출
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

  const toggleSection = (idx:number) => {
    setOpenIdx(prev => prev.includes(idx) ? prev.filter(i=>i!==idx) : [...prev,idx])
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
                  <div className="absolute inset-0 flex items-center justify-center text-xl" style={{display:'none'}}>{c.emoji}</div>
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

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto pb-8">
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
          {form.year}.{form.month}.{form.day} {form.unknownTime?'(시간미상)':form.timeStr} · {form.gender==='male'?'남성':'여성'}
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="text-xs font-bold text-[#555] mb-3">✦ 무료 풀이 (3개)</div>
        {freeSections.length>0 ? freeSections.map((sec,idx)=>(
          <SectionCard key={sec.id} section={sec} idx={idx}
            isOpen={openIdx.includes(idx)} onToggle={()=>toggleSection(idx)} isFree />
        )) : streamText ? (
          <div className="text-xs text-[#666] p-4 bg-[#111] rounded-xl">분석 중...</div>
        ) : null}
      </div>

      {!isPaid && paidSections.length>0 && (
        <div className="mx-4 my-4 rounded-2xl p-5 text-center" style={{background:'linear-gradient(135deg,#1a1a1a,#2a2a2a)'}}>
          {paidSections.slice(0,4).map(s=>(
            <div key={s.id} className="flex items-center gap-3 mb-2.5 p-3 rounded-xl text-left" style={{background:'rgba(255,255,255,.05)'}}>
              <span className="text-xl">{s.emoji}</span>
              <span className="text-sm font-bold flex-1" style={{color:'rgba(255,255,255,.5)'}}>{s.title}</span>
              <span>🔒</span>
            </div>
          ))}
          {paidSections.length > 4 && (
            <div className="text-xs text-[#555] mb-3">+ {paidSections.length - 4}개 더 있어요</div>
          )}
          <div className="text-lg font-black text-white mb-2 mt-3">나머지 풀이가 궁금하죠? 🔮</div>
          <div className="text-sm text-[#888] mb-4">990원에 전체 열람 · 한번 결제하면 평생 다시 볼 수 있어요</div>
          <button onClick={()=>setIsPaid(true)}
            className="w-full py-4 rounded-2xl font-black text-base text-white"
            style={{background:'linear-gradient(135deg,#f59e0b,#f97316)',boxShadow:'0 4px 16px rgba(245,158,11,.4)'}}>
            💳 🪙 1엽전으로 전부 보기 (990원)
          </button>
          <div className="text-xs text-[#555] mt-2">카카오페이 · 토스페이먼츠 · 신용카드</div>
        </div>
      )}

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

      <div className="mx-4 mt-4 h-20 rounded-xl flex items-center justify-center gap-2" style={{background:'#111',border:'1.5px dashed #2a2a2a'}}>
        <span>📢</span><span className="text-xs text-[#333]">광고 영역 · Google AdSense</span>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <button className="w-full py-4 rounded-2xl font-black text-base" style={{background:'#fee500',color:'#3c1e1e'}}
          onClick={()=>alert(`카카오톡 공유!\n"${shareTitle}"\nhttps://saju-ya.com/result/${shareId}`)}>
          💬 뼈 맞은 내 운세 카톡 공유하기
        </button>
        <button onClick={()=>{setState('input');setFreeSections([]);setPaidSections([]);setIsPaid(false);setStreamText('')}}
          className="w-full py-3 rounded-2xl font-bold text-sm" style={{background:'#111',border:'1px solid #222',color:'#666'}}>
          ↺ 다시 풀이하기
        </button>
      </div>

      <div className="mx-4 mt-6 px-3 py-3 rounded-xl" style={{background:'#0a0a0a',border:'0.5px solid #111'}}>
        <p className="text-[9px] leading-relaxed" style={{color:'#3a3a3a'}}>{LEGAL_DISCLAIMER}</p>
      </div>
    </div>
  )
}

function SectionCard({section,idx,isOpen,onToggle,isFree=false}:{section:Section,idx:number,isOpen:boolean,onToggle:()=>void,isFree?:boolean}) {
  const isWarning = section.id === 'warning'
  return (
    <div className="rounded-2xl mb-3 overflow-hidden" style={{
      background: isWarning ? '#1a0808' : '#111',
      border: `1px solid ${isWarning ? 'rgba(239,68,68,.25)' : '#1a1a1a'}`
    }}>
      <button className="w-full px-4 py-4 flex items-center gap-3 text-left" onClick={onToggle}>
        <span className="text-xl flex-shrink-0">{section.emoji}</span>
        <span className={`flex-1 text-sm font-bold ${isWarning?'text-red-300':'text-white'} leading-snug`}>{section.title}</span>
        {isFree && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{background:'rgba(34,197,94,.15)',color:'#4ade80'}}>무료</span>}
        <span className="text-sm transition-transform" style={{transform:isOpen?'rotate(180deg)':'',color:'#555'}}>▼</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t" style={{borderColor:isWarning?'rgba(239,68,68,.15)':'#1a1a1a'}}>
          <p className="text-sm leading-[1.9] pt-3 whitespace-pre-line" style={{color:isWarning?'#fca5a5':'#ccc'}}>{section.body}</p>
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
      id:'energy',
      emoji:'⚡',
      title:`${name}님, 불 꺼지기 직전의 엔진 타입`,
      body:`할미가 볼 땐 넌 완전 불 체질이야. 오행에 火가 4개나 붙어서 태어난 사람이야. 겉으로는 열정 넘치고 추진력 있어 보이는데, 정작 몸 안에 물 기운(水)은 상대적으로 약해서, 감당해야 할 일은 산더미인데 내 에너지는 부족한 '재다신약' 구조야. 주변에선 능력 좋다 하지만, 혼자 있을 땐 '아, 다 때려치우고 싶다'는 생각, 자주 하지 않았어? 이건 게으른 게 아니라, 사주 구조상 에너지가 빨리 닳는 게 당연한 거야. 이제부터는 무작정 달리기보다 의식적으로 '쉼'을 장착해야 해. 스마트폰도 충전해야 쓰잖아. 스스로에게 충분한 휴식과 보상을 주는 것, 이게 앞으로 ${name}님의 성공을 더 단단하게 만들어줄 최고의 전략이야. 효율만 따지지 말고, 나를 위한 비효율적인 시간도 꼭 확보해두라고, 인간아.`
    },
    {
      id:'money',
      emoji:'💰',
      title:`돈은 버는데 새는 구멍이 더 큰 팔자`,
      body:`재물운을 보니까 ${name}님, 사주에 재성(土)이 하나뿐에 있어. 돈 버는 능력은 있는데 굴러들어온 돈을 집어 담을 그릇이 작다는 게야. 게다가 火가 강해서 돈 쓸 일도 많아. 지금 대운(정유)이 金 기운이라 현금흐름은 괜찮은데, 고정비·인건비 구멍부터 확실히 막아야 해. 할미가 보니까 지금 당장 법인 운영비부터 잡아야 해. 기업 대출 금리 높은 거 있으면 빨리 갈아타고, 사업자 보험 설계 다시 받아봐라 인간아. 재물은 크게 버는 것보다 새지 않게 막는 게 먼저야. 올 하반기 9~11월 사이에 예상치 못한 지출이 한 번 있을 수 있으니, 그 시기 전에 비상금 3개월치 꼭 따로 빼놔라. 뭐, 나쁜 팔자는 아니야. 방향만 잘 잡으면 돼, 인간아.`
    },
    {
      id:'career',
      emoji:'💼',
      title:`${occ} 방향, 지금이 딱 결정 타이밍이야`,
      body:`할미가 보니까 넌 지금 ${occ}에서 본인 능력의 70%도 못 쓰고 있어. 쯧쯧. 이 사주에 식상(食傷)이 강해서 창의력이나 표현력, 아이디어 쪽으로 재능이 넘치는 구조인데, 지금 하는 일이 그 재능을 제대로 발휘하는 환경인지 한번 따져봐. 올해 대운이 바뀌는 시기라 ${occ} 방향 결정이 향후 10년을 좌우할 수 있어. 지금 당장 큰 변화를 줄 필요는 없는데, 내년 3월 이후부터 서서히 방향을 틀어가는 게 이 사주엔 맞아. 지금은 실력 쌓고 인맥 다져두는 시기야. 실력이 없으면 기회가 와도 잡을 수 없으니까. 방향 정리가 필요하면 먼저 3년 후 내 모습을 구체적으로 그려봐. 막연하게 '잘 됐으면 좋겠다'가 아니라, 어디서 뭘 하고 있는지 그림이 나와야 해, 인간아.`
    },
    {
      id:'love',
      emoji:'❤️',
      title:`연애운, 올해 진짜 움직임이 있어`,
      body:`구미호 선생이 보니까 ${name}님, 연애에서 한 번 마음 주면 끝까지 가는 타입이야. 흠흠. 그게 장점이기도 하고 단점이기도 해. 지금 대운에 인성 기운이 들어오면서 자기 자신에 대한 이해가 깊어지는 시기거든. 그 이해가 깊어질수록 진짜 맞는 사람을 알아보는 눈도 생겨. 올 하반기에 인연 기운이 들어오는데, 억지로 찾으려 하지 말고 일상에서 자연스럽게 만나는 사람들을 눈여겨봐. 조건보다 느낌이야. 이 사주는 조건 따지다가 정작 좋은 인연 놓치는 패턴이 반복돼. 배우자 복이 사주에 분명히 있으니까 너무 조급해하지 마. 선생이 보기엔 진지하게 만날 준비가 된 사람이랑 연결될 타이밍이 가까워지고 있어, 이봐.`
    },
    {
      id:'warning',
      emoji:'⚠️',
      title:`조심해! 이 시기 함부로 큰 결정 금지`,
      body:`근데 말이야, 할미가 솔직히 말해줄게. 이 사주에 火 기운이 너무 강해서 올 하반기, 특히 9월에서 10월 사이에 충동적인 큰 결정을 내릴 위험이 있어. 지금 기운이 올라오는 느낌에 취해서 갑자기 큰 투자 결정하거나, 오래된 관계를 끊거나, 직업을 갑자기 바꾸려는 생각이 들면 일단 2주를 기다려봐. 2주 후에도 같은 생각이면 그때 움직여. 그 충동이 사주 기운에서 오는 건지, 진짜 내 판단인지 구분해야 해. 또 하나, 이 시기에 보증 서는 거 절대 금지야. 가까운 사람일수록 더 위험해. 돈 문제로 소중한 관계 망가뜨리는 패턴이 이 사주에 숨어있거든. 할미가 괜히 하는 말 아니야. 이 경고 꼭 기억해둬라, 인간아.`
    },
    {
      id:'health',
      emoji:'🌿',
      title:`건강, 소화기랑 스트레스 관리가 핵심`,
      body:`무등산 신령이 보기엔 ${name}님, 전반적으로 건강한 편이긴 한데 소화기 계통이 약한 편이에요. 火 기운이 강한 사주는 위장에 열이 차기 쉬워서, 스트레스받을 때 제일 먼저 위장이 반응하거든요. 밥 먹을 때 너무 빨리 먹거나 스트레스 받으면서 먹는 습관, 이것부터 바꿔야 해요. 올해 건강 기운을 보면 상반기는 괜찮은데, 하반기에 무리하면 몸이 신호를 보낼 수 있어요. 특히 수면의 질이 떨어지는 시기가 올 수 있으니, 취침 전 1시간은 스마트폰을 멀리하는 습관을 들여두세요. 운동은 격렬한 것보다 꾸준한 걷기나 스트레칭이 이 사주엔 맞아요. 산신령이 보기엔 규칙적인 운동 하나만 시작해도 내년 운세가 달라집니다.`
    },
  ]
}

export default function SajuPage() {
  return <Suspense fallback={<div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center text-white">로딩중...</div>}>
    <SajuPageContent />
  </Suspense>
}
