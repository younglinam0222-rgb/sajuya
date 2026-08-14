'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function PayFailContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') || '결제가 취소되었거나 실패했어요.'
  const orderId = searchParams.get('orderId') || ''
  const shareId = orderId.split('_')[1]

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
      <div className="text-5xl mb-4">😶</div>
      <p className="text-lg font-black mb-2">결제가 완료되지 않았어요</p>
      <p className="text-sm text-gray-500 mb-6">{message}</p>
      <Link href={shareId ? `/result/${shareId}` : '/saju'}
        className="px-6 py-3 rounded-2xl font-bold text-sm text-white" style={{ background: '#7c3aed' }}>
        {shareId ? '결과로 돌아가기' : '사주 풀이로 돌아가기'}
      </Link>
    </div>
  )
}

export default function PayFailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-500 text-sm">
        불러오는 중...
      </div>
    }>
      <PayFailContent />
    </Suspense>
  )
}
