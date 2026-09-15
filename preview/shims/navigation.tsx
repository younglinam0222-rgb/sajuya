import {useSyncExternalStore,useMemo} from 'react'
const subscribe=(cb:()=>void)=>{window.addEventListener('popstate',cb);return()=>window.removeEventListener('popstate',cb)}
export function useLocation(){return useSyncExternalStore(subscribe,()=>window.location.pathname+window.location.search,()=>'/')}
export function navigate(url:string,replace=false){if(!url.startsWith('/'))return;const current=new URLSearchParams(window.location.search);if(current.get('canvas')==='1'){const target=new URL(url,window.location.origin);target.searchParams.set('canvas','1');if(!target.searchParams.has('concept'))target.searchParams.set('concept',current.get('concept')||'a');url=target.pathname+target.search+target.hash}window.history[replace?'replaceState':'pushState']({},'',url);window.dispatchEvent(new PopStateEvent('popstate'));window.scrollTo(0,0);const hash=new URL(url,window.location.origin).hash;if(hash){let id=hash.slice(1);try{id=decodeURIComponent(id)}catch{};const observer=new MutationObserver(scroll);const timer=window.setTimeout(()=>observer.disconnect(),5000);function scroll(){const element=document.getElementById(id);if(element){element.scrollIntoView({block:'start'});observer.disconnect();window.clearTimeout(timer)}}observer.observe(document.body,{childList:true,subtree:true});requestAnimationFrame(scroll)}}
const router={push:(u:string)=>navigate(u),replace:(u:string)=>navigate(u,true),back:()=>history.length>1?history.back():navigate('/'),refresh:()=>window.dispatchEvent(new PopStateEvent('popstate')),prefetch:()=>Promise.resolve()}
export function useRouter(){return router}
export function usePathname(){return useLocation().split('?')[0]}
export function useSearchParams(){const location=useLocation();return useMemo(()=>new URLSearchParams(location.split('?')[1]||''),[location])}
export function useParams(){const bits=usePathname().split('/').filter(Boolean);return {id:bits[1],shareId:bits[1],ilju:bits[1],job:bits[2]}}
export function notFound(){throw new Error('페이지를 찾을 수 없습니다.')}
export function redirect(url:string){navigate(url,true)}
