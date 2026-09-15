'use client'
import { useEffect,useState } from 'react'
import { useSession,signIn } from 'next-auth/react'
import YeopjeunShop from './YeopjeunShop'
export default function AccessNotice({daily=false}:{daily?:boolean}) {
 const {data:session,status}=useSession(),[open,setOpen]=useState(false),[error,setError]=useState('')
 useEffect(()=>{const saved=sessionStorage.getItem('reading-error');if(saved){setError(saved);sessionStorage.removeItem('reading-error')}const fn=(e:Event)=>setError((e as CustomEvent<string>).detail);window.addEventListener('reading-error',fn);return()=>window.removeEventListener('reading-error',fn)},[])
 return <aside className="mx-4 my-4 p-4 border border-amber-800/60 rounded-xl text-sm text-amber-100">
 <p>{daily?'계정당 최초 1회 무료 · 저장된 결과 다시보기 무료':'새 풀이 1회 1냥 · 동일한 입력의 저장 결과 다시보기 무료'}</p>
 <p role="alert" className="text-red-300 my-2">{error}</p>
 {status!=='authenticated'?<button onClick={()=>signIn()} className="underline">로그인하기</button>:!daily&&<button onClick={()=>setOpen(true)} className="underline">엽전 충전하기</button>}
 {open&&<YeopjeunShop onClose={()=>setOpen(false)} currentBalance={(session?.user as {yeobjeun_balance?:number})?.yeobjeun_balance??0}/>}
 </aside>
}
