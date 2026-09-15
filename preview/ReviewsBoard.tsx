import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {v4 as uuid} from 'uuid'
import {useSession,signIn} from './shims/auth'
import {trackFunnel} from './funnel'
import './reviews.css'

type Review={id:string;nickname:string;product:string;rating:number;body:string;created:string}
const key='sajugung-review-example-v1'
const products=['사주 풀이','일일운세','궁합']
function readReviews():Review[]{try{const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a.filter(r=>typeof r?.id==='string'&&typeof r?.body==='string'&&r.body.length<=400&&typeof r?.nickname==='string'&&Number.isInteger(r.rating)&&r.rating>=1&&r.rating<=5&&products.includes(r.product)&&Number.isFinite(Date.parse(r.created))).slice(0,200):[]}catch{return []}}
function useReviews(){
 const [reviews,setReviews]=useState<Review[]>(readReviews),[newCount,setNewCount]=useState(0)
 const latest=useRef(reviews)
 useEffect(()=>{
  const refresh=(event:Event)=>{
   if(event instanceof StorageEvent&&event.key!==null&&event.key!==key)return
   const next=readReviews()
   setNewCount(next.filter(r=>!latest.current.some(p=>p.id===r.id)).length)
   latest.current=next
   setReviews(next)
  }
  window.addEventListener('storage',refresh)
  window.addEventListener('sajugung-reviews',refresh)
  return()=>{window.removeEventListener('storage',refresh);window.removeEventListener('sajugung-reviews',refresh)}
 },[])
 return{reviews,newCount}
}
function writeReviews(reviews:Review[]){localStorage.setItem(key,JSON.stringify(reviews.slice(0,200)));window.dispatchEvent(new Event('sajugung-reviews'))}
function ReviewCard({review,remove}:{review:Review;remove?:()=>void}){return <article className="rv-card"><header><b>{review.nickname}</b><span>샘플 후기</span></header><div className="rv-meta"><span aria-label={`${review.rating}점, 5점 만점`}>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span><small>{review.product} · {new Date(review.created).toLocaleDateString('ko-KR')}</small></div><p>{review.body}</p>{remove&&<button className="rv-remove" onClick={remove}>내 예시 후기 삭제</button>}</article>}
export function ReviewsPreview(){const {reviews}=useReviews();return <section className="sg-section rv-preview" id="reviews-preview" aria-labelledby="rv-preview-title"><div className="sg-heading"><h2 id="rv-preview-title">후기 게시판</h2><Link href="/reviews">전체 후기 보기 →</Link></div><p className="rv-intro">사주궁을 읽은 뒤의 이야기 · 400자 이내</p>{reviews.length?<><p className="rv-demo-caption">이 브라우저에서 작성한 샘플 후기입니다.</p>{reviews.slice(0,2).map(r=><ReviewCard key={r.id} review={r}/>)}</>:<div className="rv-empty-inline"><p>첫 번째 이야기를 기다립니다.</p><span>어떤 부분이 도움 됐는지, 무엇이 아쉬웠는지 남겨주세요.</span><Link href="/reviews">후기 작성하기 →</Link></div>}</section>}
export function ReviewsBoard(){const {data:session}=useSession();const {reviews,newCount}=useReviews();const [nickname,setNickname]=useState(''),[product,setProduct]=useState(products[0]),[rating,setRating]=useState(0),[body,setBody]=useState(''),[notice,setNotice]=useState(''),[error,setError]=useState(''),[limit,setLimit]=useState(10),[deleted,setDeleted]=useState<Review|null>(null)
 function submit(e:React.FormEvent){e.preventDefault();if(!session||!nickname.trim()||!body.trim()||body.length>400||!rating)return;setError('');setNotice('');try{const old=readReviews();if(old.some(r=>r.nickname===nickname.trim()&&r.body===body.trim()&&r.product===product)){setError('같은 내용의 후기가 이미 등록되어 있어요.');return}const r={id:uuid(),nickname:nickname.trim(),product,rating,body:body.trim(),created:new Date().toISOString()};writeReviews([r,...old]);setBody('');setRating(0);setNotice('후기가 등록됐어요. 아래 최신 후기에서 확인할 수 있어요.');trackFunnel('review_submit','sample')}catch{setError('등록하지 못했어요. 입력한 내용은 유지했습니다. 다시 시도해주세요.')}}
 function remove(r:Review){try{writeReviews(readReviews().filter(v=>v.id!==r.id));setDeleted(r);setNotice('예시 후기를 삭제했어요.');setError('')}catch{setError('삭제하지 못했어요. 다시 시도해주세요.')}}
 return <main className="jr-page rv-board"><header><Link href="/">← 사주궁</Link><span>후기 게시판</span></header><p className="jr-eyebrow">사주궁을 읽은 뒤</p><h1>어떤 이야기로 남았나요?</h1><p>도움 된 점도, 아쉬웠던 점도 솔직하게.<br/>400자 안에 경험을 남겨주세요.</p><div className="rv-demo-note">비공개 게시판 체험 · 실제 고객 후기가 아닙니다.<br/>이 브라우저의 같은 시안 탭에는 새 글이 자동 반영됩니다. 실제 고객 간 실시간 연결은 운영 반영 전 적용합니다.</div><form className="rv-form" onSubmit={submit} aria-label="후기 작성"><h2>후기 남기기</h2>{!session&&<div className="rv-login"><p>예시 로그인 후 작성할 수 있어요.</p><button type="button" onClick={()=>signIn('kakao')}>카카오 예시 로그인</button></div>}<label className="jr-label">닉네임<input maxLength={12} value={nickname} onChange={e=>setNickname(e.target.value.slice(0,12))} placeholder="공개할 닉네임 · 12자 이내" required disabled={!session}/></label><label className="jr-label">이용한 운세<select value={product} onChange={e=>setProduct(e.target.value)} disabled={!session}>{products.map(p=><option key={p}>{p}</option>)}</select></label><fieldset disabled={!session}><legend>얼마나 만족하셨나요?</legend><div className="rv-rating">{[1,2,3,4,5].map(n=><label key={n}><input type="radio" name="rating" value={n} checked={rating===n} onChange={()=>setRating(n)} required/><span>{n}점</span></label>)}</div></fieldset><label className="jr-label" htmlFor="review-body">후기 내용</label><textarea id="review-body" aria-describedby="review-count review-guidance" value={body} onChange={e=>setBody(e.target.value.slice(0,400))} maxLength={400} disabled={!session} required placeholder="어떤 해석이 기억에 남았나요? 기대와 달랐던 부분도 알려주세요."/><div id="review-count" className="rv-count" aria-live="polite">{body.length} / 400자</div><p id="review-guidance" className="jr-local-note">이름·생년월일·연락처 등 개인정보는 적지 마세요. 사진 첨부 없이 텍스트만 등록합니다.</p><button className="rv-submit" disabled={!session||!nickname.trim()||!rating||!body.trim()||body.length>400}>후기 등록하기</button>{error&&<p className="jr-status" role="alert">{error}</p>}{notice&&<p className="jr-status" role="status">{notice}</p>}{deleted&&<button type="button" onClick={()=>{try{writeReviews([deleted,...readReviews()].sort((a,b)=>Date.parse(b.created)-Date.parse(a.created)));setDeleted(null);setNotice('삭제한 후기를 복원했어요.')}catch{setError('복원하지 못했어요.')}}}>삭제 되돌리기</button>}</form><section aria-labelledby="rv-latest"><div className="rv-list-title"><h2 id="rv-latest">최신 후기 <span>{reviews.length}</span></h2><span>최신순 · 자동 반영</span></div>{newCount>0&&<p className="rv-live" role="status">새 후기 {newCount}개가 반영됐어요.</p>}{reviews.length?reviews.slice(0,limit).map(r=><ReviewCard key={r.id} review={r} remove={session?()=>remove(r):undefined}/>):<div className="rv-empty-inline"><p>첫 후기를 기다리고 있어요.</p><span>작성한 예시 후기는 여기에 표시됩니다.</span></div>}{reviews.length>limit&&<button onClick={()=>setLimit(n=>n+10)}>후기 10개 더 보기</button>}</section><p className="jr-local-note">구매 확인 표시는 이 시안에서 임의로 붙이지 않습니다. 실제 운영에서는 본인 구매·이용 기록을 서버에서 확인한 후기만 구매 확인 대상으로 표시합니다.</p></main>
}
