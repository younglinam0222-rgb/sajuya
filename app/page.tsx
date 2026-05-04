'use client'

import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

function AnimatedCount({ target }: { target: number }) {
  const [count, setCount] = useState(Math.floor(target * 0.85))
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => { if (c >= target) { clearInterval(timer); return target } return c + Math.ceil((target - c) / 20) })
    }, 50)
    return () => clearInterval(timer)
  }, [])
  return <span>{count.toLocaleString()}</span>
}

const CHAR_IMG: Record<string, string> = {
  baekhalma: '/characters/baekhalma.png',
  doRyeong: '/characters/doryeong.png',
  gumiho: '/characters/gumiho.png',
  sinRyeong: '/characters/sinryeong.png',
}

const CHARACTERS = [
  { id: 'baekhalma', name: '건물주 백할매', hook: '"너 올해 돈 못 모아.\n이유 내가 딱 말해준다."', tag: '재물·직업', color: '#8B5CF6', bg: 'linear-gradient(135deg, #1a1025, #2d1b69)' },
  { id: 'doRyeong', name: '근본도령', hook: '"지금 인생 방향 자체가\n틀렸을 수 있다."', tag: '종합 사주', color: '#3B82F6', bg: 'linear-gradient(135deg, #0f1525, #1e3a8a)' },
  { id: 'gumiho', name: '구미호 선생', hook: '"왜 연애가 안 되는지\n사주에 다 나와있다."', tag: '연애·궁합', color: '#EC4899', bg: 'linear-gradient(135deg, #1a0f18, #831843)' },
  { id: 'sinRyeong', name: '무등산 신령님', hook: '"허허... 이 사람\n전성기 아직 안 왔소."', tag: '대운·인생', color: '#10B981', bg: 'linear-gradient(135deg, #0a1a14, #065f46)' },
]

interface MenuItem {
  href: string
  label: string
  desc: string
  emoji: string
  img: string
  badge: string
  badgeColor: string
  paid: boolean
}

const MENUS: MenuItem[] = [
  { href: '/saju', label: '사주 풀이', desc: '백할매 팩폭으로 알려줌', emoji: '🔮', img: '/characters/baekhalma.png', badge: '590원', badgeColor: '#F59E0B', paid: true },
  { href: '/gunghap', label: '궁합 해설', desc: '우리 사이 되는지 봐줌', emoji: '💞', img: '/characters/gumiho.png', badge: '590원', badgeColor: '#F59E0B', paid: true },
  { href: '/daeun', label: '대운 해설', desc: '10년 주기 큰 흐름', emoji: '🌊', img: '/characters/sinryeong.png', badge: '일부무료', badgeColor: '#10B981', paid: false },
  { href: '/taekil', label: '택 · 일', desc: '좋은 날짜 골라줌', emoji: '📅', img: '/characters/baekhalma.png', badge: '일부무료', badgeColor: '#10B981', paid: false },
  { href: '/yearly', label: '연도별 운세', desc: '특정 연도 운세 분석', emoji: '📆', img: '/characters/doryeong.png', badge: '일부무료', badgeColor: '#10B981', paid: false },
  { href: '/daily', label: '일일 운세', desc: '오늘 하루 기운', emoji: '⭐', img: '/characters/gumiho.png', badge: '무료', badgeColor: '#3B82F6', paid: false },
]

const REVIEWS = [
  { name: '김**', text: '20만원 사주관 갔다가 여기 알게 됐는데 진짜 더 정확함', star: 5 },
  { name: '이**', text: '백할매 팩폭 처음엔 당황했는데 다 맞아서 소름', star: 5 },
  { name: '박**', text: '이걸 왜 이제 알았지... 작년에 알았으면', star: 5 },
]

