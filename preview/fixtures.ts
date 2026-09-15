import {conversationFixture} from './conversation-fixture'
import {chatFixture} from './chat-fixture'
import {exampleCopy} from './sample-copy'
import {refundFixture} from './refunds'
import {readDailyTrial,saveDailyTrial} from './daily-trial'
import {isPreviewLoggedIn} from './shims/auth'
import {lockedResult} from '../lib/access-policy'
// Preview only. No import from this directory is reachable from the Next production app.
export let scenario='normal'
export function setScenario(value:string){scenario=value}
const words='이 내용은 화면 구성을 확인하기 위한 예시 해석입니다. 실제 사주를 분석한 결과가 아닙니다. 나에게 자연스러운 강점과 반복되는 습관을 돌아보고, 일상에서 실천할 수 있는 작은 선택을 차근차근 살펴보는 형식으로 이야기가 담깁니다.'
const pillar=(stem:string,branch:string,stemKr:string,branchKr:string,stemElement:string,branchElement:string)=>({stem,branch,stemKr,branchKr,stemElement,branchElement,sipsinStem:'예시',sipsinBranch:'예시'})
const manse={yearPillar:pillar('庚','午','경','오','金','火'),monthPillar:pillar('戊','子','무','자','土','水'),dayPillar:pillar('甲','子','갑','자','木','水'),hourPillar:null,elementCount:{'木':1,'火':1,'土':1,'金':1,'水':2},animal:'말',hourStr:'시간 미입력',todayPillar:pillar('甲','辰','갑','진','木','土')}
const labels=['타고난 기질과 강점','나를 움직이는 마음','재물과 돈의 흐름','일에서 빛나는 순간','관계 속 나의 모습','사랑을 대하는 태도','삶의 균형을 잡는 법','기회를 알아보는 눈','반복되는 선택의 패턴','다가올 계절의 준비','놓치지 말아야 할 것','나에게 전하는 한마디']
const titles=labels.map((title,i)=>({id:String(i+1),category:['기질','관계','흐름'][Math.floor(i/4)],title,teaser:exampleCopy[i][0],content:exampleCopy[i][1],is_free:i===0}))
const strategy={overview:words,golden_period:words,lifecycle:[{age:'20대',score:58,season:'봄',desc:'탐색하는 시간 · 예시'},{age:'30대',score:72,season:'여름',desc:'경험을 쌓는 시간 · 예시'},{age:'40대',score:85,season:'가을',desc:'방향을 다듬는 시간 · 예시'},{age:'50대',score:78,season:'겨울',desc:'새로운 균형 · 예시'},{age:'60대',score:82,season:'봄',desc:'이어가는 시간 · 예시'}],peak_guide:words,warning:words,final_word:words}
const initial={id:'preview',share_id:'demo-current',created_at:new Date().toISOString(),character_id:'baekhalma',is_paid:false,saju_data:JSON.stringify({form:{name:'예시',year:'1990',month:'1',day:'1',gender:'female',questionIntent:'인생 전반'},saju:manse}),ai_result:JSON.stringify({titles,strategy,disclaimer:'디자인 확인용 예시입니다.',_meta:{isComplete:true}})}
let reading={...initial}
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})
function stream(events:any[],signal?:AbortSignal|null,interval=600,onComplete?:()=>void){let timer:ReturnType<typeof setTimeout>|undefined;let stopped=false;const enc=new TextEncoder();return new Response(new ReadableStream({start(controller){let index=0;const stop=()=>{if(stopped)return;stopped=true;clearTimeout(timer);try{controller.error(new DOMException('Aborted','AbortError'))}catch{}};signal?.addEventListener('abort',stop,{once:true});const next=()=>{if(stopped)return;if(index>=events.length){onComplete?.();controller.enqueue(enc.encode('data: [DONE]\n\n'));controller.close();stopped=true;signal?.removeEventListener('abort',stop);return}controller.enqueue(enc.encode('data: '+JSON.stringify(events[index++])+'\n\n'));timer=setTimeout(next,interval)};timer=setTimeout(next,850)},cancel(){stopped=true;clearTimeout(timer)}}),{headers:{'Content-Type':'text/event-stream'}})}
export function installFixtures(){const original=window.fetch.bind(window);window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
 const url=new URL(typeof input==='string'?input:input instanceof Request?input.url:String(input),location.origin)
 if(url.origin!==location.origin)return json({error:'외부 연동은 검토 후 가능합니다.'},403)
 if(!url.pathname.startsWith('/api/'))return original(input,init)
 let body:any={};try{body=JSON.parse(String(init?.body||'{}'))}catch{}
 const conversation=await conversationFixture(url.pathname,init?.method||'GET',body);if(conversation)return conversation
 const chat=await chatFixture(url.pathname,init?.method||'GET',body);if(chat)return chat
 const refund=refundFixture(url.pathname,init?.method||'GET',body);if(refund)return refund
 if(url.pathname==='/api/saju'){
  if(scenario==='generation-error'){scenario='normal';return json({error:'예시 오류'},503)}
  const items:any[]=[{type:'manse',data:manse}];for(let i=0;i<6;i++)items.push({type:'group',groupIndex:i,titles:titles.slice(i*2,i*2+2)});items.push({type:'strategy',data:strategy});if(body.personalQuestion)items.push({type:'personal',data:{question:body.personalQuestion,answer:words}})
  return stream(items,init?.signal,scenario==='delayed'?10500:600)
 }
 if(url.pathname==='/api/readings/save'){
  if(scenario==='save-error'){scenario='normal';return json({error:'예시 저장 오류'},503)}
  reading={...initial,character_id:body.characterId||'baekhalma',saju_data:JSON.stringify(body.sajuData),ai_result:body.aiResult};return json({shareId:'demo-current',updated:true})
 }
 if(url.pathname.startsWith('/api/readings/'))return isPreviewLoggedIn()?json({...reading,ai_result:reading.is_paid?reading.ai_result:JSON.stringify(lockedResult(reading.ai_result))}):json({error:'로그인이 필요합니다.'},401)
 if(url.pathname==='/api/storage')return json({readings:[reading]})
 if(url.pathname==='/api/daily'&&(!init?.method||init.method==='GET'))return isPreviewLoggedIn()?json({cached:readDailyTrial(),birthProfile:null}):json({error:'로그인이 필요합니다.'},401)
 if(['/api/daily','/api/daeun','/api/yearly','/api/taekil','/api/gunghap'].includes(url.pathname)){
  if(url.pathname==='/api/daily'){if(!isPreviewLoggedIn())return json({error:'로그인이 필요합니다.'},401);if(readDailyTrial())return json({error:'최초 무료 체험을 사용했습니다. 저장된 결과를 확인해주세요.'},409);if(scenario==='generation-error'){scenario='normal';return json({error:'예시 해석 오류입니다. 무료 횟수는 사용되지 않았어요.'},503)}}
  const result:any={score:82,overall_score:82,money_score:75,love_score:80,health_score:78};for(const key of ['overall','money','love','health','lucky','warning','today_word','current','next10','career','advice','yearOverall','firstHalf','secondHalf','intro','avoid','preparation','personality','longterm'])result[key]=words
  for(const [i,key]of ['best1','best2','best3'].entries())result[key]={date:`${body.targetYear||2026}-${String(body.targetMonth||10).padStart(2,'0')}-${12+i*5}`,reason:'날짜 카드 디자인을 확인하기 위한 예시입니다.',time:'오전 · 예시'}
  return stream([{type:'manse',data:manse},{text:JSON.stringify(result)}],init?.signal,800,url.pathname==='/api/daily'?()=>saveDailyTrial({date:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date()),characterId:body.characterId||'baekhalma',manse,result}):undefined)
 }
 if(url.pathname==='/api/pay/confirm'){reading.is_paid=true;return json({success:true})}
 if(url.pathname==='/api/pay/ready')return json({error:'비공개 디자인 검토에서는 실제 엽전 구매를 진행하지 않습니다.'},400)
 if(url.pathname==='/api/attendance')return json({success:true})
 return json({error:'이 기능은 원본 서비스 연결 후 사용할 수 있어요.'},501)
}}
export {manse as sampleManse,titles as sampleTitles,strategy as sampleStrategy}
