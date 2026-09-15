import {CHAT_TOPICS,CHAT_GUIDES,validChatInput,readChatAnswer,type ChatInput} from '../lib/chat-flow'
import {isPreviewLoggedIn} from './shims/auth'
const KEY='sajugung-guided-chat-v1'
let failNext=false,processing=false,installed=false
const day=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date())
function records(){try{const rows=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(rows)?rows.filter(r=>r&&typeof r.id==='string'&&CHAT_TOPICS.some(t=>t.id===r.topicId)&&CHAT_GUIDES.some(g=>g.id===r.characterId)&&Array.isArray(r.answers)&&r.answers.length===3&&r.result).slice(0,50):[]}catch{return []}}
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json'}})
const stream=(answer:unknown)=>new Response('data: '+JSON.stringify({text:JSON.stringify(answer)})+'\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}})
const guidance:Record<string,[string,string,string]>={
 '연애·인연':['상대의 마음을 추측하는 일과 내가 원하는 관계를 구분해보세요. 만남의 가능성만큼, 서로 편안하게 의견을 주고받는지도 중요합니다.','전하고 싶은 말을 세 문장으로 적고, 상대에게 답을 재촉하는 문장이 있는지 살펴보세요. 대화를 제안할 때는 거절할 여지도 함께 남겨주세요.','상대의 침묵을 재회나 호감의 증거로 해석하지 마세요. 원하지 않는 연락은 멈추고 상대의 경계를 존중해주세요.'],
 '돈·생활':['돈 문제를 한 번에 해결하려 할수록 선택이 급해질 수 있어요. 확실한 수입, 조정할 수 있는 지출, 아직 확인하지 못한 기대를 나눠보세요.','이번 주에 실제로 나갈 돈과 들어올 돈을 적어보세요. 바꿀 수 있는 항목 하나를 골라 행동 계획으로 옮겨보세요.','운세로 투자 수익이나 상환 가능성을 판단하지 마세요. 계약 조건과 실제 현금 흐름을 먼저 확인해주세요.'],
 '일·사업':['변화를 원하는 마음과 지금 감당할 수 있는 조건을 함께 보세요. 방향이 맞는지 확인하려면 작은 시도에서 얻는 정보가 필요합니다.','고민하는 선택의 비용·시간·되돌릴 수 있는 정도를 각각 적어보세요. 한 번에 바꾸기보다 이번 주에 확인할 수 있는 작은 실험을 정해보세요.','좋은 시기라는 말만으로 퇴사하거나 사업 규모를 늘리지는 마세요. 생활비와 계약 조건을 현실에서 점검해주세요.'],
 '가족·관계':['관계에서 내가 책임질 부분과 상대가 결정할 부분을 나누어보세요. 한쪽이 계속 참고 버티는 방식은 오래 유지하기 어렵습니다.','상대의 잘못을 나열하기 전에, 내가 겪은 상황과 필요한 도움을 한 문장씩 적어보세요. 대화할 시간을 서로 정해보는 것도 좋아요.','상대의 속마음을 사주로 단정할 수는 없어요. 실제 대화와 행동을 확인하면서 경계를 조정해주세요.'],
 '마음·건강':['현재의 부담을 의지 부족으로만 보지 마세요. 해야 할 일이 많은지, 충분히 쉴 여유가 있는지부터 살펴보는 편이 도움이 됩니다.','오늘 꼭 해야 할 일 하나와 미뤄도 되는 일 하나를 나누어보세요. 혼자 감당하기 어렵다면 믿을 만한 사람에게 필요한 도움을 구체적으로 말해보세요.','사주로 질병이나 정신건강 상태를 판단하지 않습니다. 증상이 지속되거나 일상을 방해한다면 의료 전문가에게 상담해주세요.'],
 '변화·선택':['지금의 선택이 반드시 완벽해야 하는 것은 아니에요. 무엇을 지키고 무엇을 바꿀지 정하면 불확실한 상황에서도 기준을 세울 수 있습니다.','각 선택에서 얻는 것, 포기하는 것, 직접 확인할 사실을 하나씩 적어보세요. 되돌릴 수 있는 작은 행동부터 먼저 실행해보세요.','특정 날짜에 성공이 보장되지는 않아요. 일정과 비용, 함께 영향을 받는 사람들의 상황을 확인해주세요.'],
}
export function demoChatAnswer(i:ChatInput){const t=CHAT_TOPICS.find(t=>t.id===i.topicId)!;const [reading,action,caution]=guidance[t.group];const name=CHAT_GUIDES.find(g=>g.id===i.characterId)!.short;return readChatAnswer({summary:`${i.answers[0]}. 지금은 “${i.answers[1]}”부터 차근차근 살펴봐요.`,interpretation:`${name}와 나누는 ${t.title} 상담 예시입니다.\n${reading}\n선택한 “${i.answers[2]}”에 맞춰 한 번에 한 가지 행동을 정해보세요.${i.note?'\n추가로 남긴 고민도 함께 돌아보되, 이 체험 답변은 실제 사주를 분석하지 않은 예시입니다.':''}`,action,caution,nextQuestion:`“${i.answers[1]}”에 관해 지금 직접 확인할 수 있는 사실 한 가지는 무엇인가요?`})}
export async function chatFixture(path:string,method:string,body:unknown){
 if(path!=='/api/chat')return null
 if(!installed){window.addEventListener('chat-demo-error',()=>{failNext=true});window.addEventListener('chat-demo-reset',()=>{localStorage.removeItem(KEY);failNext=false});installed=true}
 if(!isPreviewLoggedIn())return json({error:'로그인이 필요합니다.'},401)
 const rows=records(),today=day(),remaining=Math.max(0,5-rows.filter(r=>r.day===today).length)
 if(method==='GET')return json({enabled:true,demo:true,cost:null,balance:0,remaining,profiles:[{id:'demo-profile',label:'예시 회원 · 저장된 사주'}],records:rows})
 if(method!=='POST')return json({error:'허용되지 않은 요청입니다.'},405)
 if(!validChatInput(body))return json({error:'주제와 세 가지 선택을 모두 확인해주세요.'},400)
 const input=body, fingerprint=JSON.stringify([today,input.sourceId,input.topicId,input.characterId,input.answers,input.note])
 const prior=rows.find(r=>r.id===input.requestId)
 if(prior&&prior.fingerprint!==fingerprint)return json({error:'요청 내용이 바뀌었어요. 새 상담을 시작해주세요.'},409)
 const cached=prior||rows.find(r=>r.fingerprint===fingerprint)
 if(cached)return stream(cached.result)
 if(processing)return json({error:'이미 상담을 준비 중입니다. 잠시 후 다시 확인해주세요.'},409)
 if(remaining<=0)return json({error:'오늘의 체험 5회를 모두 사용했어요. 상담 기록은 계속 볼 수 있어요.'},429)
 processing=true
 try{await new Promise(resolve=>setTimeout(resolve,1600));if(failNext){failNext=false;return json({error:'체험용 연결 오류입니다. 횟수는 사용되지 않았어요. 다시 시도해주세요.'},503)}
 const result=demoChatAnswer(input);localStorage.setItem(KEY,JSON.stringify([{id:input.requestId,topicId:input.topicId,characterId:input.characterId,answers:input.answers,note:input.note,createdAt:new Date().toISOString(),day:today,fingerprint,result},...records()].slice(0,50)));return stream(result)
 }catch{return json({error:'기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해주세요.'},503)}finally{processing=false}
}
