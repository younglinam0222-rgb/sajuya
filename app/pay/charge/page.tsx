'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { loadTossPayments, ANONYMOUS, type TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk'
import { Suspense } from 'react'

type PackageView = {
  id: string
  name: string
  amountKrw: number
  listPriceKrw?: number
  discountKrw?: number
  paidNyang: number
  bonusNyang: number
  totalNyang: number
}

function ChargeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const packageId = searchParams.get('packageId') || ''
  const { data: session, status } = useSession()
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null)
  const [ready, setReady] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [order, setOrder] = useState<{ orderId: string; amount: number; pkg: PackageView } | null>(null)

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
        const res = await fetch('/api/pay/ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageId }),
        })
        const data = await res.json()
        if (!res.ok || !data.orderId) {
          setError(data.error || '주문을 만들지 못했어요.')
          return
        }
        if (cancelled) return
        setOrder({ orderId: data.orderId, amount: data.amount, pkg: data.package })

        const tossPayments = await loadTossPayments(clientKey)
        const userId = (session?.user as { id?: string })?.id
        const widgets = tossPayments.widgets({ customerKey: userId ?? ANONYMOUS })
        widgetsRef.current = widgets
        await widgets.setAmount({ currency: 'KRW', value: data.amount })
        await widgets.renderPaymentMethods({ selector: '#toss-payment-method' })
        await widgets.renderAgreement({ selector: '#toss-agreement' })
        if (!cancelled) setReady(true)
      } catch (e) {
        console.error('[사주궁] 충전 결제 초기화 실패')
        if (!cancelled) setError('결제 화면을 불러오지 못했어요. 새로고침해주세요.')
      }
    })()
    return () => { cancelled = true }
  }, [status, packageId, (session?.user as { id?: string })?.id])

  const handlePay = async () => {
    if (!widgetsRef.current || !agreed || !order) return
    setPaying(true)
    setError('')
    try {
      await widgetsRef.current.requestPayment({
        orderId: order.orderId,
        orderName: `사주궁 엽전 ${order.pkg.totalNyang}냥`,
        successUrl: `${window.location.origin}/pay/success`,
        failUrl: `${window.location.origin}/pay/fail`,
        customerEmail: session?.user?.email ?? undefined,
        customerName: session?.user?.name ?? undefined,
      })
    } catch (e: any) {
      if (e?.code !== 'USER_CANCEL') {
        setError(e?.message || '결제 요청 중 오류가 발생했어요.')
      }
      setPaying(false)
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-500 text-sm">불러오는 중...</div>
  }
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
        <p className="text-xl font-black mb-2">로그인 후 충전할 수 있어요</p>
        <button onClick={() => signIn(undefined, { callbackUrl: `/pay/charge?packageId=${packageId}` })}
          className="mt-4 px-6 py-3 rounded-2xl font-bold text-sm text-white" style={{ background: '#7c3aed' }}>
          로그인하기
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white max-w-[430px] mx-auto pb-10">
      <div className="px-4 py-5 border-b border-gray-800 flex items-center gap-3">
        <Link href="/" className="text-gray-400 text-xl">←</Link>
        <div>
          <p className="font-bold text-base">엽전 충전</p>
          <p className="text-xs text-gray-500 mt-0.5">서버에 저장된 패키지 금액으로 결제합니다</p>
        </div>
      </div>
      <div className="px-4 pt-5">
        {order && (
          <div className="rounded-2xl p-4 mb-4 bg-[#111118] border border-gray-800 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">패키지</span><span>{order.pkg.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">결제금액</span><span className="text-yellow-400 font-black">{order.amount.toLocaleString()}원</span></div>
            {!!order.pkg.discountKrw && (
              <div className="flex justify-between"><span className="text-gray-400">할인</span><span>{order.pkg.discountKrw.toLocaleString()}원 (정가 {order.pkg.listPriceKrw?.toLocaleString()}원)</span></div>
            )}
            <div className="flex justify-between"><span className="text-gray-400">유상</span><span>{order.pkg.paidNyang}냥</span></div>
            {order.pkg.bonusNyang > 0 && (
              <div className="flex justify-between"><span className="text-gray-400">보너스</span><span>{order.pkg.bonusNyang}냥</span></div>
            )}
            <div className="flex justify-between"><span className="text-gray-400">총 지급</span><span className="font-bold">{order.pkg.totalNyang}냥</span></div>
          </div>
        )}
        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>
        )}
        <div id="toss-payment-method" />
        <div id="toss-agreement" className="mt-3" />
        <label className="flex items-start gap-2.5 mt-4 px-3.5 py-3 rounded-2xl bg-[#111118] border border-gray-800 cursor-pointer select-none">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-purple-500 flex-shrink-0" />
          <span className="text-xs text-gray-400 leading-relaxed">
            결제와 동시에 엽전이 계정에 지급되며, 이미 콘텐츠 열람에 사용된 엽전은 환불이 제한될 수 있음을 확인했습니다.
            <Link href="/terms" target="_blank" className="text-purple-400 underline ml-1">이용약관</Link>
          </span>
        </label>
        <button onClick={handlePay} disabled={!ready || paying || !agreed || !order}
          className="w-full mt-3 py-4 rounded-2xl font-bold text-base text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
          {paying ? '결제 처리 중...' : !agreed ? '위 내용에 동의해주세요' : order ? `${order.amount.toLocaleString()}원 결제하기` : '준비 중...'}
        </button>
        <button onClick={() => router.back()} className="w-full mt-3 text-xs text-gray-600">취소</button>
      </div>
    </div>
  )
}

export default function ChargePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-500 text-sm">불러오는 중...</div>}>
      <ChargeContent />
    </Suspense>
  )
}
