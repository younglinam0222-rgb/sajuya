'use client'
import { useSession,signIn } from 'next-auth/react'
import Link from 'next/link'
export default function AccessNotice({daily=false}:{daily?:boolean}) {
 const {status}=useSession()
 return <aside className="mx-4 my-4 p-4 border border-amber-800/60 rounded-xl text-sm text-amber-100">
 <p>{daily?'계정당 최초 1회 무료 · 저장된 결과 다시보기 무료':'판결문 12개와 인생 전략 무료 · 저장된 결과 다시보기 무료'}</p>
 {!daily && <p className="mt-2 text-xs">로그인 없이 받은 결과는 이 브라우저의 보호된 쿠키로만 다시 볼 수 있어요. 쿠키를 지우거나 90일이 지나면 접근할 수 없습니다. <Link href="/privacy" className="underline">개인정보처리방침</Link></p>}
 {daily && status==='unauthenticated' && <button onClick={()=>signIn(undefined,{callbackUrl:window.location.pathname+window.location.search})} className="underline">로그인하기</button>}
 </aside>
}
