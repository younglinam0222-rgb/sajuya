import {useSyncExternalStore} from 'react'
import {navigate} from './navigation'
let logged=false
const subscribers=new Set<()=>void>()
const demoSession={user:{id:'preview-only',name:'예시 회원',email:'preview@example.invalid',yeobjeun_balance:0},expires:'2099-01-01'}
export function setPreviewLogin(value:boolean){logged=value;subscribers.forEach(cb=>cb())}
export function useSession(){const state=useSyncExternalStore(cb=>{subscribers.add(cb);return()=>{subscribers.delete(cb)}},()=>logged,()=>false);return {data:state?demoSession:null,status:state?'authenticated':'unauthenticated',update:async()=>demoSession}}
export async function signIn(_provider?:string,options?:any){setPreviewLogin(true);if(options?.callbackUrl)navigate(options.callbackUrl);return {ok:true}}
export async function signOut(){setPreviewLogin(false);navigate('/')}
export function SessionProvider({children}:any){return children}

export function isPreviewLoggedIn(){return logged}
