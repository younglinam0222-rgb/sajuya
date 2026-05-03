'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const SLIDES = [
  { bg: 'from-indigo-950 via-purple-900 to-slate-900', badge: '✦ 속리산 백할매 신탁', title: '오늘, 당신의\n운명이 열린다', sub: '3,000년 비법 · AI로 다시 태어나다', deco: '🔮' },
  { bg: 'from-emerald-950 via-green-900 to-teal-900', badge: '✦ 무등산 신령님 보시기', title: '사주로 보는\n진짜 내 재물운', sub: '단 990원, 팩폭 풀이', deco: '🌿' },
  { bg: 'from-rose-950 via-pink-900 to-fuchsia-900', badge: '✦ 구미호 선생 특급', title: '궁합 99점\n짝꿍 찾기', sub: '우리 사이, 진짜 되는 사이인지', deco: '🦊' },
  { bg: 'from-blue-950 via-cyan-900 to-sky-900', badge: '✦ 오늘의 일일운세 무료', title: '오늘 하루\n기운 어때요?', sub: '매일 아침 확인하는 근본운세', deco: '⭐' },
]

const MENU_CARDS = [
  { id: 'saju', title: '사주 풀이', desc: '백할매가 팩폭으로 알려줌', price: '990원', priceType: 'paid', emoji: '🏔️', bg: 'from-indigo-900 to-purple-900', href: '/saju' },
  { id: 'gunghap', title: '궁합 해설', desc: '우리 사이 되는지 봐줌', price: '990원', priceType: 'paid', emoji: '💕', bg: 'from-rose-900 to-pink-900', href: '/gunghap' },
  { id: 'daeun', title: '대운 해설', desc: '10년 주기 운 흐름', price: '일부무료', priceType: 'partial', emoji: '🌊', bg: 'from-emerald-900 to-teal-900', href: '/daeun' },
  { id: 'taekil', title: '택 - 일', desc: '좋은 날짜 골라줌', price: '일부무료', priceType: 'partial', emoji: '📅', bg: 'from-orange-900 to-red-900', href: '/taekil' },
  { id: 'yearly', title: '연도별 운세', desc: '특정 연도 운세 분석', price: '일부무료', priceType: 'partial', emoji: '📆', bg: 'from-blue-900 to-indigo-900', href: '/yearly' },
  { id: 'daily', title: '일일 운세', desc: '오늘 하루 기운', price: '무료', priceType: 'free', emoji: '⭐', bg: 'from-purple-900 to-violet-900', href: '/daily' },
]

const CHARACTERS = [
 { id: 'baekhalma', name: '건물주 백할매', emoji: '👵', bg: '#1a1000' },
{ id: 'doryeong', name: '근본도령', emoji: '🧙', bg: '#0a0020' },
{ id: 'gumiho', name: '구미호 선생', emoji: '🦊', bg: '#1a0010' },
{ id: 'sinryeong', name: '무등신령', emoji: '⛰️', bg: '#001a08' },
]

