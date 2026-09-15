'use client'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { contentNoticeHref, safeNextPath } from '@/lib/safeNextPath'

export default function LoginPage() {
  function login(provider: 'kakao' | 'google' | 'naver') {
    const value = new URLSearchParams(window.location.search).get('callbackUrl')
    const next = safeNextPath(value, '/')
    void signIn(provider, { callbackUrl: contentNoticeHref(next) })
  }
  return (
    <div className="palace-page palace-login bg-[#0c1119] min-h-screen text-white max-w-[430px] mx-auto flex flex-col">
      <div className="bg-[#17202c] px-4 py-3 flex items-center gap-3 border-b border-[#344151]">
        <Link href="/" className="text-lg">←</Link>
        <span className="font-semibold text-[#c6a66d]">로그인</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="[font-family:var(--palace-serif)] mb-6 text-3xl tracking-[.12em] text-[#c6a66d]">사주궁</div>
        <h1 className="[font-family:var(--palace-serif)] text-2xl font-medium mb-3">로그인하고 사주 저장하기</h1>
        <div className="text-sm text-[#a7b3c3] text-center mb-8 leading-relaxed">
          로그인하면 내 사주를 저장하고<br/>언제든 다시 볼 수 있어요!<br/>
          <span className="text-[#d4bc92] font-bold">계정당 첫 일일운세 1회 무료</span>
        </div>

        <div className="w-full space-y-3">
          <button onClick={() => login('kakao')}
            className="w-full py-4 rounded-lg font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-98"
            style={{background:'#fee500',color:'#3c1e1e'}}>
            <span className="text-xl">💬</span> 카카오로 시작하기
          </button>
          <button onClick={() => login('google')}
            className="w-full py-4 rounded-lg font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-98"
            style={{background:'#fff',color:'#333',border:'1px solid #e5e7eb'}}>
            <span style={{fontSize:'18px',fontWeight:'900',color:'#4285F4'}}>G</span> 구글로 시작하기
          </button>
          <button onClick={() => login('naver')}
            className="w-full py-4 rounded-lg font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-98"
            style={{background:'#03c75a',color:'#fff'}}>
            <span className="text-xl font-semibold">N</span> 네이버로 시작하기
          </button>
        </div>

        <div className="mt-6 text-xs text-[#a7b3c3] text-center leading-relaxed">
          가입 시 이용약관 및 개인정보처리방침에 동의합니다
        </div>
      </div>
    </div>
  )
}
