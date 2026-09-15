import {ReturnToReading,TrustNote} from './ReadingJourney'
import ConversationBanner from '../app/components/conversation/ConversationBanner'
import {ReviewsPreview} from './ReviewsBoard'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {useSession,signIn} from 'next-auth/react'
import Icon from '@/components/palace/Icon'
import YeopjeunShop from '@/app/components/YeopjeunShop'
import {ResultProof,ProductConditions,ServiceFAQ,guideReasons} from './ConversionContent'
import {trackFunnel} from './funnel'
import {NYANG_PRICE} from '@/lib/pricing'
import {CHAR_IMG,CHARACTERS,BANNERS,MENUS} from './concept-data'

const icons:Record<string,string>={'/saju':'moon','/gunghap':'heart','/daeun':'wave','/taekil':'calendar','/yearly':'calendar','/daily':'sun'}
const subjects=['재물과 직업','타고난 나의 기질','사랑과 관계','인생의 큰 흐름']
const descriptions=['돈과 일 앞에서, 현실적인 한마디.','나를 이해하는 가장 오래된 방법.','알 듯 말 듯한 두 사람의 마음.','지금의 나를 더 넓게 바라보는 시간.']
export default function HomeConcept({variant}:{variant:'a'|'b'}){
 const [current,setCurrent]=useState(0),[login,setLogin]=useState(false),[shop,setShop]=useState(false),[agreed,setAgreed]=useState(false)
 const [paused,setPaused]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches),[focusPaused,setFocusPaused]=useState(false),[visible,setVisible]=useState(true)
 const [cycle,setCycle]=useState(0)
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const motion=()=>{if(media.matches)setPaused(true)};const visibility=()=>setVisible(!document.hidden);motion();visibility();media.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility)}},[])
 const playing=!paused&&!focusPaused&&visible&&!login&&!shop
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setCurrent(c=>(c+1)%BANNERS.length),6000);return()=>window.clearTimeout(timer)},[playing,current,cycle])
 const choose=(index:number)=>{setCurrent(index);setCycle(n=>n+1)}
 const {data:session}=useSession();const dialog=useRef<HTMLDialogElement>(null)
 const balance=(session?.user as {yeobjeun_balance?:number})?.yeobjeun_balance??0
 useEffect(()=>{if(login)dialog.current?.showModal();else dialog.current?.close()},[login])
 useEffect(()=>{if(session)setLogin(false)},[session])
 const charge=()=>session?setShop(true):setLogin(true)
 return <div className={`direction direction-${variant}`}>
  <header className="sg-header"><Link href="/" className="sg-brand" aria-label="사주궁 홈">사주궁<span>四柱宮</span></Link><div className="sg-header-actions"><Link className="sg-reviews-link" href="/reviews">후기 게시판</Link>{session?<button onClick={charge}>{balance}냥 · 충전</button>:<button onClick={()=>setLogin(true)}>로그인</button>}</div></header>
  <main className="sg-main">
   <section data-autoplay-state={playing?'playing':paused?'paused':focusPaused?'focus':!visible?'hidden':'dialog'} className="sg-hero" aria-label="추천 운세" aria-roledescription="캐러셀" onFocusCapture={e=>{if(!(e.target as HTMLElement).closest('.sg-playback')&&(e.target as HTMLElement).matches(':focus-visible'))setFocusPaused(true)}} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocusPaused(false)}}>
    <div className="sg-slides" aria-live="off">{BANNERS.map(slide=>{const guide=CHARACTERS.find(c=>c.id===slide.charId)!;const active=slide.id===current;return <div className={`sg-hero-body ${active?'is-current':''}`} key={slide.id} aria-hidden={!active} inert={!active}>
     <div className="sg-hero-copy"><p className="sg-eyebrow">{guide.name}의 {guide.tag}</p><h1>{slide.title.split('\n').map(t=><span key={t}>{t}</span>)}</h1><p className="sg-hero-desc">{slide.desc}</p><Link href={slide.href} className="sg-primary" onClick={()=>trackFunnel('hero_start',slide.href.slice(1))}>{slide.cta.replace(' →','')}<Icon name="arrow" size={20}/></Link><p className="sg-hero-price">{slide.href==='/saju'?'12개 해석 · 1냥 / 1,900원':slide.href==='/gunghap'?'계산 검증 중 · 결과 예시 확인':slide.href==='/daily'?'계정당 최초 1회 무료':'이용권 준비 중 · 결과 예시 확인'}</p><a className="cv-hero-example" href="#result-preview" onClick={()=>trackFunnel('result_example_open','home_anchor')}>결과 예시 먼저 보기</a></div>
     <figure className="sg-hero-portrait"><img src={CHAR_IMG[slide.charId]} alt={guide.name} fetchPriority={slide.id===0?'high':'auto'}/><figcaption>{guide.name}<span>{['재물과 직업','사랑과 관계','인생의 흐름','오늘의 기운'][slide.id]}</span></figcaption></figure>
    </div>})}</div>
    <div className="sg-hero-controls"><div className="sg-slide-tabs" aria-label="추천 운세 선택">{BANNERS.map((item,i)=><button key={item.id} aria-label={`${i+1}번 추천: ${item.title.replace('\n',' ')}`} aria-pressed={i===current} onClick={()=>choose(i)}><span>{String(i+1).padStart(2,'0')}</span></button>)}</div><div className="sg-arrows"><button aria-label="이전 배너" onClick={()=>choose((current+3)%4)}><Icon name="left" size={19}/></button><button aria-label="다음 배너" onClick={()=>choose((current+1)%4)}><Icon name="right" size={19}/></button></div></div>
    <div className="sg-autoplay-row"><span><b>{String(current+1).padStart(2,'0')} / {String(BANNERS.length).padStart(2,'0')}</b><span>{paused?'자동 넘김 멈춤':focusPaused?'읽는 동안 잠시 멈춤':'6초마다 사진 자동 넘김'}</span></span><button className="sg-playback" aria-label={paused?'사진 자동 넘김 시작':'사진 자동 넘김 일시 정지'} onClick={()=>{setPaused(v=>!v);setFocusPaused(false)}}><span aria-hidden="true">{paused?'▷':'Ⅱ'}</span>{paused?'재생':'일시 정지'}</button></div>
   </section>
   <ReturnToReading/><div className="cv-value-strip"><b>한 번의 사주 풀이, 이런 이야기까지.</b><span>12개 해석 · 주의할 점 · 인생 전략 · 선택질문</span><small>입력한 사주 정보를 바탕으로 AI가 작성하는 해석</small></div>
   <Link onClick={()=>trackFunnel('daily_start','daily')} className="sg-daily" href="/daily"><Icon name="sun" size={28}/><div><h2>일일운세 첫 1회 무료</h2><p>계정당 최초 1회 · 결과 재열람 무료</p></div><span>체험하기<Icon name="arrow" size={18}/></span></Link>
   <ConversationBanner/>
   <ReviewsPreview/>
   <section className="sg-section sg-guides"><div className="sg-heading"><h2>어떤 이야기가 필요한가요?<span>04</span></h2><Link href="/characters">전체보기<Icon name="arrow" size={16}/></Link></div><div className="sg-guide-grid">{CHARACTERS.map((c,i)=><Link href={`/characters/${c.id}`} className="sg-guide" key={c.id} onClick={()=>trackFunnel('guide_open',c.id)}><div className="sg-guide-image"><img src={CHAR_IMG[c.id]} alt={c.name} loading="lazy"/><span aria-hidden="true">{['財','命','緣','運'][i]}</span></div><div className="sg-guide-copy"><p>{subjects[i]}</p><h3>{c.name}</h3><span className="sg-guide-description">{guideReasons[i]}</span></div></Link>)}</div></section>
   <section className="sg-section sg-menus"><div className="sg-heading"><h2>내 고민에 맞는 운세</h2><button onClick={charge}>엽전 충전<Icon name="coin" size={17}/></button></div><p className="sg-group">프리미엄</p><div className="sg-paid">{MENUS.filter(m=>m.paid).map((m,i)=><Link key={m.href} href={m.href} className="sg-menu" onClick={()=>trackFunnel('product_open',m.href.slice(1))}><span className="sg-menu-number">0{i+1}</span><div><h3>{m.label}</h3><p>{m.desc}</p></div><span className="sg-menu-price">{m.href==='/gunghap'?'검증 중':<>{NYANG_PRICE.toLocaleString()}원 <small>1냥</small></>}</span><Icon name="arrow" size={21}/></Link>)}</div><p className="sg-group">그 밖의 운세</p><div className="sg-free">{MENUS.filter(m=>!m.paid).map(m=><Link key={m.href} href={m.href} className="sg-menu"><Icon name={icons[m.href]} size={26}/><div><h3>{m.label}</h3><p>{m.desc}</p></div><span className="sg-menu-price">{m.badge}</span></Link>)}</div><ProductConditions/></section>
   <ResultProof/>
   <TrustNote/><ServiceFAQ/>
   {!session&&<section className="sg-welcome"><p>처음 만나는 사주궁</p><h2>처음이라면<br/>일일운세 1회 무료</h2><span>가입 계정당 한 번, 부담 없이 만나보세요.</span><button className="sg-primary" onClick={()=>setLogin(true)}>첫 무료 운세 시작하기<Icon name="arrow" size={20}/></button></section>}
   <section className="sg-currency"><div><Icon name="coin" size={24}/><b>1냥</b><span>{NYANG_PRICE.toLocaleString()}원</span></div><p>충전하기 전,<br/>받을 결과부터 확인하세요</p><button onClick={charge}>충전하기<Icon name="arrow" size={18}/></button></section>
   <footer className="sg-footer"><Link className="sg-brand" href="/">사주궁<span>四柱宮</span></Link><div className="sg-footer-links"><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보처리방침</Link><Link href="/refund">환불정책</Link><a href="mailto:sajuya.help@gmail.com">고객센터</a></div><p>본 서비스는 사주명리학 기반 엔터테인먼트 콘텐츠입니다.<br/>의료·법률·재정 판단을 대체하지 않으며,<br/>만 14세 이상 이용 가능합니다.</p><p>© {new Date().getFullYear()} 사주궁 · sajuya.help@gmail.com</p></footer>
  </main>
  <nav className="sg-bottom" aria-label="주요 메뉴">{[{href:'/',label:'홈',icon:'home'},{href:'/saju',label:'사주',icon:'moon'},{href:'/chat',label:'1:1 대화',icon:'chat'},{href:'/daily',label:'일일운세',icon:'sun'},{href:'/storage',label:'보관함',icon:'book'},{href:'/characters',label:'신령',icon:'eye'}].map(n=><Link key={n.href} href={n.href} aria-current={n.href==='/'?'page':undefined}><Icon name={n.icon} size={22}/><span>{n.label}</span></Link>)}</nav>
  {shop&&<YeopjeunShop onClose={()=>setShop(false)} currentBalance={balance}/>}
  <dialog className="sg-login" ref={dialog} onCancel={()=>setLogin(false)} aria-labelledby="sg-login-title"><button className="sg-close" aria-label="로그인 닫기" onClick={()=>setLogin(false)}>×</button><p>처음 만나는 사주궁</p><h2 id="sg-login-title">일일운세 첫 1회 무료</h2><p>계정당 최초 1회 · 날짜가 바뀌어도 추가 지급되지 않아요.</p><div className="sg-login-options">{['kakao','google','naver'].map((provider,i)=><button key={provider} disabled={!agreed} onClick={()=>signIn(provider)}>{['카카오','구글','네이버'][i]}로 계속하기</button>)}</div><label><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span><Link href="/terms">이용약관</Link> 및 <Link href="/privacy">개인정보처리방침</Link>에 동의합니다 (필수)</span></label></dialog>
 </div>
}
