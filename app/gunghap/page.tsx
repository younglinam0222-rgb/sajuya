'use client'
import Link from 'next/link'

export default function GunghapPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto pb-8 flex flex-col items-center justify-center px-4">
      <Link href="/" className="text-xs text-[#555] mb-8 self-start">← 홈으로</Link>
      <div className="text-6xl mb-4">💕</div>
      <div className="text-2xl font-black mb-2">궁합 해설</div>
      <div className="text-sm text-[#555] text-center mb-6">구미호 선생이 두 사람의 사주를 꿰뚫어봐줘요<br/>곧 오픈 예정이에요!</div>
      <div className="px-4 py-2 rounded-full text-xs font-bold" style={{background:'rgba(124,58,237,0.15)',color:'#a78bfa',border:'1px solid rgba(124,58,237,0.3)'}}>
        🚧 준비 중
      </div>
    </div>
  )
}
