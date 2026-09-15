'use client'
import { useParams } from 'next/navigation'
import { useEffect,useState } from 'react'
import Link from 'next/link'
export default function SharedReading(){
 const {token}=useParams();const [titles,setTitles]=useState<{title:string;content:string}[]>([]),[error,setError]=useState('')
 useEffect(()=>{fetch('/api/share/'+token).then(async r=>{if(!r.ok)throw new Error('공유가 종료됐거나 존재하지 않는 결과입니다.');return r.json()}).then(d=>setTitles(d.titles)).catch(e=>setError(e.message))},[token])
 return <main className="palace-page min-h-screen text-white max-w-[430px] mx-auto p-5"><p className="text-amber-300 my-4">사주궁 · 공유받은 해석</p><p role="alert">{error}</p>{!titles.length&&!error&&<p>불러오는 중…</p>}{titles.map((t,i)=><article key={i} className="border border-amber-900/50 rounded-2xl p-5 my-4"><h2 className="font-bold text-amber-100 mb-3">{t.title}</h2><p className="whitespace-pre-wrap leading-8">{t.content}</p></article>)}<Link href="/" className="block p-4 text-center rounded-xl bg-amber-800">내 사주도 알아보기</Link></main>
}
