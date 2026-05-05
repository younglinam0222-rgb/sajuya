'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CHARACTERS } from '@/lib/characters'
import { OCCUPATIONS } from '@/lib/occupations'

interface Section { id: string; emoji: string; title: string; body: string }
interface SajuTitle { id: string; title: string; teaser: string; is_free: boolean; content: string }

const CHARACTER_IMG: Record<string, string> = {
  baekhalma: '/characters/baekhalma.png',
  doRyeong: '/characters/doryeong.png',
  gumiho: '/characters/gumiho.png',
  sinRyeong: '/characters/sinryeong.png',
}
const CHARACTER_COLOR: Record<string, string> = {
  baekhalma: '#8B5CF6',
  doRyeong: '#3B82F6',
  gumiho: '#EC4899',
  sinRyeong: '#10B981',
}
const CHARACTER_NAMES: Record<string, string> = {
  baekhalma: '건물주 백할매',
  doRyeong: '근본도령',
  gumiho: '구미호 선생',
  sinRyeong: '무등산 신령님',
}

const SECTION_ICONS: Record<string, { svg: string; color: string; bg: string }> = {
  energy:      { svg:'M13 10V3L4 14h7v7l9-11h-7z', color:'#fbbf24', bg:'rgba(251,191,36,.15)' },
  money:       { svg:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color:'#fbbf24', bg:'rgba(251,191,36,.15)' },
  career:      { svg:'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color:'#a78bfa', bg:'rgba(167,139,250,.15)' },
  love:        { svg:'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', color:'#f472b6', bg:'rgba(244,114,182,.15)' },
  health:      { svg:'M4.5 12.75l6 6 9-13.5', color:'#4ade80', bg:'rgba(74,222,128,.15)' },
  warning:     { svg:'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z', color:'#f87171', bg:'rgba(248,113,113,.15)' },
  lucky:       { svg:'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z', color:'#fbbf24', bg:'rgba(251,191,36,.15)' },
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

export default function ResultPage() {
  const params = useParams()
  const shareId = params.shareId as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sections, setSections] = useState<Section[]>([])
  const [titles, setTitles] = useState<SajuTitle[]>([])
  const [strategy, setStrategy] = useState<any>(null)
  const [openIdx, setOpenIdx] = useState<number[]>([0])
  const [characterId, setCharacterId] = useState('baekhalma')
  const [formInfo, setFormInfo] = useState<any>(null)
  const [sajuData, setSajuData] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { fetchReading() }, [shareId])

  const fetchReading = async () => {
    try {
      const res = await fetch(`/api/result/${shareId}`)
      if (!res.ok) throw new Error('not found')
      const data = await res.json()
      setCharacterId(data.character_id ?? 'baekhalma')

      if (data.saju_data) {
        try {
          const parsed = JSON.parse(data.saju_data)
          setFormInfo(parsed.form)
          setSajuData(parsed.saju)
        } catch {}
      }

      if (data.ai_result) {
        try {
          let clean = data.ai_result.trim()
            .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
          const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
          if (s !== -1 && e !== -1) clean = clean.slice(s, e + 1)
          const parsed = JSON.parse(clean)
          // 새 포맷 (titles + strategy)
          if (parsed.titles) {
            setTitles(parsed.titles)
            setStrategy(parsed.strategy)
          }
          // 구 포맷 (sections)
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

  const charImg = CHARACTER_IMG[characterId] ?? '/characters/baekhalma.png'
  const charColor = CHARACTER_COLOR[characterId] ?? '#8B5CF6'
  const charName = CHARACTER_NAMES[characterId] ?? characterId

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKakaoShare = () => {
    const url = window.location.href
    const title = formInfo ? `${formInfo.name}님의 사주팔자 풀이` : '사주야 풀이 결과'
    const desc = `${charName}이 직접 본 사주 결과 — 지금 확인해보세요`

    // 카카오 SDK가 있으면 사용, 없으면 fallback
    if (typeof window !== 'undefined' && (window as any).Kakao?.Share) {
      ;(window as any).Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description: desc,
          imageUrl: `${window.location.origin}${charImg}`,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [{
          title: '풀이 보기',
          link: { mobileWebUrl: url, webUrl: url },
        }],
      })
    } else {
      // 카카오 SDK 없으면 링크 복사
      handleCopyLink()
    }
  }

  const elementColor = (el: string) => ({ '木':'#4ade80','火':'#f87171','土':'#fbbf24','金':'#d1d5db','水':'#60a5fa' }[el] || '#888')
  const elementBg = (el: string) => ({ '木':'rgba(34,197,94,.12)','火':'rgba(239,68,68,.12)','土':'rgba(234,179,8,.12)','金':'rgba(156,163,175,.12)','水':'rgba(96,165,250,.12)' }[el] || 'rgba(100,100,100,.1)')

  if (loading) return (
    <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center text-white">
      <div className="text-center"><div className="text-4xl mb-4 animate-spin">🔮</div><div className="text-sm text-[#666]">풀이를 불러오는 중...</div></div>
    </div>
  )

  if (error) return (
    <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center text-white max-w-[430px] mx-auto px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">😶</div>
        <div className="text-lg font-black mb-2">풀이를 찾을 수 없어요</div>
        <div className="text-sm text-[#666] mb-6">{error}</div>
        <Link href="/saju" className="px-6 py-3 rounded-2xl font-bold text-sm" style={{ background: '#7c3aed', color: '#fff' }}>새로 풀이받기</Link>
      </div>
    </div>
  )

  const manjuPillars = sajuData ? [
    { label: '시주', pillar: sajuData.hourPillar },
    { label: '일주', pillar: sajuData.dayPillar },
    { label: '월주', pillar: sajuData.monthPillar },
    { label: '연주', pillar: sajuData.yearPillar },
  ] : []

  const freeTitles = titles.filter(t => t.is_free)
  const paidTitles = titles.filter(t => !t.is_free)

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto pb-8">

      {/* 헤더 */}
      <div className="relative overflow-hidden px-6 py-8 text-center"
        style={{ background: 'linear-gradient(160deg,#050010,#0f0030,#050010)' }}>
        <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 border-2" style={{ borderColor: charColor }}>
          <img src={charImg} alt={charName} className="w-full h-full object-cover object-top"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-3"
          style={{ background: 'rgba(167,139,250,.1)', border: '1px solid rgba(167,139,250,.3)', color: '#c4b5fd' }}>
          {charName} 신탁
        </div>
        {formInfo && (
          <>
            <div className="text-2xl font-black text-white mb-1">{formInfo.name} 님의 사주팔자</div>
            <div className="text-xs text-[#555]">
              {formInfo.year}.{formInfo.month}.{formInfo.day} · {formInfo.gender === 'male' ? '남성' : '여성'} · {formInfo.calType === 'lunar' ? '음력' : '양력'}
            </div>
          </>
        )}
      </div>

      {/* 만세력 */}
      {sajuData && manjuPillars.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ border: '1px solid #222' }}>
          <div className="py-2.5 text-center text-xs font-black text-yellow-400 tracking-widest" style={{ background: '#111', borderBottom: '1px solid #222' }}>
            만세력 (四柱八字)
          </div>
          <div className="grid grid-cols-4 text-center" style={{ borderBottom: '1px solid #222' }}>
            {manjuPillars.map(({ label }) => (
              <div key={label} className="py-1.5 text-[10px] font-bold" style={{ background: '#0d0d0d', borderRight: '1px solid #222', color: '#666' }}>{label}</div>
            ))}
          </div>
          <div className="grid grid-cols-4 text-center" style={{ borderBottom: '1px solid #222' }}>
            {manjuPillars.map(({ label, pillar }) => (
              <div key={label} className="py-2.5" style={{ background: elementBg(pillar?.stemElement), borderRight: '1px solid #222' }}>
                <div className="text-3xl font-black" style={{ color: elementColor(pillar?.stemElement) }}>{pillar?.stem ?? '?'}</div>
                <div className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,.4)' }}>{pillar?.stemElement}</div>
                <div className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,.5)' }}>{pillar?.sipsinStem}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 text-center" style={{ borderBottom: '1px solid #222' }}>
            {manjuPillars.map(({ label, pillar }) => (
              <div key={label} className="py-2.5" style={{ background: elementBg(pillar?.branchElement), borderRight: '1px solid #222' }}>
                <div className="text-3xl font-black" style={{ color: elementColor(pillar?.branchElement) }}>{pillar?.branch ?? '?'}</div>
                <div className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,.4)' }}>{pillar?.branchElement}</div>
                <div className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,.5)' }}>{pillar?.sipsinBranch}</div>
              </div>
            ))}
          </div>
          {sajuData.elementCount && (
            <div className="grid grid-cols-5 text-center" style={{ background: '#0d0d0d' }}>
              {(['木','火','土','金','水'] as const).map(el => (
                <div key={el} className="py-2" style={{ borderRight: '1px solid #222' }}>
                  <div className="text-xs font-black" style={{ color: elementColor(el) }}>{el}</div>
                  <div className="text-[10px] text-[#555] mt-0.5">{sajuData.elementCount[el] ?? 0}개</div>
                </div>
              ))}
            </div>
          )}
          {sajuData.animal && (
            <div className="px-4 py-2 bg-[#111]">
              <span className="text-xs font-bold text-yellow-400">{sajuData.animal}띠</span>
              {sajuData.hourStr && <span className="text-xs text-[#555] ml-2">{sajuData.hourStr}</span>}
            </div>
          )}
        </div>
      )}

      {/* 새 포맷: titles */}
      {titles.length > 0 && (
        <div className="px-4 pt-4">
          <div className="text-xs font-bold text-[#555] mb-3">✦ 무료 판결 3가지</div>
          <div className="space-y-3 mb-4">
            {freeTitles.map((t, i) => (
              <div key={t.id} className="rounded-2xl overflow-hidden border" style={{ borderColor: `${charColor}40`, background: '#111' }}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
                      style={{ background: `${charColor}25`, color: charColor }}>무료 {i+1}</span>
                    <p className="font-bold text-base leading-snug text-white">{t.title}</p>
                  </div>
                  {t.content && <p className="text-gray-300 text-sm leading-relaxed mt-3 whitespace-pre-line">{t.content}</p>}
                </div>
              </div>
            ))}
          </div>

          {paidTitles.length > 0 && (
            <>
              <div className="text-xs font-bold text-[#555] mb-2 mt-4">🔒 잠긴 판결 {paidTitles.length}개</div>
              <div className="space-y-2 mb-4">
                {paidTitles.map(t => (
                  <div key={t.id} className="rounded-2xl border border-gray-800 bg-[#111] overflow-hidden">
                    <button className="w-full p-4 text-left" onClick={() => setOpenIdx(prev => prev.includes(parseInt(t.id)) ? prev.filter(i => i !== parseInt(t.id)) : [...prev, parseInt(t.id)])}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-800 flex-shrink-0 text-sm">🔒</div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-white">{t.title}</p>
                          <p className="text-gray-500 text-xs mt-1">{t.teaser}</p>
                        </div>
                      </div>
                    </button>
                    {openIdx.includes(parseInt(t.id)) && (
                      <div className="px-4 pb-4 border-t border-gray-800">
                        <div className="mt-3 p-3 rounded-xl bg-gray-900">
                          <p className="text-xs text-gray-400 mb-1 leading-relaxed">{t.teaser}</p>
                          <button className="w-full mt-2 py-2.5 rounded-xl text-sm font-black text-white"
                            style={{ background: `linear-gradient(135deg, ${charColor}, ${charColor}bb)` }}>
                            🔓 이 판결만 열기 · 990원
                          </button>
                          <p className="text-center text-xs text-gray-600 mt-2">또는</p>
                          <Link href="/saju" className="block w-full mt-1 py-2 rounded-xl text-xs font-bold text-center"
                            style={{ background: '#1a1025', border: `1px solid ${charColor}40`, color: charColor }}>
                            전체 9개 한번에 열기 · 990원
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 전략 섹션 */}
          {strategy && (
            <div className="space-y-3 mb-4">
              {strategy.overview && (
                <div className="rounded-2xl p-4 bg-[#111] border border-gray-800">
                  <div className="flex items-center gap-2 mb-2"><span>🌌</span><span className="font-bold text-sm">인생의 큰 그림</span></div>
                  <p className="text-gray-300 text-sm leading-relaxed">{strategy.overview}</p>
                </div>
              )}
              {strategy.lifecycle?.length > 0 && (
                <div className="rounded-2xl p-4 bg-[#111] border border-gray-800">
                  <div className="flex items-center gap-2 mb-4"><span>📊</span><span className="font-bold text-sm text-white">나이대별 운의 흐름</span></div>
                  <div className="flex items-end gap-2 h-28 mb-3">
                    {strategy.lifecycle.map((d: any) => {
                      const colors: Record<string,string> = { '봄':'#10B981','여름':'#F59E0B','가을':'#F97316','겨울':'#3B82F6' }
                      return (
                        <div key={d.age} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] text-gray-400">{d.score}</span>
                          <div className="w-full rounded-t-lg" style={{ height: `${Math.max((d.score/100)*100,8)}%`, background: colors[d.season]??'#8B5CF6', minHeight: 8 }} />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-2 mb-3">
                    {strategy.lifecycle.map((d: any) => {
                      const icons: Record<string,string> = { '봄':'🌱','여름':'☀️','가을':'🍂','겨울':'❄️' }
                      return (
                        <div key={d.age} className="flex-1 text-center">
                          <p className="text-[10px] text-gray-400">{d.age}</p>
                          <p className="text-xs">{icons[d.season]??'✨'}</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="space-y-1.5">
                    {strategy.lifecycle.map((d: any) => {
                      const colors: Record<string,string> = { '봄':'#10B981','여름':'#F59E0B','가을':'#F97316','겨울':'#3B82F6' }
                      const icons: Record<string,string> = { '봄':'🌱','여름':'☀️','가을':'🍂','겨울':'❄️' }
                      return (
                        <div key={d.age} className="flex items-start gap-2">
                          <span className="text-[10px] font-bold text-gray-500 w-8 flex-shrink-0">{d.age}</span>
                          <span className="text-[10px]" style={{ color: colors[d.season]??'#fff' }}>{icons[d.season]} {d.season}</span>
                          <span className="text-[10px] text-gray-400">{d.desc}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {strategy.golden_period && (
                <div className="rounded-2xl p-4 bg-[#111] border border-yellow-900/30">
                  <div className="flex items-center gap-2 mb-2"><span>🏆</span><span className="font-bold text-sm text-yellow-400">전성기는 언제?</span></div>
                  <p className="text-gray-300 text-sm leading-relaxed">{strategy.golden_period}</p>
                </div>
              )}
              {strategy.peak_guide && (
                <div className="rounded-2xl p-4 bg-[#111] border border-gray-800">
                  <div className="flex items-center gap-2 mb-2"><span>🚀</span><span className="font-bold text-sm text-green-400">전성기 1000% 활용법</span></div>
                  <p className="text-gray-300 text-sm leading-relaxed">{strategy.peak_guide}</p>
                </div>
              )}
              {strategy.warning && (
                <div className="rounded-2xl p-4 bg-[#1a0808] border border-red-900/30">
                  <div className="flex items-center gap-2 mb-2"><span>⚠️</span><span className="font-bold text-sm text-red-400">조심할 시기</span></div>
                  <p className="text-[#fca5a5] text-sm leading-relaxed">{strategy.warning}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 구 포맷: sections */}
      {sections.length > 0 && (
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
                <button className="w-full px-4 py-3.5 flex items-center gap-3 text-left" onClick={() => setOpenIdx(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])}>
                  <SectionIcon id={sec.id} />
                  <span className={`flex-1 text-sm font-bold ${isWarning ? 'text-red-300' : 'text-white'} leading-snug`}>{sec.title}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"
                    style={{ transform: isOpen ? 'rotate(180deg)' : '', transition: 'transform .2s', flexShrink: 0 }}>
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-4 pb-5 border-t" style={{ borderColor: isWarning ? 'rgba(239,68,68,.12)' : '#1e1e1e' }}>
                    <p className="text-sm leading-[1.95] pt-4 whitespace-pre-line" style={{ color: isWarning ? '#fca5a5' : '#bbb' }}>{sec.body}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 공유 버튼 */}
      <div className="px-4 mt-4 space-y-3">
        {/* 카카오 공유 */}
        <button
          className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2"
          style={{ background: '#fee500', color: '#3c1e1e' }}
          onClick={handleKakaoShare}>
          💬 카카오로 공유하기
        </button>

        {/* 링크 복사 */}
        <button
          className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
          style={{ background: copied ? '#10B981' : '#1a1a2e', border: '1px solid #333', color: copied ? 'white' : '#aaa' }}
          onClick={handleCopyLink}>
          {copied ? '✅ 링크 복사됐어요!' : '🔗 링크 복사하기'}
        </button>

        <Link href="/saju"
          className="block w-full py-3 rounded-2xl font-bold text-sm text-center"
          style={{ background: '#111', border: '1px solid #222', color: '#666' }}>
          ↺ 새로 풀이받기
        </Link>
      </div>

      <div className="mx-4 mt-6 px-3 py-3 rounded-xl" style={{ background: '#0a0a0a', border: '0.5px solid #111' }}>
        <p className="text-[9px] leading-relaxed" style={{ color: '#3a3a3a' }}>
          본 서비스는 사주명리학 이론을 기반으로 분석한 참고용 엔터테인먼트 콘텐츠입니다. 실제 투자·재무·의료·법률 등 중요한 의사결정의 근거로 사용하지 마십시오. © 사주야
        </p>
      </div>
    </div>
  )
}
