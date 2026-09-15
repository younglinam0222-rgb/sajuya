'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { isChargeOrderId } from '@/lib/chargePackages'

function PaySuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'confirming' | 'error' | 'retry'>('confirming')
  const [error, setError] = useState('')
  const [orderIdState, setOrderIdState] = useState('')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId    = searchParams.get('orderId')
    const amount     = searchParams.get('amount')

    if (!paymentKey || !orderId || !amount) {
      setStatus('error')
      setError('결제 정보가 올바르지 않아요.')
      return
    }
    setOrderIdState(orderId)
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
          if (data.retryGrant && isChargeOrderId(orderId)) {
            setStatus('retry')
            setError(data.error || '결제는 됐지만 지급에 실패했어요.')
            return
          }
          setStatus('error')
          setError(data.error || '결제 승인에 실패했어요.')
          return
        }
        if (isChargeOrderId(orderId)) {
          router.replace('/?charged=1')
          return
        }
        router.replace(shareId ? `/result/${shareId}?unlocked=1` : '/')
      } catch (e) {
        console.error('[사주궁] 결제 승인 요청 실패')
        setStatus('error')
        setError('결제 승인 중 오류가 발생했어요.')
      }
    })()
  }, [searchParams, router])

  const retryGrant = async () => {
    setStatus('confirming')
    try {
      const res = await fetch('/api/pay/grant-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderIdState }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setStatus('retry')
        setError(data.error || '지급 재시도에 실패했어요.')
        return
      }
      router.replace('/?charged=1')
    } catch {
      setStatus('retry')
      setError('지급 재시도 중 오류가 발생했어요.')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
      {status === 'confirming' ? (
        <>
          <div className="text-4xl mb-4 animate-spin">🔮</div>
          <p className="text-sm text-gray-400">결제 확인 중이에요...</p>
        </>
      ) : status === 'retry' ? (
        <>
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-lg font-black mb-2">결제는 완료됐어요</p>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <p className="text-xs text-gray-600 mb-4">같은 결제를 다시 청구하지 않습니다. 지급만 다시 시도합니다.</p>
          <button onClick={retryGrant} className="px-6 py-3 rounded-2xl font-bold text-sm text-white" style={{ background: '#7c3aed' }}>
            엽전 지급 다시 시도
          </button>
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
