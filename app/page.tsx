'use client'
import {useSession,signIn} from 'next-auth/react'
import Link from 'next/link'
import {useEffect,useRef,useState} from 'react'
import YeopjeunShop from '@/app/components/YeopjeunShop'
import ConversationBanner from '@/app/components/conversation/ConversationBanner'
import Icon from '@/components/palace/Icon'
const CHAR_IMG: Record<string, string> = {
  baekhalma: '/characters/baekhalma.png',
  doRyeong:  '/characters/doryeong.png',
  gumiho:    '/characters/gumiho.png',
  sinRyeong: '/characters/sinryeong.png',
}

const CHARACTERS = [
  { id: 'baekhalma', name: '건물주 백할매', tag: '재물·직업', color: '#C6A66D', bg: 'linear-gradient(135deg, #1a1025, #2d1b69)' },
  { id: 'doRyeong',  name: '근본도령',      tag: '종합 사주', color: '#80A5C4', bg: 'linear-gradient(135deg, #0f1525, #1e3a8a)' },
  { id: 'gumiho',    name: '구미호 선생',   tag: '연애·궁합', color: '#C18C9D', bg: 'linear-gradient(135deg, #1a0f18, #831843)' },
  { id: 'sinRyeong', name: '무등산 신령님', tag: '대운·인생', color: '#8BAB98', bg: 'linear-gradient(135deg, #0a1a14, #065f46)' },
]

// ─── 캐러셀 배너 데이터 ───────────────────────────────
const BANNERS = [
  {
    id: 0,
    tag: '✦ 건물주 백할매 특급',
    title: '돈 버는 사주\n따로 있다',
    desc: '재물운, 직업운, 지금 확인해봐',
    href: '/saju',
    cta: '사주 풀이 보기 →',
    charId: 'baekhalma',
    bg: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b69 60%, #1a0a2e 100%)',
    accent: '#C6A66D',
    emoji: '💜',
  },
  {
    id: 1,
    tag: '✦ 구미호 선생 특급',
    title: '궁합 99점\n짝꿍 찾기',
    desc: '우리 사이, 진짜 되는 사인지',
    href: '/gunghap',
    cta: '궁합 보러가기 →',
    charId: 'gumiho',
    bg: 'linear-gradient(135deg, #1a0f18 0%, #831843 60%, #1a0f18 100%)',
    accent: '#C18C9D',
    emoji: '💕',
  },
  {
    id: 2,
    tag: '✦ 무등산 신령님 특급',
    title: '지금 내 대운\n어디쯤 왔나',
    desc: '10년 주기 큰 흐름 해설',
    href: '/daeun',
    cta: '대운 확인하기 →',
    charId: 'sinRyeong',
    bg: 'linear-gradient(135deg, #0a1a14 0%, #065f46 60%, #0a1a14 100%)',
    accent: '#8BAB98',
    emoji: '🌊',
  },
  {
    id: 3,
    tag: '✦ 최초 1회 무료',
    title: '오늘 하루\n기운 어때',
    desc: '일일운세 최초 1회 무료로 확인',
    href: '/daily',
    cta: '무료 운세 보기 →',
    charId: 'doRyeong',
    bg: 'linear-gradient(135deg, #0f1525 0%, #1e3a8a 60%, #0f1525 100%)',
    accent: '#80A5C4',
    emoji: '⭐',
  },
]

interface MenuItem {
  href: string; label: string; desc: string; emoji: string
  icon?: string
  badge: string; badgeColor: string; paid: boolean
}

