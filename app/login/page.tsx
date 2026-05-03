'use client'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto flex flex-col">
      <div className="bg-[#111] px-4 py-3 flex items-center gap-3 border-b border-[#1a1a1a]">
        <Link href="/" className="text-lg">←</Link>
        <span className="font-black text-purple-400">로그인</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="text-5xl mb-5">🔮</div>
        <div className="text-xl font-black mb-2">로그인하고 사주 저장하기</div>
        <div className="text-sm text-[#666] text-center mb-8 leading-relaxed">
          로그인하면 내 사주를 저장하고<br/>언제든 다시 볼 수 있어요!<br/>
          <span className="text-yellow-400 font-bold">가입 즉시 🪙 1엽전 지급!</span>
        </div>

        <div className="w-full space-y-3">
          <button onClick={() => signIn('kakao', { callbackUrl: '/' })}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-98"
            style={{background:'#fee500',color:'#3c1e1e'}}>
            <span className="text-xl">💬</span> 카카오로 시작하기
          </button>
          <button onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-98"
            style={{background:'#fff',color:'#333',border:'1px solid #e5e7eb'}}>
            <span style={{fontSize:'18px',fontWeight:'900',color:'#4285F4'}}>G</span> 구글로 시작하기
          </button>
          <button onClick={() => signIn('naver', { callbackUrl: '/' })}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-98"
            style={{background:'#03c75a',color:'#fff'}}>
            <span className="text-xl font-black">N</span> 네이버로 시작하기
          </button>
        </div>

        <div className="mt-6 text-xs text-[#444] text-center leading-relaxed">
          가입 시 이용약관 및 개인정보처리방침에 동의합니다
        </div>
      </div>
    </div>
  )
}
