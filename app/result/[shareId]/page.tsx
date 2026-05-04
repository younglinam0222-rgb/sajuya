'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CHARACTERS } from '@/lib/characters'
import { OCCUPATIONS, OccupationId } from '@/lib/occupations'

interface Section { id: string; emoji: string; title: string; body: string }

const SECTION_ICONS: Record<string, { svg: string; color: string; bg: string }> = {
  energy:        { svg:'M13 10V3L4 14h7v7l9-11h-7z', color:'#fbbf24', bg:'rgba(251,191,36,.15)' },
  money:         { svg:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color:'#fbbf24', bg:'rgba(251,191,36,.15)' },
  career:        { svg:'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color:'#a78bfa', bg:'rgba(167,139,250,.15)' },
  love:          { svg:'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', color:'#f472b6', bg:'rgba(244,114,182,.15)' },
  marriage:      { svg:'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', color:'#f472b6', bg:'rgba(244,114,182,.15)' },
  health:        { svg:'M4.5 12.75l6 6 9-13.5', color:'#4ade80', bg:'rgba(74,222,128,.15)' },
  warning:       { svg:'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z', color:'#f87171', bg:'rgba(248,113,113,.15)' },
  lucky:         { svg:'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z', color:'#fbbf24', bg:'rgba(251,191,36,.15)' },
  relation:      { svg:'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', color:'#60a5fa', bg:'rgba(96,165,250,.15)' },
  money2:        { svg:'M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9', color:'#34d399', bg:'rgba(52,211,153,.15)' },
  thisyear:      { svg:'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z', color:'#fbbf24', bg:'rgba(251,191,36,.15)' },
  nextyear:      { svg:'M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z', color:'#818cf8', bg:'rgba(129,140,248,.15)' },
  daymaster:     { svg:'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3', color:'#a78bfa', bg:'rgba(167,139,250,.15)' },
  personality:   { svg:'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z', color:'#c084fc', bg:'rgba(192,132,252,.15)' },
  fortune:       { svg:'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z', color:'#60a5fa', bg:'rgba(96,165,250,.15)' },
  loveStyle:     { svg:'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z', color:'#f472b6', bg:'rgba(244,114,182,.15)' },
  idealType:     { svg:'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z', color:'#fb923c', bg:'rgba(251,146,60,.15)' },
  compatibility: { svg:'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244', color:'#f472b6', bg:'rgba(244,114,182,.15)' },
  exlove:        { svg:'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z', color:'#9ca3af', bg:'rgba(156,163,175,.12)' },
  bigPicture:    { svg:'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z', color:'#4ade80', bg:'rgba(74,222,128,.15)' },
  daeun:         { svg:'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5', color:'#60a5fa', bg:'rgba(96,165,250,.15)' },
  spiritual:     { svg:'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z', color:'#4ade80', bg:'rgba(74,222,128,.15)' },
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

export default function ResultPage() {
  const params = useParams()
  const shareId = params.shareId as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sections, setSections] = useState<Section[]>([])
  const [openIdx, setOpenIdx] = useState<number[]>([0])
  const [characterId, setCharacterId] = useState<string>('baekhalma')
  const [occupationId, setOccupationId] = useState<OccupationId>('general')
  const [formInfo, setFormInfo] = useState<any>(null)
  const [sajuData, setSajuData] = useState<any>(null)

  useEffect(() => {
    fetchReading()
  }, [shareId])

  const fetchReading = async () => {
    try {
      const res = await fetch(`/api/result/${shareId}`)
      if (!res.ok) throw new Error('not found')
      const data = await res.json()

      setCharacterId(data.character_id)
      setOccupationId(data.occupation_id)

      if (data.saju_data) {
        const parsed = JSON.parse(data.saju_data)
        setFormInfo(parsed.form)
        setSajuData(parsed.saju)
      }

      if (data.ai_result) {
        try {
          let clean = data.ai_result.trim()
          clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
          const start = clean.indexOf('{')
          const end = clean.lastIndexOf('}')
          if (start !== -1 && end !== -1) clean = clean.slice(start, end + 1)
          const parsed = JSON.parse(clean)
          if (parsed.sections) setSections(parsed.sections)
        } catch {
          setError('풀이 데이터를 불러오는 중 오류가 발생했습니다.')
        }
      }
    } catch {
      setError('저장된 풀이를 찾을 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (idx: number) => {
    setOpenIdx(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
  }

  const character = CHARACTERS[characterId]
  const occupation = OCCUPATIONS[occupationId]

  const elementColor = (el: string) => {
    const map: Record<string, string> = { '木':'#4ade80','火':'#f87171','土':'#fbbf24','金':'#d1d5db','水':'#60a5fa' }
    return map[el] || '#888'
  }
  const elementBg = (el: string) => {
    const map: Record<string, string> = { '木':'rgba(34,197,94,.12)','火':'rgba(239,68,68,.12)','土':'rgba(234,179,8,.12)','金':'rgba(156,163,175,.12)','水':'rgba(96,165,250,.12)' }
    return map[el] || 'rgba(100,100,100,.1)'
  }

  if (loading) return (
    <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center text-white">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin">🔮</div>
        <div className="text-sm text-[#666]">풀이를 불러오는 중...</div>
      </div>
    </div>
  )

  if (error) return (
    <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center text-white max-w-[430px] mx-auto px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">😶</div>
        <div className="text-lg font-black mb-2">풀이를 찾을 수 없어요</div>
        <div className="text-sm text-[#666] mb-6">{error}</div>
        <Link href="/saju" className="px-6 py-3 rounded-2xl font-bold text-sm"
          style={{background:'#7c3aed',color:'#fff'}}>
          새로 풀이받기
        </Link>
      </div>
    </div>
  )

  const manjuPillars = sajuData ? [
    { label: '시주', pillar: sajuData.hourPillar },
    { label: '일주', pillar: sajuData.dayPillar },
    { label: '월주', pillar: sajuData.monthPillar },
    { label: '연주', pillar: sajuData.yearPillar },
  ] : []

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto pb-8">
      {/* 헤더 */}
      <div className="relative overflow-hidden px-6 py-8 text-center"
        style={{background:'linear-gradient(160deg,#050010,#0f0030,#050010)'}}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4"
          style={{background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.3)',color:'#c4b5fd'}}>
          {character?.emoji} {character?.name} 신탁
          {occupation && (
            <span className="px-2 py-0.5 rounded text-[9px] font-bold"
              style={{background:'rgba(139,92,246,.15)',color:'#a78bfa'}}>
              {occupation.emoji} {occupation.label}
            </span>
          )}
        </div>
        {formInfo && (
          <>
            <div className="text-2xl font-black text-white mb-1">{formInfo.name} 님의 사주팔자</div>
            <div className="text-xs text-[#555]">
              {formInfo.year}.{formInfo.month}.{formInfo.day} {formInfo.timeStr || '(시간미상)'} · {formInfo.gender === 'male' ? '남성' : '여성'} · {formInfo.isLunar ? '음력' : '양력'}
            </div>
          </>
        )}
      </div>

      {/* 만세력 */}
      {sajuData && manjuPillars.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{border:'1px solid #222'}}>
          <div className="py-2.5 text-center text-xs font-black text-yellow-400 tracking-widest"
            style={{background:'#111',borderBottom:'1px solid #222'}}>
            만세력 (四柱八字)
          </div>
          <div className="grid grid-cols-4 text-center" style={{borderBottom:'1px solid #222'}}>
            {manjuPillars.map(({label})=>(
              <div key={label} className="py-1.5 text-[10px] font-bold"
                style={{background:'#0d0d0d',borderRight:'1px solid #222',color:'#666'}}>
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 text-center" style={{borderBottom:'1px solid #222'}}>
            {manjuPillars.map(({label,pillar})=>(
              <div key={label} className="py-2.5" style={{background:elementBg(pillar?.stemElement),borderRight:'1px solid #222'}}>
                <div className="text-3xl font-black" style={{color:elementColor(pillar?.stemElement)}}>{pillar?.stem}</div>
                <div className="text-[9px] mt-0.5" style={{color:'rgba(255,255,255,.4)'}}>{pillar?.stemElement}</div>
                <div className="text-[9px] font-bold" style={{color:'rgba(255,255,255,.5)'}}>{pillar?.sipsinStem}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 text-center" style={{borderBottom:'1px solid #222'}}>
            {manjuPillars.map(({label,pillar})=>(
              <div key={label} className="py-2.5" style={{background:elementBg(pillar?.branchElement),borderRight:'1px solid #222'}}>
                <div className="text-3xl font-black" style={{color:elementColor(pillar?.branchElement)}}>{pillar?.branch}</div>
                <div className="text-[9px] mt-0.5" style={{color:'rgba(255,255,255,.4)'}}>{pillar?.branchElement}</div>
                <div className="text-[9px] font-bold" style={{color:'rgba(255,255,255,.5)'}}>{pillar?.sipsinBranch}</div>
              </div>
            ))}
          </div>
          {sajuData.elementCount && (
            <div className="grid grid-cols-5 text-center" style={{background:'#0d0d0d'}}>
              {(['木','火','土','金','水'] as const).map(el=>(
                <div key={el} className="py-2" style={{borderRight:'1px solid #222'}}>
                  <div className="text-xs font-black" style={{color:elementColor(el)}}>{el}</div>
                  <div className="text-[10px] text-[#555] mt-0.5">{sajuData.elementCount[el]??0}개</div>
                </div>
              ))}
            </div>
          )}
          {(sajuData.animal || sajuData.currentDaeun) && (
            <div className="flex items-center gap-3 px-4 py-2.5 flex-wrap" style={{background:'#111'}}>
              {sajuData.animal && <span className="text-xs font-bold text-yellow-400">{sajuData.animal}띠</span>}
              {sajuData.currentDaeun && (
                <span className="text-[10px] text-[#555]">
                  현재 대운: <span className="text-purple-400 font-bold">
                    {sajuData.currentDaeun.stem}{sajuData.currentDaeun.branch}
                  </span> ({sajuData.currentDaeun.startAge}~{sajuData.currentDaeun.endAge}세)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 섹션 목록 */}
      <div className="px-4 pt-4">
        <div className="text-xs font-bold text-[#555] mb-3">✦ 저장된 풀이</div>
        {sections.map((sec, idx) => {
          const isWarning = sec.id === 'warning'
          const isOpen = openIdx.includes(idx)
          return (
            <div key={sec.id} className="rounded-2xl mb-3 overflow-hidden" style={{
              background: isWarning ? '#1a0808' : '#111',
              border: `1px solid ${isWarning ? 'rgba(239,68,68,.2)' : '#1e1e1e'}`
            }}>
              <button className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
                onClick={() => toggleSection(idx)}>
                <SectionIcon id={sec.id} />
                <span className={`flex-1 text-sm font-bold ${isWarning?'text-red-300':'text-white'} leading-snug`}>
                  {sec.title}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="#555" strokeWidth="2" strokeLinecap="round"
                  style={{transform:isOpen?'rotate(180deg)':'',transition:'transform .2s',flexShrink:0}}>
                  <path d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              {isOpen && (
                <div className="px-4 pb-5 border-t" style={{borderColor:isWarning?'rgba(239,68,68,.12)':'#1e1e1e'}}>
                  <p className="text-sm leading-[1.95] pt-4 whitespace-pre-line"
                    style={{color:isWarning?'#fca5a5':'#bbb'}}>{sec.body}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 버튼 */}
      <div className="px-4 mt-4 space-y-3">
        <button className="w-full py-4 rounded-2xl font-black text-base"
          style={{background:'#fee500',color:'#3c1e1e'}}
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: '내 사주팔자 풀이', url: window.location.href })
            } else {
              navigator.clipboard.writeText(window.location.href)
              alert('링크가 복사됐어요!')
            }
          }}>
          💬 이 풀이 공유하기
        </button>
        <Link href="/saju"
          className="block w-full py-3 rounded-2xl font-bold text-sm text-center"
          style={{background:'#111',border:'1px solid #222',color:'#666'}}>
          ↺ 새로 풀이받기
        </Link>
      </div>

      <div className="mx-4 mt-6 px-3 py-3 rounded-xl" style={{background:'#0a0a0a',border:'0.5px solid #111'}}>
        <p className="text-[9px] leading-relaxed" style={{color:'#3a3a3a'}}>
          본 서비스는 사주명리학 이론을 AI가 분석한 참고용 엔터테인먼트 콘텐츠입니다. 실제 투자·재무·의료·법률 등 중요한 의사결정의 근거로 사용하지 마십시오. © 사주야
        </p>
      </div>
    </div>
  )
}
