'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

interface Reading {
  id: string
  share_id: string
  character_id: string
  created_at: string
  saju_data: string | {form?: {name?:string}}
  is_paid: boolean
  access_verified: boolean
  product: string
}

const CHAR_NAMES: Record<string, string> = {
  baekhalma: '건물주 백할매',
  doRyeong: '근본도령',
  gumiho: '구미호 선생',
  sinRyeong: '무등산 신령님',
}
const CHAR_IMG: Record<string, string> = {
  baekhalma: '/characters/baekhalma.png',
  doRyeong: '/characters/doryeong.png',
  gumiho: '/characters/gumiho.png',
  sinRyeong: '/characters/sinryeong.png',
}
const CHAR_COLOR: Record<string, string> = {
  baekhalma: '#c6a66d',
  doRyeong: '#8daabc',
  gumiho: '#bf94a4',
  sinRyeong: '#94b29c',
}

export default function StoragePage() {
  const { data: session, status } = useSession()
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)
  const [showLogout, setShowLogout] = useState(false)

  const [loadError, setLoadError] = useState('')
  const [loadedUser, setLoadedUser] = useState<string|null>(null)
  const userId = (session?.user as {id?:string})?.id ?? null
  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    fetch('/api/storage', {signal:controller.signal, cache:'no-store'})
      .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error || '보관함을 불러오지 못했어요.'); return data })
      .then(data => { if (!controller.signal.aborted) { setReadings(data.readings ?? []); setLoadError('') } })
      .catch(e => { if (!controller.signal.aborted) setLoadError(e instanceof Error ? e.message : '보관함 연결을 확인해주세요.') })
      .finally(() => { if (!controller.signal.aborted) { setLoading(false); setLoadedUser(userId) } })
    return () => controller.abort()
  }, [userId])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
  }

  const getFormInfo = (sajuData: Reading['saju_data']) => {
    try { return (typeof sajuData==='string'?JSON.parse(sajuData):sajuData).form } catch { return null }
  }

  return (
    <div className="palace-page palace-storage min-h-screen bg-[#0c1119] text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[#a7b3c3] text-xl">←</Link>
            <div>
              <h1 className="[font-family:var(--palace-serif)] text-xl font-bold">📦 보관함</h1>
              <p className="text-[#a7b3c3] text-xs mt-0.5">내 사주 풀이 저장 목록</p>
            </div>
          </div>

          {/* 프로필 + 로그아웃 */}
          {session && (
            <div className="relative">
              <button
                onClick={() => setShowLogout(!showLogout)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#202b39] text-xs text-[#c4cdd8]">
                {session.user?.image
                  ? <img src={session.user.image} className="w-5 h-5 rounded-full" alt="" />
                  : <span>👤</span>}
                <span className="max-w-[60px] truncate">{session.user?.name}</span>
                <span className="text-[#9eabbd]">▼</span>
              </button>

              {showLogout && (
                <div className="absolute right-0 top-10 bg-[#202b39] border border-[#455365] rounded-lg p-2 z-50 min-w-[180px]">
                  {/* ✅ 신규: 네이버 로그인 검수용 — 이메일 정보가 실제로 화면에
                      쓰이고 있다는 걸 증명하기 위해 계정 정보 표시 */}
                  <div className="px-3 py-2 text-xs text-[#a7b3c3] border-b border-[#344151] mb-1">
                    <p className="text-[#c4cdd8] font-medium truncate">{session.user?.name}님</p>
                    <p className="truncate">{session.user?.email}</p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full px-3 py-2 text-sm text-red-400 hover:bg-[#202b39] rounded-md text-left">
                    🚪 로그아웃
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {session && <Link href="/payments" className="block mb-6 px-4 py-3 rounded-md border border-[#5c6a7b] text-sm text-amber-100">결제 · 환불 내역 확인하기 →</Link>}
        {status === 'loading' || (session && (loading || loadedUser !== userId)) ? <p className="py-12 text-center text-[#a7b3c3]" role="status">보관함을 불러오는 중이에요.</p> : loadError && session ? <div className="py-12 text-center" role="alert"><p>{loadError}</p><button className="mt-4 underline" onClick={()=>window.location.reload()}>다시 확인하기</button></div> : !session ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🔒</p>
            <p className="font-bold text-lg mb-2">로그인이 필요해요</p>
            <p className="text-[#a7b3c3] text-sm mb-6">로그인하면 내 풀이를 저장하고<br />언제든 다시 볼 수 있어요</p>
            <Link href="/login?callbackUrl=%2Fstorage"
              className="inline-block px-6 py-3 rounded-lg font-bold text-white"
              style={{ background: '#c6a66d', color: '#17202c' }}>
              로그인하기
            </Link>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="text-4xl animate-spin">🔮</div>
            <p className="text-[#a7b3c3] text-sm">풀이 목록 불러오는 중...</p>
          </div>
        ) : readings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">📭</p>
            <p className="font-bold text-lg mb-2">아직 저장된 풀이가 없어요</p>
            <p className="text-[#a7b3c3] text-sm mb-6">사주를 풀이받으면 여기에 저장돼요</p>
            <Link href="/saju"
              className="inline-block px-6 py-3 rounded-lg font-bold text-white"
              style={{ background: '#c6a66d', color: '#17202c' }}>
              사주 풀이받기 →
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-[#a7b3c3] mb-3">총 {readings.length}개 풀이</p>
            <div className="space-y-3">
              {readings.map(r => {
                const form = getFormInfo(r.saju_data)
                const color = CHAR_COLOR[r.character_id] ?? '#c6a66d'
                const img = CHAR_IMG[r.character_id] ?? `/characters/${r.character_id.toLowerCase()}.png`
                const name = CHAR_NAMES[r.character_id] ?? CHAR_NAMES[r.character_id==='doryeong'?'doRyeong':r.character_id==='sinryeong'?'sinRyeong':r.character_id] ?? r.character_id
                return (
                  <Link key={r.id} href={r.product==='conversation'?`/chat?guide=${r.character_id.toLowerCase()}&source=${encodeURIComponent(form?.conversation?.sourceId||'')}`:r.product==='chat'?'/consultation':`/result/${r.share_id}`}>
                    <div className="rounded-lg overflow-hidden bg-[#17202c] border border-[#344151] hover:border-[#5c6a7b] transition-all flex">
                      <div className="w-20 flex-shrink-0 overflow-hidden relative">
                        {img && <img src={img} alt={name} className="w-full h-full object-cover object-top opacity-80" />}
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent, #17202c)' }} />
                      </div>
                      <div className="flex-1 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold" style={{ color }}>{name}</span>
                          {r.access_verified && (r.is_paid || ['daily','conversation'].includes(r.product)) && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#d4bc92]/20 text-[#d4bc92]">{r.is_paid?'유료':'무료 체험'}</span>
                          )}
                        </div>
                        {form && <p className="text-white font-bold text-sm mb-0.5">{form.name}님의 {r.product==='conversation'?'대화':r.product==='chat'?'선택형 상담':'사주'}</p>}
                        <p className="text-[#a7b3c3] text-xs">{formatDate(r.created_at)}</p>
                        <p className="text-xs mt-1.5 font-medium" style={{ color }}>다시 보기 →</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {session && readings.length > 0 && (
          <Link href="/saju"
            className="block w-full mt-6 py-4 rounded-lg text-center font-bold text-white"
            style={{ background: '#c6a66d', color: '#17202c' }}>
            + 새 풀이 받기
          </Link>
        )}
      </div>

      {/* 드롭다운 닫기 오버레이 */}
      {showLogout && (
        <div className="fixed inset-0 z-40" onClick={() => setShowLogout(false)} />
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#344151] bg-[#141a24]" aria-label="주요 메뉴">
        <div className="mx-auto flex max-w-[1120px] items-stretch justify-center px-2 py-1 pb-[max(8px,env(safe-area-inset-bottom))]">
          {[
            { href: '/', label: '홈' },
            { href: '/saju', label: '사주' },
            { href: '/chat', label: '1:1 대화' },
            { href: '/daily', label: '일일운세' },
            { href: '/storage', label: '보관함' },
            { href: '/characters', label: '신령' },
          ].map(n => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={n.href === '/storage' ? 'page' : undefined}
              className={`flex min-h-[50px] min-w-0 flex-1 flex-col items-center justify-center px-1 text-center text-[11px] whitespace-nowrap ${
                n.href === '/storage'
                  ? 'font-semibold text-[#f2f1ed]'
                  : n.href === '/chat'
                    ? 'font-bold text-[#c9ac86]'
                    : 'text-[#a7afb9]'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
