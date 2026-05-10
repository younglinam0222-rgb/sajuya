'use client'

import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import YeopjeunShop from '@/app/components/YeopjeunShop'

// ─── 타입 ────────────────────────────────────────────
const CHAR_IMG: Record<string, string> = {
  baekhalma: '/characters/baekhalma.png',
  doRyeong:  '/characters/doryeong.png',
  gumiho:    '/characters/gumiho.png',
  sinRyeong: '/characters/sinryeong.png',
}

const CHARACTERS = [
  { id: 'baekhalma', name: '건물주 백할매', tag: '재물·직업', color: '#8B5CF6', bg: 'linear-gradient(135deg, #1a1025, #2d1b69)' },
  { id: 'doRyeong',  name: '근본도령',      tag: '종합 사주', color: '#3B82F6', bg: 'linear-gradient(135deg, #0f1525, #1e3a8a)' },
  { id: 'gumiho',    name: '구미호 선생',   tag: '연애·궁합', color: '#EC4899', bg: 'linear-gradient(135deg, #1a0f18, #831843)' },
  { id: 'sinRyeong', name: '무등산 신령님', tag: '대운·인생', color: '#10B981', bg: 'linear-gradient(135deg, #0a1a14, #065f46)' },
]

// ─── 캐러셀 배너 데이터 ───────────────────────────────
const BANNERS = [
  {
    id: 0,
    tag: '✦ 건물주 백할매 특급',
    title: '돈 버는 사주\n따로 있다',
    desc: '재물운, 직업운, 지금 확인해봐',
    href: '/saju',
    cta: '사주 풀이 보기 →',
    charId: 'baekhalma',
    bg: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b69 60%, #1a0a2e 100%)',
    accent: '#8B5CF6',
    emoji: '💜',
  },
  {
    id: 1,
    tag: '✦ 구미호 선생 특급',
    title: '궁합 99점\n짝꿍 찾기',
    desc: '우리 사이, 진짜 되는 사인지',
    href: '/gunghap',
    cta: '궁합 보러가기 →',
    charId: 'gumiho',
    bg: 'linear-gradient(135deg, #1a0f18 0%, #831843 60%, #1a0f18 100%)',
    accent: '#EC4899',
    emoji: '💕',
  },
  {
    id: 2,
    tag: '✦ 무등산 신령님 특급',
    title: '지금 내 대운\n어디쯤 왔나',
    desc: '10년 주기 큰 흐름 해설',
    href: '/daeun',
    cta: '대운 확인하기 →',
    charId: 'sinRyeong',
    bg: 'linear-gradient(135deg, #0a1a14 0%, #065f46 60%, #0a1a14 100%)',
    accent: '#10B981',
    emoji: '🌊',
  },
  {
    id: 3,
    tag: '✦ 매일 무료',
    title: '오늘 하루\n기운 어때',
    desc: '일일운세 매일 무료로 확인',
    href: '/daily',
    cta: '무료 운세 보기 →',
    charId: 'doRyeong',
    bg: 'linear-gradient(135deg, #0f1525 0%, #1e3a8a 60%, #0f1525 100%)',
    accent: '#3B82F6',
    emoji: '⭐',
  },
]

interface MenuItem {
  href: string; label: string; desc: string; emoji: string
  icon?: string
  badge: string; badgeColor: string; paid: boolean
}

const MENUS: MenuItem[] = [
  { href: '/saju',    label: '사주 풀이',   desc: '생년월일시로 보는 종합 사주',  emoji: '🔮', icon: '/icons/saju.png', badge: '990원',   badgeColor: '#F59E0B', paid: true },
  { href: '/gunghap', label: '궁합 해설',   desc: '두 사람의 사주 궁합 분석',     emoji: '💞', badge: '990원',   badgeColor: '#F59E0B', paid: true },
  { href: '/daeun',   label: '대운 해설',   desc: '10년 주기 큰 흐름',           emoji: '🌊', badge: '일부무료', badgeColor: '#10B981', paid: false },
  { href: '/taekil',  label: '택 · 일',    desc: '좋은 날짜 골라줌',            emoji: '📅', badge: '일부무료', badgeColor: '#10B981', paid: false },
  { href: '/yearly',  label: '연도별 운세', desc: '특정 연도 운세 분석',          emoji: '📆', badge: '일부무료', badgeColor: '#10B981', paid: false },
  { href: '/daily',   label: '일일 운세',   desc: '오늘 하루 기운',              emoji: '⭐', badge: '무료',    badgeColor: '#3B82F6', paid: false },
]

