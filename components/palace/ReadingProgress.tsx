'use client'
import {useEffect,useState} from 'react'
import Icon from './Icon'
export default function ReadingProgress({name='',character='근본도령',image='/characters/doryeong.png',phase='calculating',count=0,compact=false}:{name?:string;character?:string;image?:string;phase?:'calculating'|'interpreting'|'saving';count?:number;compact?:boolean}){
 const [seconds,setSeconds]=useState(0)
 useEffect(()=>{const started=Date.now();const t=setInterval(()=>setSeconds(Math.floor((Date.now()-started)/1000)),1000);return()=>clearInterval(t)},[])
 const delayed=seconds>60
 const title=phase==='saving'?'완성된 이야기를 보관하고 있어요':phase==='interpreting'?'당신의 이야기를 풀고 있어요':'사주의 바탕을 살피고 있어요'
 return <section className={`reading-progress ${compact?'is-compact':''}`} aria-label="해석 진행 상황">
  <div className="reading-aura" aria-hidden="true"/><div className="reading-avatar"><img src={image} alt={character}/></div>
  <span className="palace-kicker">운명을 읽는 시간</span><h2>{title}</h2><p>{name?`${name}님, `:''}{character}의 해석을 준비하고 있어요.</p>
  <div className="reading-status" role="status" aria-live="polite">{phase==='saving'?'해석 완료 · 저장 응답 대기':phase==='interpreting'?`12개 해석 중 ${Math.min(count,12)}개 도착`:'입력 확인 완료 · 사주 분석 중'}</div>
  <ol className="reading-steps"><li className="done"><Icon name="check" size={14}/>입력 확인</li><li className={phase==='saving'?'done':'current'}><Icon name={phase==='saving'?'check':'spark'} size={14}/>사주 해석</li><li className={phase==='saving'?'current':''}><Icon name="book" size={14}/>결과 정리</li></ol>
  <p className="reading-estimate">{delayed?'예상보다 시간이 걸리고 있어요. 응답이 도착하면 바로 보여드릴게요.':'예상 1분 이내 · 먼저 도착한 해석부터 보여드려요.'}</p>
 </section>
}
