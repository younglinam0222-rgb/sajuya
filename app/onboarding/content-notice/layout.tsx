import { Suspense } from 'react'

export default function ContentNoticeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] text-gray-400 text-sm flex items-center justify-center">확인 단계를 준비하고 있어요...</div>}>
      {children}
    </Suspense>
  )
}