const MENUS: MenuItem[] = [
  { href: '/saju',    label: '사주 풀이',   desc: '생년월일시로 보는 종합 사주',  emoji: '🔮', icon: '/icons/saju.png', badge: '1900원',   badgeColor: '#F59E0B', paid: true },
  { href: '/gunghap', label: '궁합 해설',   desc: '두 사람의 사주 궁합 분석',     emoji: '💞', badge: '검증 중',   badgeColor: '#F59E0B', paid: true },
  { href: '/daeun',   label: '대운 해설',   desc: '10년 주기 큰 흐름',           emoji: '🌊', badge: '1냥', badgeColor: '#8BAB98', paid: true },
  { href: '/taekil',  label: '택 · 일',    desc: '좋은 날짜 골라줌',            emoji: '📅', badge: '1냥', badgeColor: '#8BAB98', paid: true },
  { href: '/yearly',  label: '연도별 운세', desc: '특정 연도 운세 분석',          emoji: '📆', badge: '1냥', badgeColor: '#8BAB98', paid: true },
  { href: '/daily',   label: '일일 운세',   desc: '오늘 하루 기운',              emoji: '⭐', badge: '무료',    badgeColor: '#80A5C4', paid: false },
]

function HeroBannerCarousel(){
 const [current,setCurrent]=useState(0),[paused,setPaused]=useState(false)
 useEffect(()=>{if(paused||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const t=setInterval(()=>setCurrent(c=>(c+1)%BANNERS.length),6500);return()=>clearInterval(t)},[paused])
 const b=BANNERS[current]
 return <section className="palace-hero" aria-label="추천 운세" aria-roledescription="캐러셀" onMouseEnter={()=>setPaused(true)} onFocusCapture={()=>setPaused(true)} style={{'--hero-accent':b.accent} as React.CSSProperties}>
  <div className="hero-orbits" aria-hidden="true"><i/><i/><i/><span>命</span></div><img className="hero-character" src={CHAR_IMG[b.charId]} alt={CHARACTERS.find(c=>c.id===b.charId)?.name} fetchPriority="high"/>
  <div className="hero-copy"><span className="hero-label">{b.tag}</span><h1>{b.title.split('\n').map((line,i)=><span key={i}>{line}</span>)}</h1><p>{b.desc}</p><Link href={b.href} className="palace-primary">{b.cta.replace(' →','')}<Icon name="arrow" size={18}/></Link><div className="hero-caption"><span/>당신을 위한 신령의 한마디</div></div>
  <div className="hero-bottom"><span className="hero-signature">사주궁 四柱宮 <i>당신의 운명을 읽다</i></span><div className="hero-controls"><button aria-label="이전 배너" onClick={()=>setCurrent(c=>(c+3)%4)}><Icon name="left" size={15}/></button><span><b>{String(current+1).padStart(2,'0')}</b> / 04</span><button aria-label="다음 배너" onClick={()=>setCurrent(c=>(c+1)%4)}><Icon name="right" size={15}/></button><button aria-label={paused?'배너 자동 재생':'배너 일시 정지'} onClick={()=>setPaused(v=>!v)}>{paused?'▷':'Ⅱ'}</button></div></div>
 </section>
}
const iconNames:Record<string,string>={'/saju':'moon','/gunghap':'heart','/daeun':'wave','/taekil':'calendar','/yearly':'calendar','/daily':'sun'}
function SectionHeading({label,title,children}:{label:string;title:string;children?:React.ReactNode}){return <div className="palace-section-heading"><div><span className="palace-kicker">{label}</span><h2>{title}</h2></div>{children}</div>}
export default function HomePage(){
 const {data:session}=useSession()
 const [showLoginModal,setShowLoginModal]=useState(false),[showShop,setShowShop]=useState(false),[agreed,setAgreed]=useState(false)
 const dialogRef=useRef<HTMLDialogElement>(null)
 useEffect(()=>{if(showLoginModal)dialogRef.current?.showModal();else dialogRef.current?.close()},[showLoginModal])
 const balance=(session?.user as {yeobjeun_balance?:number})?.yeobjeun_balance??0
 useEffect(()=>{if(session)setShowLoginModal(false)},[session])
 const charge=()=>session?setShowShop(true):setShowLoginModal(true)
 return <div className="palace-home">
  <header className="palace-header"><Link href="/" className="palace-brand"><span className="brand-seal"><Icon name="spark" size={24}/></span><b>사주궁</b><small>SAJUGUNG</small></Link><div className="header-actions">{session?<button onClick={()=>setShowShop(true)} className="header-balance"><Icon name="coin" size={16}/>{balance}냥 <span>+ 충전</span></button>:<><Link href="/daily" className="header-free"><Icon name="sun" size={16}/>무료운세</Link><button className="header-login" onClick={()=>setShowLoginModal(true)}>로그인</button></>}</div></header>
  <main className="palace-home-content">
   <HeroBannerCarousel/>
   <ConversationBanner/>
   <Link href="/daily" className="palace-daily-banner"><span className="daily-sun"><Icon name="sun" size={30}/></span><div><b>오늘의 무료 운세</b><span>프로필 등록하면 최초 1회 무료 확인</span></div><span className="daily-link">무료보기<Icon name="arrow" size={18}/></span></Link>
   <section className="palace-character-section"><SectionHeading label="THE FOUR GUIDES" title="운명을 보는 자들"><Link href="/characters">전체보기 <Icon name="arrow" size={16}/></Link></SectionHeading><div className="palace-character-grid">{CHARACTERS.map((c,i)=><Link className="palace-character-card" href={`/characters/${c.id}`} key={c.id} style={{'--character-accent':c.color} as React.CSSProperties}><span className="character-index">0{i+1} <i>{['財','命','緣','運'][i]}</i></span><img src={CHAR_IMG[c.id]} alt={c.name} loading="lazy"/><div className="character-card-copy"><span>{c.tag}</span><h3>{c.name}</h3><span className="character-more"><Icon name="arrow" size={19}/></span></div></Link>)}</div></section>
   <section className="palace-menu-section"><SectionHeading label="READ YOUR DESTINY" title="신탁 메뉴"><button onClick={charge}><Icon name="coin" size={16}/>엽전 충전</button></SectionHeading><div className="menu-group-label"><span>프리미엄</span><i/></div><div className="palace-menu-grid paid">{MENUS.filter(m=>m.paid).map(m=><Link key={m.href} href={m.href} className="palace-menu-card"><div className="menu-card-top"><span className="menu-symbol"><Icon name={iconNames[m.href]} size={38}/></span><span className="menu-price">{m.badge}</span></div><h3>{m.label}</h3><p>{m.desc}</p><span className="menu-card-cta">보러가기 <Icon name="arrow" size={17}/></span></Link>)}</div><div className="menu-group-label"><span>처음 만나는 무료 운세</span><i/></div><div className="palace-menu-grid free">{MENUS.filter(m=>!m.paid).map(m=><Link key={m.href} href={m.href} className="palace-menu-card"><div className="menu-card-top"><span className="menu-symbol"><Icon name={iconNames[m.href]} size={29}/></span><span className={`menu-price ${m.badge==='무료'?'is-free':''}`}>{m.badge}</span></div><h3>{m.label}</h3><p>{m.desc}</p><span className="menu-card-cta">보러가기 <Icon name="arrow" size={16}/></span></Link>)}</div></section>
   <section className="palace-service-section"><SectionHeading label="A LITTLE MORE ABOUT US" title="사주궁에서 할 수 있는 것들"/><div className="palace-service-grid">{[{icon:'coin',title:'1900원 사주 풀이',desc:'타고난 성격, 재물운, 직업운까지 직설로 분석'},{icon:'heart',title:'궁합',desc:'꼭 커플만 궁합 보란 법 있나요? 자유롭게 조합해보세요'},{icon:'wave',title:'대운 풀이',desc:'10년 단위 인생의 큰 흐름 해설'},{icon:'calendar',title:'연도별 운세',desc:'올해 총운, 월별 운세를 한눈에'},{icon:'sun',title:'오늘의 운세 — 무료',desc:'최초 1회 무료로 확인하는 일일운세'},{icon:'calendar',title:'택일',desc:'이사, 결혼, 개업 등 좋은 날짜 추천'}].map(item=><div key={item.title}><Icon name={item.icon} size={23}/><div><h3>{item.title}</h3><p>{item.desc}</p></div></div>)}</div><p className="service-disclaimer">사주궁은 오락 및 참고 목적의 서비스입니다.</p></section>
   {!session&&<section className="palace-welcome"><span className="welcome-icon"><Icon name="coin" size={40}/></span><div><span className="palace-kicker">처음 만나는 사주궁</span><h2>첫 일일운세 1회 무료</h2><p>오늘의 일일운세도 무료로 확인하세요.</p></div><button onClick={()=>setShowLoginModal(true)} className="palace-primary">가입하기 <Icon name="arrow" size={17}/></button></section>}
   <section className="palace-currency"><div><Icon name="coin" size={29}/><b>1냥</b><span>= 1900원</span></div><span className="currency-equals">=</span><p><b>커피 한 잔값</b><span>으로 만나는 나의 사주 풀이</span></p><button onClick={charge}>충전하기 <Icon name="arrow" size={17}/></button></section>
   <footer className="palace-footer"><div><span className="footer-brand">사주궁 <small>四柱宮</small></span><div className="footer-links"><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보처리방침</Link><Link href="/refund">환불정책</Link><a href="mailto:sajuya.help@gmail.com">고객센터</a></div></div><p>본 서비스는 사주명리학 기반 엔터테인먼트 콘텐츠입니다.<br/>의료·법률·재정 판단을 대체하지 않으며, 만 14세 이상 이용 가능합니다.</p><span className="copyright">© {new Date().getFullYear()} 사주궁 · sajuya.help@gmail.com</span></footer>
  </main>
  <nav className="palace-bottom-nav" aria-label="주요 메뉴">{[{href:'/',name:'홈',icon:'home'},{href:'/saju',name:'사주',icon:'moon'},{href:'/chat',name:'1:1 대화',icon:'chat'},{href:'/daily',name:'무료운세',icon:'sun'},{href:'/storage',name:'보관함',icon:'book'},{href:'/characters',name:'신령',icon:'eye'}].map(n=><Link key={n.href} href={n.href} className={n.href==='/'?'active':''} aria-current={n.href==='/'?'page':undefined}><Icon name={n.icon} size={21}/><span>{n.name}</span></Link>)}</nav>
  {showShop&&<YeopjeunShop onClose={()=>setShowShop(false)} currentBalance={balance}/>}
  <dialog ref={dialogRef} className="palace-login-dialog" onCancel={()=>setShowLoginModal(false)} aria-labelledby="login-dialog-title"><button className="palace-dialog-close" aria-label="로그인 닫기" onClick={()=>setShowLoginModal(false)}>×</button><Icon name="coin" size={41}/><span className="palace-kicker">WELCOME TO SAJUGUNG</span><h2 id="login-dialog-title">첫 일일운세 1회 무료</h2><p>계정당 최초 1회 · 결과는 보관함에서 다시 확인</p><div className="palace-login-options"><button disabled={!agreed} onClick={()=>signIn('kakao')} style={{background:'#FEE500',color:'#252016'}}>카카오로 계속하기</button><button disabled={!agreed} onClick={()=>signIn('google')} style={{background:'#fff',color:'#202124'}}>구글로 계속하기</button><button disabled={!agreed} onClick={()=>signIn('naver')} style={{background:'#03C75A',color:'#fff'}}>네이버로 계속하기</button></div><label className="palace-agreement"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span><Link href="/terms">이용약관</Link> 및 <Link href="/privacy">개인정보처리방침</Link>에 동의합니다 (필수)</span></label></dialog>
 </div>
}
