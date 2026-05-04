'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Reading {
  id: string
  share_id: string
  character_id: string
  created_at: string
  saju_data: string
  is_paid: boolean
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
  baekhalma: '#8B5CF6',
  doRyeong: '#3B82F6',
  gumiho: '#EC4899',
  sinRyeong: '#10B981',
}

export default function StoragePage() {
  const { data: session } = useSession()
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) fetchReadings()
    else setLoading(false)
  }, [session])

  const fetchReadings = async () => {
    try {
      const res = await fetch('/api/storage')
      if (res.ok) {
        const data = await res.json()
        setReadings(data.readings ?? [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  const getFormInfo = (sajuData: string) => {
    try {
      const parsed = JSON.parse(sajuData)
      return parsed.form
    } catch { return null }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-gray-400 text-xl">←</Link>
          <div>
            <h1 className="text-xl font-bold">📦 보관함</h1>
            <p className="text-gray-500 text-xs mt-0.5">내 사주 풀이 저장 목록</p>
          </div>
        </div>

        {!session ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🔒</p>
            <p className="font-bold text-lg mb-2">로그인이 필요해요</p>
            <p className="text-gray-500 text-sm mb-6">로그인하면 내 풀이를 저장하고<br />언제든 다시 볼 수 있어요</p>
            <Link href="/login"
              className="inline-block px-6 py-3 rounded-2xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
              로그인하기
            </Link>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="text-4xl animate-spin">🔮</div>
            <p className="text-gray-500 text-sm">풀이 목록 불러오는 중...</p>
          </div>
        ) : readings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">📭</p>
            <p className="font-bold text-lg mb-2">아직 저장된 풀이가 없어요</p>
            <p className="text-gray-500 text-sm mb-6">사주를 풀이받으면 여기에 저장돼요</p>
            <Link href="/saju"
              className="inline-block px-6 py-3 rounded-2xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
              사주 풀이받기 →
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">총 {readings.length}개 풀이</p>
            <div className="space-y-3">
              {readings.map(r => {
                const form = getFormInfo(r.saju_data)
                const color = CHAR_COLOR[r.character_id] ?? '#8B5CF6'
                const img = CHAR_IMG[r.character_id]
                const name = CHAR_NAMES[r.character_id] ?? r.character_id
                return (
                  <Link key={r.id} href={`/result/${r.share_id}`}>
                    <div className="rounded-2xl overflow-hidden bg-[#111118] border border-gray-800 hover:border-gray-600 transition-all flex">
                      {/* 캐릭터 이미지 */}
                      <div className="w-20 flex-shrink-0 overflow-hidden relative">
                        {img && <img src={img} alt={name} className="w-full h-full object-cover object-top opacity-80" />}
                        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, transparent, #111118)` }} />
                      </div>
                      <div className="flex-1 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold" style={{ color }}>{name}</span>
                          {r.is_paid && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">유료</span>
                          )}
                        </div>
                        {form && (
                          <p className="text-white font-bold text-sm mb-0.5">{form.name}님의 사주</p>
                        )}
                        <p className="text-gray-500 text-xs">{formatDate(r.created_at)}</p>
                        <p className="text-xs mt-1.5 font-medium" style={{ color }}>다시 보기 →</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* 새 풀이 받기 CTA */}
        {session && readings.length > 0 && (
          <Link href="/saju"
            className="block w-full mt-6 py-4 rounded-2xl text-center font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
            + 새 풀이 받기
          </Link>
        )}
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
            <span className="text-xs text-purple-400 font-medium">보관함</span>
          </Link>
          <Link href="/characters" className="flex flex-col items-center gap-0.5 py-2 px-3">
            <span className="text-xl">👁</span>
            <span className="text-xs text-gray-500">신령</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
