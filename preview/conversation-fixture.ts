import {validConversation,conversationRoom,readConversation,type ConversationInput,type ConversationTurn} from '../lib/conversation'
import {isPreviewLoggedIn} from './shims/auth'
const KEY='sajugung-free-conversation-v1'
type Demo={freeUsed:boolean;balance:number;turns:(ConversationTurn&{requestId:string;previousId:string|null;day:string})[]}
let installed=false,busy=false,fail=false
function state():Demo{try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x&&typeof x.freeUsed==='boolean'&&Number.isInteger(x.balance)&&Array.isArray(x.turns))return x}catch{}return {freeUsed:false,balance:0,turns:[]}}
function write(s:Demo){localStorage.setItem(KEY,JSON.stringify(s))}
const day=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date())
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json'}})
const wire=(x:unknown)=>new Response('data: '+JSON.stringify({text:JSON.stringify(x)})+'\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}})
function reply(i:ConversationInput,turns:ConversationTurn[]){
 const question=i.message,prior=turns.at(-1),business=/사업|프랜차|프렌차|매장|음식점|장사|가맹|매출|마진/.test(question),businessContext=business||!!prior&&/사업|가맹|매장|매출/.test(prior.message+' '+prior.answer.memo)
 const love=/연애|사랑|재회|연락|인연|결혼/.test(question)
 if(businessContext)return readConversation({memo:/매뉴얼|메뉴얼|레시피/.test(question)?'매뉴얼은 다른 사람이 같은 결과를 낼 수 있는지 확인하는 문서예요.':'확장하고 싶은 마음과, 복제할 수 있는 운영을 함께 살펴봐요.',paragraphs:[
 prior?`앞서 “${prior.message.slice(0,55)}”라고 물었죠. 이번 “${question.slice(0,80)}”도 같은 사업 고민에서 이어서 살펴볼게요.`:`“${question.slice(0,100)}”라는 고민을 꺼냈군요. 사업을 키우고 싶은 마음과 실제로 관리할 수 있는 범위를 함께 생각해보면 좋겠어요.`,
 '이 체험에서는 실제 사주나 사업 데이터를 분석하지 않습니다. 사업 확장 여부를 운세만으로 단정하지 않고, 현실에서 확인할 기준을 보여드리는 답변 예시예요.',
 /매뉴얼|메뉴얼|레시피/.test(question)?'첫 문서는 대표 메뉴 하나의 작업표로 잡아보세요. 재료 중량, 조리 순서, 불 조절, 포장 기준, 완성 사진을 적고 다른 직원이 설명 없이 따라 해보는 거예요.':'먼저 본점에서 사장님이 빠져도 맛과 포장, 주문 대응이 일정한지 확인해보세요. 가맹점을 늘리기 전에 본점 운영이 다른 사람에게 전달될 수 있는지가 중요한 질문이에요.',
 /마진|매출|돈/.test(question)?'최근 정산 자료에서 주문당 남는 금액을 확인해보세요. 재료·포장·배달 수수료·할인·인건비를 반영한 뒤, 가맹점에 추가로 발생할 비용까지 따로 적어보는 거예요.':'사장님 없이 운영해본 날의 주문 오류, 조리 편차, 고객 불만을 기록해보세요. 이 기록을 보고 매뉴얼과 교육에서 빠진 부분을 채울 수 있어요.',
 '사주가 계약의 안전성이나 사업 수익을 보장해주지는 않아요. 실제 확장 결정에는 운영 실험과 비용 검토, 필요한 전문가 확인을 함께 두세요.'
 ],suggestions:/매뉴얼|메뉴얼|레시피/.test(question)?['직원 교육은 어떤 순서로 하면 좋을까?','조리 편차는 어떻게 확인해야 할까?']:['매뉴얼은 무엇부터 만들어야 할까?','내가 없어도 매장이 돌아가게 하려면?'],recommendation:null})
 if(love)return readConversation({memo:'상대의 마음을 추측하기 전에, 내가 원하는 관계부터 살펴봐요.',paragraphs:[`“${question.slice(0,100)}”가 마음에 걸리는군요.${prior?' 앞서 나눈 이야기와 함께 생각해볼게요.':''}`,'이 답변은 대화 방식 체험용 예시예요. 실제 사주나 상대의 마음을 분석한 결과는 아닙니다.','상대가 어떤 마음인지 확신하기보다, 실제로 주고받은 말과 행동을 나누어 적어보세요. 내가 바라는 것과 확인된 사실을 구분하면 선택 기준이 조금 더 선명해질 수 있어요.','먼저 연락한다면 짧고 편안하게 의사를 전하고, 상대가 답하지 않을 권리도 존중해주세요. 상대의 반응을 억지로 의미 붙이지 않는 것이 중요해요.'],suggestions:['먼저 연락한다면 어떻게 말할까?','내 마음부터 정리하려면 어떻게 해야 해?'],recommendation:'saju'})
 return readConversation({memo:'지금 고민에서 내가 바꿀 수 있는 한 가지를 찾아봐요.',paragraphs:[prior?`앞서 “${prior.message.slice(0,55)}”라고 이야기했죠. 지금은 “${question.slice(0,80)}”가 궁금하군요.`:`“${question.slice(0,100)}”라는 고민을 들려줬군요. 한 번에 결론을 내기보다, 가장 마음에 걸리는 부분부터 살펴봐요.`,'이 체험 답변은 입력한 문장과 최근 대화를 연결한 예시이며, 실제 사주 해석은 아닙니다.','지금 확인된 사실, 내가 걱정하는 가능성, 직접 바꿀 수 있는 행동을 각각 하나씩 적어보세요. 미래를 확정하려 하기보다 선택에 필요한 정보를 모으는 데 초점을 두면 좋겠어요.','오늘 할 수 있는 작은 행동 한 가지부터 정해보세요. 건강·금전처럼 중요한 문제는 현실의 자료와 전문가의 도움을 함께 살펴봐야 해요.'],suggestions:['그럼 지금 가장 먼저 해볼 일은 뭐야?','내가 놓치고 있는 기준은 무엇일까?'],recommendation:null})
}
export async function conversationFixture(path:string,method:string,body:unknown){
 if(path!=='/api/conversation')return null
 if(!installed){window.addEventListener('conversation-demo-credit',()=>{const s=state();s.balance+=3;write(s)});window.addEventListener('conversation-demo-error',()=>{fail=true});window.addEventListener('conversation-demo-reset',()=>{write({freeUsed:false,balance:0,turns:[]});fail=false});installed=true}
 if(!isPreviewLoggedIn())return json({error:'로그인이 필요합니다.'},401)
 const s=state(),today=day(),remaining=Math.max(0,10-s.turns.filter(t=>t.day===today).length)
 if(method==='GET')return json({enabled:true,cost:1,freeAvailable:!s.freeUsed,balance:s.balance,remaining,profiles:[{id:'demo-source',label:'예시 회원 · 저장된 사주'}],turns:s.turns})
 if(method!=='POST'||!validConversation(body))return json({error:'질문과 이용 조건을 확인해주세요.'},400)
 const i=body,roomId=conversationRoom(i.sourceId,i.characterId),turns=s.turns.filter(t=>t.roomId===roomId),cached=s.turns.find(t=>t.requestId===i.requestId)
 if(cached){if(cached.message!==i.message.trim()||cached.roomId!==roomId||cached.previousId!==i.previousId)return json({error:'요청이 변경됐어요. 최신 대화를 확인해주세요.'},409);return wire(cached.answer)}
 if(busy)return json({error:'이미 답변을 준비 중이에요. 잠시 후 다시 확인해주세요.'},409)
 if((turns.at(-1)?.id||null)!==i.previousId)return json({error:'다른 창에서 대화가 이어졌어요. 최신 대화를 확인해주세요.'},409)
 if(!remaining)return json({error:'오늘 체험 대화 10회를 사용했어요.'},429)
 if(s.freeUsed&&i.maxCoins!==1)return json({error:'첫 무료 답변을 사용했어요. 다음 답변 이용 조건을 확인해주세요.'},409)
 if(s.freeUsed&&s.balance<1)return json({error:'체험 엽전이 부족해요. 다음 답변 전에 충전해주세요.'},402)
 busy=true
 try{await new Promise(resolve=>setTimeout(resolve,1600));if(fail){fail=false;return json({error:'체험용 연결 오류입니다. 무료 횟수와 엽전은 사용되지 않았어요.'},503)}
 const answer=reply(i,turns),fresh=state()
 // Repeat the quota/price check immediately before saving; another tab can finish first.
 if((fresh.turns.filter(t=>t.roomId===roomId).at(-1)?.id||null)!==i.previousId)return json({error:'새 대화를 불러온 뒤 다시 확인해주세요.'},409)
 if(fresh.freeUsed&&(i.maxCoins!==1||fresh.balance<1))return json({error:'이용 조건이 바뀌었어요. 다시 확인해주세요.'},409)
 const free=!fresh.freeUsed;if(!free)fresh.balance-=1;fresh.freeUsed=true
 fresh.turns.push({id:i.requestId,requestId:i.requestId,previousId:i.previousId,roomId,sourceId:i.sourceId,characterId:i.characterId,message:i.message.trim(),answer,createdAt:new Date().toISOString(),free,day:today});fresh.turns=fresh.turns.slice(-80);write(fresh);return wire(answer)
 }catch{return json({error:'대화 기록을 저장하지 못했어요. 다시 확인해주세요.'},503)}finally{busy=false}
}
