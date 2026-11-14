'use client'
import { useSession,signIn } from 'next-auth/react'
export default function AccessNotice({daily=false}:{daily?:boolean}) {
 const {status}=useSession()
 return <aside className="mx-4 my-4 p-4 border border-amber-800/60 rounded-xl text-sm text-amber-100">
 <p>{daily?'계정당 최초 1회 무료 · 저장된 결과 다시보기 무료':'현재 사주풀이 전체 무료 · 동일한 입력의 저장 결과 다시보기 무료'}</p>
 {status==='loading'||status==='authenticated'?null:<button onClick={()=>signIn(undefined,{callbackUrl:window.location.pathname+window.location.search})} className="underline">로그인하기</button>}
 </aside>
}