export default function HomePage() {
  const [slideIdx, setSlideIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setSlideIdx(i => (i + 1) % SLIDES.length), 2000)
    return () => clearInterval(timer)
  }, [])

  const slide = SLIDES[slideIdx]

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto pb-24">

      {/* TOP NAV */}
      <nav className="bg-[#111] px-4 py-3 flex items-center justify-between sticky top-0 z-50 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{background:'linear-gradient(135deg,#7c3aed,#a78bfa)'}}>🔮</div>
          <span className="text-[15px] font-black" style={{color:'#a78bfa'}}>사주야</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">🪙</span><span className="text-xs font-bold text-yellow-400">0냥</span>
          <span className="text-sm">🎁</span>
          <Link href="/login" className="text-xs font-bold px-3 py-1.5 rounded-full" style={{color:'#a78bfa',background:'rgba(124,58,237,0.15)'}}>로그인</Link>
        </div>
      </nav>

      {/* HERO SLIDER */}
      <div className={`bg-gradient-to-br ${slide.bg} h-40 relative overflow-hidden flex items-center px-6 cursor-pointer select-none`}
        onClick={() => setSlideIdx((slideIdx + 1) % SLIDES.length)}>
        <div className="z-10">
          <div className="text-xs font-bold px-3 py-1 rounded-full inline-block mb-3" style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.85)'}}>
            {slide.badge}
          </div>
          <div className="text-[21px] font-black text-white leading-tight whitespace-pre-line">{slide.title}</div>
          <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.6)'}}>{slide.sub}</div>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[60px] opacity-15 pointer-events-none">{slide.deco}</div>
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
          {SLIDES.map((_, i) => <div key={i} className="h-1.5 rounded-full transition-all" style={{width: i===slideIdx?'16px':'6px', background: i===slideIdx?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.3)'}} />)}
        </div>
      </div>

      {/* TODAY BANNER */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{background:'linear-gradient(to right,#1a1200,#2a1e00)',border:'1px solid rgba(217,119,6,0.3)'}}>
          <span className="text-3xl">🌅</span>
          <div className="flex-1">
            <div className="text-sm font-bold text-amber-200">오늘의 무료 운세</div>
            <div className="text-xs mt-0.5" style={{color:'rgba(251,191,36,0.6)'}}>프로필 등록하면 매일 무료 확인</div>
          </div>
          <Link href="/daily" className="text-xs font-bold px-3 py-2 rounded-xl text-white" style={{background:'#b45309'}}>무료보기 ›</Link>
        </div>
      </div>

      {/* MENU GRID */}
      <div className="px-4 mt-4">
        <div className="text-sm font-black text-white mb-3">🔮 신탁 메뉴</div>
        <div className="grid grid-cols-2 gap-3">
          {MENU_CARDS.map(card => (
            <Link href={card.href} key={card.id}>
              <div className="rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-transform" style={{background:'#111',border:'1px solid #1a1a1a'}}>
                <div className={`h-28 bg-gradient-to-br ${card.bg} flex items-center justify-center relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-[0.06]" style={{backgroundImage:'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)',backgroundSize:'20px 20px'}} />
                  <span className="text-5xl relative z-10">{card.emoji}</span>
                </div>
                <div className="p-3">
                  <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mb-1.5 ${
                    card.priceType==='free' ? 'bg-green-900/50 text-green-400' :
                    card.priceType==='partial' ? 'bg-yellow-900/50 text-yellow-400' :
                    'bg-purple-900/50 text-purple-400'
                  }`}>{card.price}</div>
                  <div className="text-[14px] font-bold text-white">{card.title}</div>
                  <div className="text-[11px] mt-1 leading-relaxed" style={{color:'#666'}}>{card.desc}</div>
                  <div className="flex justify-end mt-2">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg" style={{color:'#a78bfa',background:'rgba(124,58,237,0.12)'}}>보러가기 ›</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* AD SLOT */}
      <div className="mx-4 mt-4 h-20 rounded-xl flex items-center justify-center gap-2" style={{background:'#111',border:'1.5px dashed #2a2a2a'}}>
        <span>📢</span><span className="text-xs" style={{color:'#444'}}>광고 영역 · Google AdSense</span>
      </div>

      {/* CHARACTERS */}
      <div className="px-4 mt-5">
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm font-black text-white">🧙 신탁 마스터</div>
          <span className="text-xs" style={{color:'#555'}}>전체보기 ›</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1" style={{scrollbarWidth:'none'}}>
          {CHARACTERS.map(c => (
            <Link href={`/saju?character=${c.id}`} key={c.id} className="flex-shrink-0 w-20 text-center">
              <div className="w-14 h-14 rounded-full mx-auto mb-1.5 overflow-hidden relative" style={{background:c.bg,border:'2px solid #2a2a2a'}}>   <img src={`/characters/${c.id}.png`} alt={c.name} className="w-full h-full object-cover" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} /> </div>
              <div className="text-[11px] font-bold text-white truncate">{c.name.slice(0,5)}</div>
              <div className="text-[9px] mt-0.5" style={{color:'#555'}}>🪙 1엽전</div>
            </Link>
          ))}
        </div>
      </div>

      {/* AD SLOT 2 */}
      <div className="mx-4 mt-4 h-20 rounded-xl flex items-center justify-center gap-2" style={{background:'#111',border:'1.5px dashed #2a2a2a'}}>
        <span>📢</span><span className="text-xs" style={{color:'#444'}}>광고 영역 · Google AdSense</span>
      </div>

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex z-50" style={{background:'#111',borderTop:'1px solid #1a1a1a'}}>
        {[{icon:'🏠',label:'홈',href:'/',on:true},{icon:'👤',label:'사주추가',href:'/saju',on:false}].map(item=>(
          <Link key={item.label} href={item.href} className="flex-1 flex flex-col items-center py-2.5 gap-0.5">
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-bold" style={{color:item.on?'#a78bfa':'#555'}}>{item.label}</span>
          </Link>
        ))}
        <Link href="/daily" className="flex-1 flex flex-col items-center py-1 gap-0.5">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl -mt-4" style={{background:'linear-gradient(135deg,#7c3aed,#a78bfa)',boxShadow:'0 -2px 16px rgba(124,58,237,0.4)'}}>🔮</div>
          <span className="text-[10px] font-bold" style={{color:'#a78bfa'}}>무료운세</span>
        </Link>
        {[{icon:'💬',label:'대화방',href:'/chat'},{icon:'📦',label:'보관함',href:'/storage'}].map(item=>(
          <Link key={item.label} href={item.href} className="flex-1 flex flex-col items-center py-2.5 gap-0.5">
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-bold" style={{color:'#555'}}>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
