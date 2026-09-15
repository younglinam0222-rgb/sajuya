'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {CHAT_GUIDES} from '@/lib/chat-flow'
import './conversation-banner.css'

export default function ConversationBanner(){
 const [current,setCurrent]=useState(0),[paused,setPaused]=useState(false),[focused,setFocused]=useState(false),[hovered,setHovered]=useState(false),[visible,setVisible]=useState(true),[inView,setInView]=useState(true),[reduced,setReduced]=useState(false)
 const root=useRef<HTMLElement>(null),guide=CHAT_GUIDES[current]
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)')
  const motion=()=>setReduced(media.matches),visibility=()=>setVisible(!document.hidden)
  motion();visibility();media.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility)
  const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting));if(root.current)observer.observe(root.current)
  return()=>{media.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);observer.disconnect()}
 },[])
 const playing=!paused&&!focused&&!hovered&&!reduced&&visible&&inView
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setCurrent(n=>(n+1)%CHAT_GUIDES.length),5000);return()=>clearTimeout(timer)},[playing,current])
 return <section ref={root} className="conversation-banner" aria-label="1:1 상담 안내자" aria-roledescription="캐러셀" data-playing={playing} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocused(false)}}>
  <Link className="conversation-banner-link" href={'/chat?guide='+guide.id} aria-label={guide.name+'와 1:1 상담하기'}>
   <div className="conversation-banner-portraits" aria-hidden="true">{CHAT_GUIDES.map((g,i)=><img key={g.id} src={'/characters/'+g.id+'.png'} alt="" className={i===current?'is-current':''}/>)}</div>
   <div className="conversation-banner-copy"><h2>마음에 남은 고민, 1:1 대화</h2><p>직접 질문하기 · 첫 답변 1회 무료</p><span>{guide.name}<b aria-hidden="true">상담하기 →</b></span></div>
  </Link>
  <div className="conversation-banner-controls"><span aria-live="off">{current+1} / {CHAT_GUIDES.length}</span><button type="button" aria-label="이전 상담 안내자" onClick={()=>setCurrent(n=>(n+CHAT_GUIDES.length-1)%CHAT_GUIDES.length)}>‹</button><button type="button" aria-label="다음 상담 안내자" onClick={()=>setCurrent(n=>(n+1)%CHAT_GUIDES.length)}>›</button>{!reduced&&<button type="button" className="conversation-banner-pause" aria-pressed={paused} onClick={()=>setPaused(n=>!n)}>{paused?'자동 전환 시작':'자동 전환 멈춤'}</button>}</div>
 </section>
}
