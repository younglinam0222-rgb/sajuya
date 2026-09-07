'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { SAJU_UNLOCK_NYANG } from '@/lib/pricing'
import YeopjeunShop from '@/app/components/YeopjeunShop'

export default function PayPage() {
  const params = useParams()
  const router = useRouter()
  const shareId = params.shareId as string
  const { data: session, status } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showShop, setShowShop] = useState(false)
  const balance = (session?.user as { yeobjeun_balance?: number })?.yeobjeun_balance ?? 0

  const unlock = async () => {
    if (balance < SAJU_UNLOCK_NYANG) {
      setShowShop(true)
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/readings/${shareId}/unlock`, { method: 'POST' })
      const data = await res.json()
      if (res.status === 402 || data.code === 'insufficient') {
        setShowShop(true)
        setError('엽전이 부족해요. 충전 후 전체보기를 다시 눌러주세요.')
        return
      }
      if (!res.ok) {
        setError(data.error || '전체보기에 실패했어요.')
        return
      }
      router.replace(`/result/${shareId}?unlocked=1`)
    } catch {
      setError('전체보기 요청 중 오류가 났어요.')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-500 text-sm">불러오는 중...</div>
  }
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
        <p className="text-xl font-black mb-2">로그인 후 전체보기할 수 있어요</p>
        <button onClick={() => signIn(undefined, { callbackUrl: `/pay/${shareId}` })}
          className="mt-4 px-6 py-3 rounded-2xl font-bold text-sm text-white"
          style={{ background: '#7c3aed' }}>
          로그인하기
        </button>
        <Link href={`/result/${shareId}`} className="mt-6 text-xs text-gray-600">← 결과로 돌아가기</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white max-w-[430px] mx-auto pb-10">
      <div className="px-4 py-5 border-b border-gray-800 flex items-center gap-3">
        <Link href={`/result/${shareId}`} className="text-gray-400 text-xl">←</Link>
        <div>
          <p className="font-bold text-base">사주 전체보기</p>
          <p className="text-xs text-gray-500 mt-0.5">엽전 {SAJU_UNLOCK_NYANG}냥 차감 · 이후 무료 재열람</p>
        </div>
      </div>
      <div className="px-4 pt-5">
        <div className="rounded-2xl p-4 mb-4 bg-[#111118] border border-gray-800 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">차감</span><span className="text-yellow-400 font-black">{SAJU_UNLOCK_NYANG}냥</span></div>
          <div className="flex justify-between"><span className="text-gray-400">보유</span><span>{balance}냥</span></div>
        </div>
        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>
        )}
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          신규 전체보기는 4,900원 결제가 아닙니다. 이미 연 풀이는 다시 차감하지 않습니다.
        </p>
        <button
          onClick={unlock}
          disabled={busy}
          className="w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
          {busy ? '처리 중...' : balance < SAJU_UNLOCK_NYANG ? '충전하고 전체보기' : '1냥으로 전체보기'}
        </button>
      </div>
      {showShop && <YeopjeunShop onClose={() => setShowShop(false)} currentBalance={balance} />}
    </div>
  )
}
