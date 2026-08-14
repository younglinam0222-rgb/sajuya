'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { loadTossPayments, ANONYMOUS, type TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk'
import { UNLOCK_PRICE } from '@/lib/pricing'

export default function PayPage() {
  const params = useParams()
  const router = useRouter()
  const shareId = params.shareId as string
  const { data: session, status } = useSession()

  const widgetsRef = useRef<TossPaymentsWidgets | null>(null)
  const [ready, setReady] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false

    ;(async () => {
      try {
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
        if (!clientKey) {
          setError('결제 설정이 완료되지 않았어요. 잠시 후 다시 시도해주세요.')
          return
        }
        const tossPayments = await loadTossPayments(clientKey)
        const userId = (session?.user as { id?: string })?.id
        const customerKey = userId ?? ANONYMOUS
        const widgets = tossPayments.widgets({ customerKey })
        if (cancelled) return
        widgetsRef.current = widgets

        await widgets.setAmount({ currency: 'KRW', value: UNLOCK_PRICE })
        await widgets.renderPaymentMethods({ selector: '#toss-payment-method' })
        await widgets.renderAgreement({ selector: '#toss-agreement' })
        if (!cancelled) setReady(true)
      } catch (e) {
        console.error('[사주궁] 토스 위젯 초기화 실패:', e)
        if (!cancelled) setError('결제 화면을 불러오지 못했어요. 새로고침해주세요.')
      }
    })()

    return () => { cancelled = true }
  }, [status, (session?.user as { id?: string })?.id])

  const handlePay = async () => {
    if (!widgetsRef.current) return
    setPaying(true)
    setError('')
    try {
      const orderId = `unlock_${shareId}_${Date.now()}`
      await widgetsRef.current.requestPayment({
        orderId,
        orderName: '사주궁 전체 판결문 열기',
        successUrl: `${window.location.origin}/pay/success`,
        failUrl: `${window.location.origin}/pay/fail`,
        customerEmail: session?.user?.email ?? undefined,
        customerName: session?.user?.name ?? undefined,
      })
      // 성공/실패 시 Toss가 successUrl/failUrl로 리다이렉트하므로 여기 이후 코드는 보통 실행되지 않음
    } catch (e: any) {
      console.error('[사주궁] 결제 요청 실패:', e)
      if (e?.code !== 'USER_CANCEL') {
        setError(e?.message || '결제 요청 중 오류가 발생했어요.')
      }
      setPaying(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-500 text-sm">
        불러오는 중...
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
        <div className="text-5xl mb-5">🔒</div>
        <div className="text-xl font-black mb-2">로그인 후 결제할 수 있어요</div>
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
          <p className="font-bold text-base">전체 판결문 열기</p>
          <p className="text-xs text-gray-500 mt-0.5">잠긴 판결문을 모두 확인할 수 있어요</p>
        </div>
      </div>

      <div className="px-4 pt-5">
        <div className="rounded-2xl p-4 mb-4 bg-[#111118] border border-gray-800 flex items-center justify-between">
          <span className="text-sm text-gray-400">결제 금액</span>
          <span className="text-xl font-black text-yellow-400">{UNLOCK_PRICE.toLocaleString()}원</span>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        <div id="toss-payment-method" />
        <div id="toss-agreement" className="mt-3" />

        <button
          onClick={handlePay}
          disabled={!ready || paying}
          className="w-full mt-4 py-4 rounded-2xl font-bold text-base text-white disabled:opacity-40 transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
          {paying ? '결제 처리 중...' : `${UNLOCK_PRICE.toLocaleString()}원 결제하기`}
        </button>
      </div>
    </div>
  )
}