export default function HomePage() {
  const { data: session } = useSession()
  const [showLoginModal, setShowLoginModal] = useState(false)

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
            <Link href="/daily" className="text-xs px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">⭐ 무료운세</Link>
            {session ? (
              <Link href="/storage" className="text-xs px-3 py-1.5 rounded-full bg-gray-800 text-gray-300">
                🪙 {(session.user as { yeobjeun_balance?: number })?.yeobjeun_balance ?? 0}냥
              </Link>
            ) : (
              <button onClick={() => setShowLoginModal(true)}
                className="text-xs px-3 py-1.5 rounded-full bg-purple-600 text-white font-medium">
                로그인
              </button>
            )}
          </div>
        </div>

        {/* 히어로 */}
        <div className="px-4 pt-4 pb-4">
          <div className="rounded-3xl overflow-hidden relative p-6"
            style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0f0a1a 50%, #0a1a0f 100%)', border: '1px solid #ffffff10' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex -space-x-1">
                {Object.values(CHAR_IMG).map((src, i) => (
                  <img key={i} src={src} alt="" className="w-6 h-6 rounded-full object-cover border border-gray-700"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ))}
              </div>
              <span className="text-xs text-gray-400"><AnimatedCount target={32184} />명 분석 완료</span>
              <span className="text-xs text-yellow-400">⭐ 4.8</span>
            </div>

            <h1 className="text-2xl font-black leading-tight mb-2">
              당신 올해 운명,<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #A78BFA, #EC4899)' }}>
                이미 틀어졌습니다
              </span>
            </h1>
            <p className="text-gray-400 text-sm mb-5">
              20만원짜리 사주관보다 더 정확하다고 소문났어요
            </p>
            <Link href="/saju"
              className="block w-full py-4 rounded-2xl text-center font-black text-base text-white mb-3"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
              내 운명 무료로 확인하기 →
            </Link>
            {!session && (
              <button onClick={() => setShowLoginModal(true)}
                className="w-full py-2 rounded-xl text-xs text-center text-gray-500 border border-gray-800">
                🪙 지금 가입하면 3냥 즉시 지급
              </button>
            )}
          </div>
        </div>

        {/* 감정 트리거 */}
        <div className="px-4 mb-4">
          <div className="rounded-2xl p-4 border border-yellow-900/40" style={{ background: 'linear-gradient(135deg, #1a1200, #0f0a00)' }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">⚠️</span>
              <div>
                <p className="text-yellow-400 font-bold text-sm mb-1">솔직히 말하면</p>
                <p className="text-gray-300 text-sm leading-relaxed">
                  이거 모르고 넘어가면 올해 돈 못 모은다. 당신 사주에 <span className="text-yellow-400 font-bold">'돈 새는 구조'</span>가 있는지 확인해봐야 해.
                </p>
                <Link href="/saju" className="inline-block mt-2 text-xs px-3 py-1.5 rounded-full font-bold text-black" style={{ background: '#F59E0B' }}>
                  990원으로 확인하기 →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 캐릭터 — 실제 이미지 (높이 키움) */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">👁 운명을 보는 자들</h2>
            <Link href="/characters" className="text-xs text-gray-500">전체보기 →</Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CHARACTERS.map(c => (
              <Link key={c.id} href={`/characters/${c.id}`}>
                <div className="rounded-2xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
                  style={{ background: c.bg, border: `1px solid ${c.color}30` }}>
                  {/* 캐릭터 이미지 — 높이 h-44로 키움 */}
                  <div className="h-44 overflow-hidden relative">
                    <img src={CHAR_IMG[c.id]} alt={c.name}
                      className="w-full h-full object-cover object-top"
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 40%, ${c.bg.split(',')[0].replace('linear-gradient(135deg, ', '')})` }} />
                  </div>
                  <div className="p-3 -mt-4 relative">
                    <p className="text-xs font-bold mb-0.5">{c.name}</p>
                    <p className="text-xs mb-1.5" style={{ color: c.color }}>{c.tag}</p>
                    <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line italic">{c.hook}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 메뉴 그리드 */}
        <div className="px-4 mb-6">
          <h2 className="text-base font-bold mb-3">🧿 신탁 메뉴</h2>
          <p className="text-xs text-gray-600 mb-2 font-medium">⭐ 프리미엄</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {MENUS.filter(m => m.paid).map(m => (
              <Link key={m.href} href={m.href}>
                <div className="rounded-2xl overflow-hidden bg-[#111118] border border-yellow-900/30 hover:border-yellow-600/50 transition-all cursor-pointer">
                  {/* 이모지 배경 (이미지 준비 전) */}
                  <div className="h-20 overflow-hidden relative bg-[#1a1025] flex items-center justify-center">
                    <span className="text-5xl">{m.emoji}</span>
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
                <div className="rounded-2xl overflow-hidden bg-[#111118] border border-gray-800 hover:border-gray-600 transition-all cursor-pointer">
                  <div className="h-20 overflow-hidden relative">
                    <img src={m.img} alt={m.label} className="w-full h-full object-cover object-top opacity-40" />
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

        {/* 후기 */}
        <div className="px-4 mb-6">
          <h2 className="text-base font-bold mb-3">💬 실제 후기</h2>
          <div className="space-y-2">
            {REVIEWS.map((r, i) => (
              <div key={i} className="rounded-2xl p-3 bg-[#111118] border border-gray-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-300">{r.name}</span>
                  <span className="text-xs text-yellow-400">{'⭐'.repeat(r.star)}</span>
                </div>
                <p className="text-gray-400 text-xs">{r.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 가입 유도 */}
        {!session && (
          <div className="px-4 mb-6">
            <div className="rounded-2xl p-4 border border-purple-900/40" style={{ background: 'linear-gradient(135deg, #1a0a2e, #0f0a1a)' }}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🪙</span>
                <div className="flex-1">
                  <p className="font-bold text-sm">지금 가입하면 3냥 즉시 지급</p>
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
              <p className="text-xs text-gray-500">으로 운명 확인</p>
            </div>
            <Link href="/saju" className="px-3 py-2 rounded-xl text-xs font-bold text-black" style={{ background: '#F59E0B' }}>
              결제하기
            </Link>
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

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center" onClick={() => setShowLoginModal(false)}>
          <div className="w-full max-w-md bg-[#111118] rounded-t-3xl p-6 border-t border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-5" />
            <div className="text-center mb-5">
              <p className="text-lg font-black mb-1">🪙 가입하면 3냥 즉시 지급</p>
              <p className="text-gray-400 text-sm">오늘의 일일운세도 무료로 바로 확인</p>
            </div>
            <div className="space-y-2">
              <button onClick={() => signIn('kakao')} className="w-full py-3.5 rounded-2xl font-bold text-black text-sm flex items-center justify-center gap-2" style={{ background: '#FEE500' }}>
                💬 카카오로 계속하기
              </button>
              <button onClick={() => signIn('google')} className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-white text-gray-900">
                🔵 구글로 계속하기
              </button>
              <button onClick={() => signIn('naver')} className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2" style={{ background: '#03C75A' }}>
                N 네이버로 계속하기
              </button>
            </div>
            <p className="text-center text-gray-600 text-xs mt-4">가입 시 이용약관 및 개인정보처리방침에 동의합니다</p>
          </div>
        </div>
      )}
    </div>
  )
}
