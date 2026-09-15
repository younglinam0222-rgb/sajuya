'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { loadTossPayments, type TossPaymentsWidgets, type WidgetPaymentMethodWidget, type WidgetAgreementWidget } from '@tosspayments/tosspayments-sdk'


export default function PayPage() {
  const params = useParams()
  const {data: session, status} = useSession()
  const userId = (session?.user as {id?:string})?.id ?? ''
  return <PayPageContent key={`${String(params.orderId)}:${status}:${userId}`}/>
}

function PayPageContent() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string
  const [order,setOrder]=useState<{amount:number;orderName:string}|null>(null)
  const { data: session, status } = useSession()
  const userId = (session?.user as { id?: string })?.id

  const widgetsRef = useRef<TossPaymentsWidgets | null>(null)
  const widgetLifecycle = useRef<Promise<void>>(Promise.resolve())
  const requestingPayment = useRef(false)
  const [ready, setReady] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    let methods: WidgetPaymentMethodWidget | undefined
    let agreement: WidgetAgreementWidget | undefined
    const controller = new AbortController()

    // Cleanup completes before a new order renders widgets into the same elements.
    widgetLifecycle.current = widgetLifecycle.current.catch(() => {}).then(async () => {
      if (cancelled) return
      try {
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
        if (!clientKey) throw new Error('결제 설정이 완료되지 않았어요. 잠시 후 다시 시도해주세요.')
        if (!userId) throw new Error('로그인 정보를 확인하지 못했어요. 다시 로그인해주세요.')
        const response = await fetch('/api/pay/order/' + orderId, { signal: controller.signal, cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || '주문을 확인하지 못했어요.')
        if (cancelled) return
        if (data.status === 'done') { router.replace('/payments'); return }
        setOrder(data)
        const tossPayments = await loadTossPayments(clientKey)
        if (cancelled) return
        const widgets = tossPayments.widgets({ customerKey: userId })
        widgetsRef.current = widgets
        await widgets.setAmount({ currency: 'KRW', value: data.amount })
        if (cancelled) return
        methods = await widgets.renderPaymentMethods({ selector: '#toss-payment-method' })
        if (cancelled) return
        agreement = await widgets.renderAgreement({ selector: '#toss-agreement' })
        if (!cancelled) setReady(true)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '결제 화면을 불러오지 못했어요. 새로고침해주세요.')
      }
    })
    return () => {
      cancelled = true
      controller.abort()
      widgetsRef.current = null
      widgetLifecycle.current = widgetLifecycle.current.then(async () => {
        await Promise.allSettled([methods?.destroy(), agreement?.destroy()])
      })
    }
  }, [status, userId, orderId, router])

  const handlePay = async () => {
    if (!widgetsRef.current || !order || !ready || !agreed || requestingPayment.current) return
    requestingPayment.current = true
    setPaying(true)
    setError('')
    try {

      await widgetsRef.current.requestPayment({
        orderId,
        orderName: order?.orderName ?? '사주궁',
        successUrl: `${window.location.origin}/pay/success`,
        failUrl: `${window.location.origin}/pay/fail`,
        customerEmail: session?.user?.email ?? undefined,
        customerName: session?.user?.name ?? undefined,
      })
      // 성공/실패 시 Toss가 successUrl/failUrl로 리다이렉트하므로 여기 이후 코드는 보통 실행되지 않음
    } catch (e: unknown) {
      const failure = e as {code?: string; message?: string}
      if (failure?.code !== 'USER_CANCEL') setError(failure?.message || '결제 요청 중 오류가 발생했어요.')
      requestingPayment.current = false
      setPaying(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="palace-page palace-checkout min-h-screen bg-[#0c1119] flex items-center justify-center text-[#a7b3c3] text-sm">
        불러오는 중...
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="palace-page palace-checkout min-h-screen bg-[#0c1119] flex flex-col items-center justify-center text-white px-6 text-center">
        <div className="text-5xl mb-5">🔒</div>
        <div className="text-xl font-semibold mb-2">로그인 후 결제할 수 있어요</div>
        <button onClick={() => signIn(undefined, { callbackUrl: `/checkout/${orderId}` })}
          className="mt-4 px-6 py-3 rounded-lg font-bold text-sm text-white"
          style={{ background: '#c6a66d', color: '#17202c' }}>
          로그인하기
        </button>
        <Link href={'/storage'} className="mt-6 text-xs text-[#9eabbd]">← 결과로 돌아가기</Link>
      </div>
    )
  }

  return (
    <div className="palace-page palace-checkout min-h-screen bg-[#0c1119] text-white max-w-[430px] mx-auto pb-10">
      <div className="px-4 py-5 border-b border-[#344151] flex items-center gap-3">
        <Link href={'/storage'} className="text-[#a7b3c3] text-xl">←</Link>
        <div>
          <p className="font-bold text-base">{order?.orderName??'결제 준비'}</p>
          <p className="text-xs text-[#a7b3c3] mt-0.5">선택한 상품과 결제 금액을 확인해주세요</p>
        </div>
      </div>

      <div className="px-4 pt-5">
        <div className="rounded-lg p-4 mb-4 bg-[#17202c] border border-[#344151] flex items-center justify-between">
          <span className="text-sm text-[#a7b3c3]">결제 금액</span>
          <span className="text-xl font-semibold text-[#d4bc92]">{order ? order.amount.toLocaleString() + '원' : '확인 중'}</span>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        <div id="toss-payment-method" />
        <div id="toss-agreement" className="mt-3" />

        {/* 구매 조건 확인: 엽전 충전과 콘텐츠 제공을 구분해 안내합니다. */}
        <label className="flex items-start gap-2.5 mt-4 px-3.5 py-3 rounded-lg bg-[#17202c] border border-[#344151] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#c6a66d] flex-shrink-0"
          />
          <span className="text-xs text-[#a7b3c3] leading-relaxed">
            선택한 상품의 가격과 제공 내용, 이용약관 및 환불 안내를 확인했습니다.
            <Link href="/terms" target="_blank" className="text-[#c6a66d] underline ml-1">환불정책 보기</Link>
          </span>
        </label>

        <button
          onClick={handlePay}
          disabled={!ready || paying || !agreed}
          className="w-full mt-3 py-4 rounded-lg font-bold text-base text-white disabled:opacity-40 transition-all active:scale-95"
          style={{ background: '#c6a66d', color: '#17202c' }}>
          {paying ? '결제 처리 중...' : !agreed ? '위 내용에 동의해주세요' : `${order ? order.amount.toLocaleString() + '원' : '확인 중'} 결제하기`}
        </button>
      </div>
    </div>
  )
}
