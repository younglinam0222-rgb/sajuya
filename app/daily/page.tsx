'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function DailyPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  const getDaily = async () => {
    setLoading(true)
    const today = new Date().toLocaleDateString('ko-KR')
    const res = await fetch('/api/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today })
    })
    const data = await res.json()
    setResult(data.result)
    setLoading(false)
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto pb-8">
      <div className="px-4 py-6">
        <Link href="/" className="text-xs text-[#555] mb-6 block">← 홈으로</Link>
        <div className="text-2xl font-black mb-1">⭐ 일일 운세</div>
        <div className="text-sm text-[#666] mb-6">오늘 하루 기운을 무료로 확인해요</div>
        {!result ? (
          <button onClick={getDaily} disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-base"
            style={{background:'linear-gradient(135deg,#7c3aed,#a78bfa)',color:'#fff'}}>
            {loading ? '🔮 보는 중...' : '오늘 운세 보기 (무료)'}
          </button>
        ) : (
          <div className="rounded-2xl p-5" style={{background:'#111',border:'1px solid #222'}}>
            <p className="text-sm leading-[1.9] text-[#ccc] whitespace-pre-line">{result}</p>
            <button onClick={() => setResult('')} className="mt-4 text-xs text-[#555]">다시 보기</button>
          </div>
        )}
      </div>
    </div>
  )
}
