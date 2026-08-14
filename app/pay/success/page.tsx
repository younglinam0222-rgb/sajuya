'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function PaySuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'confirming' | 'error'>('confirming')
  const [error, setError] = useState('')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId    = searchParams.get('orderId')
    const amount     = searchParams.get('amount')

    if (!paymentKey || !orderId || !amount) {
      setStatus('error')
      setError('결제 정보가 올바르지 않아요.')
      return
    }

    // orderId 형식: unlock_{shareId}_{timestamp}
    const shareId = orderId.split('_')[1]

    ;(async () => {
      try {
        const res = await fetch('/api/pay/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setStatus('error')
          setError(data.error || '결제 승인에 실패했어요.')
          return
        }
        router.replace(shareId ? `/result/${shareId}?unlocked=1` : '/')
      } catch (e) {
        console.error('[사주궁] 결제 승인 요청 실패:', e)
        setStatus('error')
        setError('결제 승인 중 오류가 발생했어요.')
      }
    })()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
      {status === 'confirming' ? (
        <>
          <div className="text-4xl mb-4 animate-spin">🔮</div>
          <p className="text-sm text-gray-400">결제 확인 중이에요...</p>
        </>
      ) : (
        <>
          <div className="text-5xl mb-4">😥</div>
          <p className="text-lg font-black mb-2">결제 확인에 실패했어요</p>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <Link href="/saju" className="px-6 py-3 rounded-2xl font-bold text-sm text-white" style={{ background: '#7c3aed' }}>
            사주 풀이로 돌아가기
          </Link>
        </>
      )}
    </div>
  )
}

export default function PaySuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-500 text-sm">
        불러오는 중...
      </div>
    }>
      <PaySuccessContent />
    </Suspense>
  )
}
