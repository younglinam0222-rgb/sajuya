'use client'
import Link from 'next/link'

export default function StoragePage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto pb-8">
      <div className="bg-[#111] px-4 py-3 flex items-center gap-3 border-b border-[#1a1a1a]">
        <Link href="/" className="text-lg text-[#888]">←</Link>
        <span className="font-black text-purple-400">사주야</span>
      </div>
      <div className="px-4 py-6">
        <div className="text-2xl font-black mb-1">📦 보관함</div>
        <div className="text-sm text-[#666] mb-6">저장한 풀이를 모아볼 수 있어요</div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4 opacity-30">📭</div>
          <div className="text-sm font-bold text-[#444] mb-2">저장된 풀이가 없어요</div>
          <div className="text-xs text-[#333] mb-8">사주 풀이 후 저장하면 여기서 확인할 수 있어요</div>
          <Link href="/saju" className="px-6 py-3 rounded-2xl font-bold text-sm"
            style={{ background: '#7c3aed', color: '#fff' }}>
            첫 풀이 받기
          </Link>
        </div>
      </div>
    </div>
  )
}
