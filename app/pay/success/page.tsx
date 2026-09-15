'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {useSession, signIn} from 'next-auth/react'

function PaySuccessContent() {
  const {status: authStatus} = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'confirming' | 'error'>('confirming')
  const [error, setError] = useState('')

  const paymentKey = searchParams.get('paymentKey')
  const orderId = searchParams.get('orderId')
  const amount = searchParams.get('amount')
  const invalid = !paymentKey || !orderId || !amount || !Number.isSafeInteger(Number(amount)) || Number(amount) <= 0

  useEffect(() => {
    if (invalid || authStatus !== 'authenticated') return
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
        router.replace(data.redirectUrl || '/storage')
      } catch (e) {
        console.error('[사주궁] 결제 승인 요청 실패:', e)
        setStatus('error')
        setError('결제 승인 중 오류가 발생했어요.')
      }
    })()
  }, [paymentKey, orderId, amount, invalid, authStatus, router])

  return (
    <div className="palace-page palace-pay min-h-screen bg-[#0c1119] flex flex-col items-center justify-center text-white px-6 text-center">
      {authStatus === 'unauthenticated' && !invalid ? <><p className="text-lg font-bold mb-3">결제한 계정으로 로그인해주세요.</p><p className="text-sm text-[#a7b3c3] mb-5">진행한 결제를 이어서 확인합니다. 다시 결제할 필요는 없어요.</p><button className="rounded-md bg-[#c6a66d] text-[#17202c] px-6 py-3" onClick={()=>signIn(undefined,{callbackUrl:window.location.pathname+window.location.search})}>로그인하고 결제 확인</button></> : status === 'confirming' && !invalid ? (
        <>
          <div className="text-4xl mb-4 animate-spin">🔮</div>
          <p className="text-sm text-[#a7b3c3]">결제 확인 중이에요...</p>
        </>
      ) : (
        <>
          <div className="text-5xl mb-4">😥</div>
          <p className="text-lg font-semibold mb-2">결제 확인에 실패했어요</p>
          <p className="text-sm text-[#a7b3c3] mb-6">{invalid ? '결제 정보가 올바르지 않아요.' : error}</p>
          <p className="text-sm text-[#a7b3c3] mb-4">이미 결제됐다면 다시 결제하지 말고 기존 결제 상태를 확인해주세요.</p>
          <button onClick={() => window.location.reload()} className="mb-4 underline">결제 상태 다시 확인하기</button>
          <Link href="/payments" className="px-6 py-3 rounded-lg font-bold text-sm text-white" style={{ background: '#c6a66d', color: '#17202c' }}>
            결제 내역 확인하기
          </Link>
        </>
      )}
    </div>
  )
}

export default function PaySuccessPage() {
  return (
    <Suspense fallback={
      <div className="palace-page palace-pay min-h-screen bg-[#0c1119] flex items-center justify-center text-[#a7b3c3] text-sm">
        불러오는 중...
      </div>
    }>
      <PaySuccessContent />
    </Suspense>
  )
}