// ─── 캐러셀 컴포넌트 ─────────────────────────────────
function HeroBannerCarousel() {
  const [current, setCurrent] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % BANNERS.length)
    }, 3500)
  }

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const goTo = (idx: number) => {
    if (isAnimating || idx === current) return
    setIsAnimating(true)
    setCurrent(idx)
    startTimer()
    setTimeout(() => setIsAnimating(false), 400)
  }

  const b = BANNERS[current]

  return (
    <div className="px-4 pt-3 pb-2">
      <div className="relative rounded-3xl overflow-hidden" style={{ background: b.bg, minHeight: 180, transition: 'background 0.5s ease' }}>
        {/* 배경 빛 효과 */}
        <div className="absolute inset-0 opacity-30" style={{
          background: `radial-gradient(circle at 80% 50%, ${b.accent}60 0%, transparent 60%)`,
          transition: 'all 0.5s ease',
        }} />

        {/* 캐릭터 이미지 */}
        <div className="absolute right-0 top-0 bottom-0 w-36 overflow-hidden">
          <img
            key={b.charId}
            src={CHAR_IMG[b.charId]}
            alt=""
            className="absolute right-0 top-0 h-full w-full object-cover object-top"
            style={{
              maskImage: 'linear-gradient(to left, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)',
              opacity: 0.85,
            }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        {/* 텍스트 */}
        <div className="relative z-10 p-5 pr-32">
          <div className="text-xs font-bold mb-2 px-2 py-0.5 rounded-full inline-block"
            style={{ background: `${b.accent}25`, color: b.accent, border: `1px solid ${b.accent}40` }}>
            {b.tag}
          </div>
          <h2 className="text-xl font-black text-white leading-tight mb-1 whitespace-pre-line">{b.title}</h2>
          <p className="text-gray-400 text-xs mb-4">{b.desc}</p>
          <Link href={b.href}
            className="inline-block text-xs font-bold px-4 py-2 rounded-xl text-white"
            style={{ background: `linear-gradient(135deg, ${b.accent}, ${b.accent}99)` }}>
            {b.cta}
          </Link>
        </div>

        {/* 인디케이터 */}
        <div className="absolute bottom-3 left-5 flex gap-1.5 z-10">
          {BANNERS.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                background: i === current ? b.accent : 'rgba(255,255,255,0.3)',
              }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 메인 ────────────────────────────────────────────
export default function HomePage() {
  const { data: session } = useSession()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const balance = (session?.user as { yeobjeun_balance?: number })?.yeobjeun_balance ?? 0

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <div className="max-w-md mx-auto">

        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔮</span>
            <span className="font-black text-lg">사주야</span>
          </div>
          <div className="flex items-center gap-2">
            {session ? (
              <>
                <button onClick={() => setShowShop(true)}
                  className="text-xs px-3 py-1.5 rounded-full bg-gray-800 text-yellow-400 font-medium flex items-center gap-1">
                  🪙 {balance}냥
                  <span className="text-gray-600 text-[10px]">+충전</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/daily" className="text-xs px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">⭐ 무료운세</Link>
                <button onClick={() => setShowLoginModal(true)}
                  className="text-xs px-3 py-1.5 rounded-full bg-purple-600 text-white font-medium">
                  로그인
                </button>
              </>
            )}
          </div>
        </div>

        {/* 캐러셀 히어로 배너 */}
        <HeroBannerCarousel />

        {/* 오늘의 무료 운세 배너 */}
        <div className="px-4 mb-5">
          <Link href="/daily">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #1a1208, #2a1f08)', border: '1px solid #F59E0B30' }}>
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-yellow-900/30 flex items-center justify-center">
                <span className="text-2xl">🌅</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">오늘의 무료 운세</p>
                <p className="text-xs text-gray-500">프로필 등록하면 매일 무료 확인</p>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl text-black flex-shrink-0"
                style={{ background: '#F59E0B' }}>
                무료보기 ›
              </span>
            </div>
          </Link>
        </div>

        {/* 캐릭터 */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">👁 운명을 보는 자들</h2>
            <Link href="/characters" className="text-xs text-gray-500">전체보기 →</Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CHARACTERS.map(c => (
              <Link key={c.id} href={`/characters/${c.id}`}>
                <div className="rounded-2xl overflow-hidden cursor-pointer transition-transform active:scale-95 relative"
                  style={{ background: c.bg, border: `1px solid ${c.color}30` }}>
                  <div className="h-48 overflow-hidden relative">
                    <img src={CHAR_IMG[c.id]} alt={c.name}
                      className="w-full h-full object-cover object-top"
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.9) 100%)' }} />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-sm font-black text-white">{c.name}</p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: c.color }}>{c.tag}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 신탁 메뉴 */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">🧿 신탁 메뉴</h2>
            <button onClick={() => session ? setShowShop(true) : setShowLoginModal(true)}
              className="text-xs px-3 py-1.5 rounded-full font-bold text-black"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #EC4899)' }}>
              🪙 엽전 충전
            </button>
          </div>

          <p className="text-xs text-gray-600 mb-2 font-medium">⭐ 프리미엄</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {MENUS.filter(m => m.paid).map(m => (
              <Link key={m.href} href={m.href}>
                <div className="rounded-2xl overflow-hidden bg-[#111118] border border-yellow-900/30 active:scale-95 transition-transform cursor-pointer">
                  <div className="h-20 relative bg-[#1a1025] flex items-center justify-center">
                    {m.icon
                      ? <img src={m.icon} alt={m.label} className="w-14 h-14 object-contain" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                      : <span className="text-5xl">{m.emoji}</span>
                    }
                    <div className="absolute top-2 right-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold text-black" style={{ background: m.badgeColor }}>{m.badge}</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-sm mb-0.5">{m.label}</p>
                    <p className="text-gray-500 text-xs">{m.desc}</p>
                    <p className="text-xs text-yellow-400 mt-1.5 font-medium">보러가기 →</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <p className="text-xs text-gray-600 mb-2 font-medium">🆓 무료 / 일부무료</p>
          <div className="grid grid-cols-2 gap-2">
            {MENUS.filter(m => !m.paid).map(m => (
              <Link key={m.href} href={m.href}>
                <div className="rounded-2xl overflow-hidden bg-[#111118] border border-gray-800 active:scale-95 transition-transform cursor-pointer">
                  <div className="h-20 relative bg-[#0f0f18] flex items-center justify-center">
                    <span className="text-5xl opacity-70">{m.emoji}</span>
                    <div className="absolute top-2 right-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: m.badgeColor + '30', color: m.badgeColor }}>{m.badge}</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-sm mb-0.5">{m.label}</p>
                    <p className="text-gray-500 text-xs">{m.desc}</p>
                    <p className="text-xs text-gray-400 mt-1.5">보러가기 →</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 서비스 안내 */}
        <div className="px-4 mb-6">
          <div className="rounded-2xl p-4 bg-[#111118] border border-gray-800">
            <p className="text-sm font-bold mb-3">🔮 사주야에서 할 수 있는 것들</p>
            <div className="space-y-2.5">
              {[
                { icon: '🪙', title: '990원 사주 풀이', desc: '타고난 성격, 재물운, 직업운까지 직설로 분석' },
                { icon: '💞', title: '궁합', desc: '꼭 커플만 궁합 보란 법 있나요? 자유롭게 조합해보세요' },
                { icon: '🌊', title: '대운 풀이', desc: '10년 단위 인생의 큰 흐름 해설' },
                { icon: '📆', title: '연도별 운세', desc: '올해 총운, 월별 운세를 한눈에' },
                { icon: '⭐', title: '오늘의 운세 — 무료', desc: '매일 무료로 확인하는 일일운세' },
                { icon: '📅', title: '택일', desc: '이사, 결혼, 개업 등 좋은 날짜 추천' },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-2.5">
                  <span className="text-base flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-white">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-xs text-gray-600">※ 사주야는 오락 및 참고 목적의 서비스입니다</p>
            </div>
          </div>
        </div>

        {/* 가입 유도 */}
        {!session && (
          <div className="px-4 mb-6">
            <div className="rounded-2xl p-4 border border-purple-900/40" style={{ background: 'linear-gradient(135deg, #1a0a2e, #0f0a1a)' }}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🪙</span>
                <div className="flex-1">
                  <p className="font-bold text-sm">지금 가입하면 1냥 즉시 지급</p>
                  <p className="text-gray-400 text-xs">+ 오늘의 일일운세 무료 확인</p>
                </div>
                <button onClick={() => setShowLoginModal(true)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                  가입하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 엽전 안내 */}
        <div className="px-4 mb-6">
          <div className="rounded-2xl p-4 bg-[#111118] border border-gray-800 flex items-center justify-between">
            <div className="text-center">
              <p className="text-2xl font-black text-yellow-400">🪙 1냥</p>
              <p className="text-xs text-gray-500">= 990원</p>
            </div>
            <p className="text-gray-600 text-lg">=</p>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-300">☕ 커피 한 잔값</p>
              <p className="text-xs text-gray-500">으로 사주 풀이</p>
            </div>
            <button onClick={() => session ? setShowShop(true) : setShowLoginModal(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold text-black"
              style={{ background: '#F59E0B' }}>
              충전하기
            </button>
          </div>
        </div>

        {/* 법적 푸터 */}
        <div className="px-4 mb-6">
          <div className="border-t border-gray-900 pt-4">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mb-3">
              <Link href="/terms" className="text-xs text-gray-600 hover:text-gray-400">이용약관</Link>
              <Link href="/privacy" className="text-xs text-gray-600 hover:text-gray-400">개인정보처리방침</Link>
              <Link href="/refund" className="text-xs text-gray-600 hover:text-gray-400">환불정책</Link>
              <a href="mailto:sajuya.help@gmail.com" className="text-xs text-gray-600 hover:text-gray-400">고객센터</a>
            </div>
            <p className="text-center text-[10px] text-gray-700 leading-relaxed">
              본 서비스는 사주명리학 기반 엔터테인먼트 콘텐츠입니다.<br />
              의료·법률·재정 판단을 대체하지 않으며, 만 14세 이상 이용 가능합니다.
            </p>
            <p className="text-center text-[10px] text-gray-800 mt-1">© 2025 사주야 · sajuya.help@gmail.com</p>
          </div>
        </div>

      </div>

      {/* 하단 네비 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f] border-t border-gray-800 z-50">
        <div className="max-w-md mx-auto flex items-center justify-around py-1 px-2">
          <Link href="/" className="flex flex-col items-center gap-0.5 py-2 px-3">
            <span className="text-xl">🏠</span>
            <span className="text-xs text-gray-500">홈</span>
          </Link>
          <Link href="/saju" className="flex flex-col items-center gap-0.5 py-2 px-3">
            <span className="text-xl">🔮</span>
            <span className="text-xs text-gray-500">사주</span>
          </Link>
          <Link href="/daily" className="flex flex-col items-center -mt-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-[#0a0a0f]"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
              <span className="text-2xl">⭐</span>
            </div>
            <span className="text-xs text-purple-400 mt-0.5 font-medium">무료운세</span>
          </Link>
          <Link href="/storage" className="flex flex-col items-center gap-0.5 py-2 px-3">
            <span className="text-xl">📦</span>
            <span className="text-xs text-gray-500">보관함</span>
          </Link>
          <Link href="/characters" className="flex flex-col items-center gap-0.5 py-2 px-3">
            <span className="text-xl">👁</span>
            <span className="text-xs text-gray-500">신령</span>
          </Link>
        </div>
      </nav>

      {/* 엽전 상점 모달 */}
      {showShop && (
        <YeopjeunShop onClose={() => setShowShop(false)} currentBalance={balance} />
      )}

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center" onClick={() => setShowLoginModal(false)}>
          <div className="w-full max-w-md bg-[#111118] rounded-t-3xl p-6 border-t border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-5" />
            <div className="text-center mb-5">
              <p className="text-lg font-black mb-1">🪙 가입하면 1냥 즉시 지급</p>
              <p className="text-gray-400 text-sm">오늘의 일일운세도 무료로 바로 확인</p>
            </div>
            <div className="space-y-2">
              <button onClick={() => agreed && signIn('kakao')}
                className="w-full py-3.5 rounded-2xl font-bold text-black text-sm flex items-center justify-center gap-2 transition-opacity"
                style={{ background: '#FEE500', opacity: agreed ? 1 : 0.4 }}>
                💬 카카오로 계속하기
              </button>
              <button onClick={() => agreed && signIn('google')}
                className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-white text-gray-900 transition-opacity"
                style={{ opacity: agreed ? 1 : 0.4 }}>
                🔵 구글로 계속하기
              </button>
              <button onClick={() => agreed && signIn('naver')}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-opacity"
                style={{ background: '#03C75A', opacity: agreed ? 1 : 0.4 }}>
                N 네이버로 계속하기
              </button>
            </div>
            <div className="mt-4 flex items-start gap-2">
              <input type="checkbox" id="agree" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 accent-purple-500 w-4 h-4 flex-shrink-0 cursor-pointer" />
              <label htmlFor="agree" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                <Link href="/terms" className="underline text-gray-400" onClick={() => setShowLoginModal(false)}>이용약관</Link>
                {' '}및{' '}
                <Link href="/privacy" className="underline text-gray-400" onClick={() => setShowLoginModal(false)}>개인정보처리방침</Link>
                에 동의합니다 (필수)
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
