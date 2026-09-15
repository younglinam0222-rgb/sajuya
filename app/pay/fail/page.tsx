'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function PayFailContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') || '결제가 취소되었거나 실패했어요.'

  return (
    <div className="palace-page palace-pay min-h-screen bg-[#0c1119] flex flex-col items-center justify-center text-white px-6 text-center">
      <div className="text-5xl mb-4">😶</div>
      <p className="text-lg font-semibold mb-2">결제가 완료되지 않았어요</p>
      <p className="text-sm text-[#a7b3c3] mb-6">{message}</p>
      <Link href="/payments"
        className="px-6 py-3 rounded-lg font-bold text-sm text-white" style={{ background: '#c6a66d', color: '#17202c' }}>
        결제 내역 확인하기
      </Link>
    </div>
  )
}

export default function PayFailPage() {
  return (
    <Suspense fallback={
      <div className="palace-page palace-pay min-h-screen bg-[#0c1119] flex items-center justify-center text-[#a7b3c3] text-sm">
        불러오는 중...
      </div>
    }>
      <PayFailContent />
    </Suspense>
  )
}
