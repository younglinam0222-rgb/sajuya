export const CHAT_VERSION = 'guided-v1'
export const CHAT_GUIDES = [
 {id:'baekhalma',name:'건물주 백할매',short:'백할매',intro:'복잡한 고민도, 하나씩 짚으면 길이 보여.',tone:'다정하고 현실적인 어른의 편안한 반말. 비난하거나 공포를 조장하지 않는다.'},
 {id:'doryeong',name:'근본도령',short:'도령',intro:'마음에 걸리는 이야기부터 차근차근 들려주세요.',tone:'차분하고 정중한 해요체. 이유와 선택 기준을 명료하게 설명한다.'},
 {id:'gumiho',name:'구미호 선생',short:'구미호',intro:'말하기 어려웠던 마음, 여기서 꺼내봐요.',tone:'따뜻하고 섬세한 해요체. 상대방 마음을 안다고 단정하지 않는다.'},
 {id:'sinryeong',name:'무등산 신령님',short:'신령님',intro:'서두르지 말고, 지금의 흐름을 함께 살펴봅시다.',tone:'담담한 하십시오체와 해요체. 신비로운 분위기는 절제하고 실천을 제안한다.'},
] as const
export const CHAT_GROUPS = ['연애·인연','돈·생활','일·사업','가족·관계','마음·건강','변화·선택'] as const
export type ChatTopic = {id:string;group:string;title:string;question:string;options:string[]}
const topic = (id:string,g:number,title:string,question:string,options:string[]):ChatTopic=>({id,group:CHAT_GROUPS[g],title,question,options})
export const CHAT_TOPICS:ChatTopic[] = [
 topic('new-love',0,'새로운 인연','지금 만남은 어떤 상황인가요?',['만나는 사람이 없어요','소개를 앞두고 있어요','알아가는 사람이 있어요','연애를 쉬고 있어요']),
 topic('crush',0,'짝사랑·썸','두 분은 어느 정도 가까운가요?',['가끔 마주쳐요','연락을 주고받아요','단둘이 만나요','최근 거리가 생겼어요']),
 topic('reunion',0,'재회','현재 연락은 어떻게 하고 있나요?',['연락이 끊겼어요','가끔 안부를 나눠요','다시 만나기로 했어요','연락할지 고민 중이에요']),
 topic('marriage',0,'결혼 고민','어떤 결정을 앞두고 있나요?',['결혼을 이야기하기 전이에요','시기를 의논 중이에요','현실적인 조건이 고민이에요','결혼에 확신이 없어요']),
 topic('income',1,'수입·매출','최근 수입은 어떤 흐름인가요?',['수입이 줄었어요','들어와도 남지 않아요','수입이 들쭉날쭉해요','새 수입원을 찾고 있어요']),
 topic('spending',1,'소비·저축','가장 바꾸고 싶은 부분은 무엇인가요?',['충동 지출이 많아요','고정비가 부담돼요','저축이 잘 안 돼요','가족 지출이 커요']),
 topic('debt',1,'빚·금전 부담','지금 가장 무거운 부담은 무엇인가요?',['매달 상환액','생활비 부족','가족에게 빌린 돈','여러 지출이 겹쳐요']),
 topic('money-choice',1,'금전적 선택','어떤 선택을 고민하고 있나요?',['큰 지출을 앞뒀어요','투자를 고민해요','동업 제안을 받았어요','돈을 빌려달라는 부탁']),
 topic('job-change',2,'이직','어느 단계에 와 있나요?',['이직을 생각 중이에요','지원하고 있어요','제안을 받았어요','퇴사를 앞뒀어요']),
 topic('work',2,'직장 생활','요즘 가장 신경 쓰이는 것은요?',['업무가 너무 많아요','사람 관계가 힘들어요','평가가 걱정돼요','방향을 모르겠어요']),
 topic('business',2,'사업·장사','현재 사업은 어느 단계인가요?',['시작을 준비해요','매출이 정체됐어요','비용이 부담돼요','확장을 고민해요']),
 topic('study',2,'시험·공부','지금 공부에서 막히는 것은요?',['집중이 잘 안 돼요','계획이 자주 밀려요','결과가 불안해요','진로와 맞는지 고민돼요']),
 topic('couple',3,'부부 관계','최근 어떤 일이 반복되나요?',['대화가 줄었어요','같은 문제로 다퉈요','역할 분담이 어려워요','서로 이해하고 싶어요']),
 topic('parents',3,'부모·가족','가족과 어떤 거리가 필요한가요?',['기대가 부담돼요','돈 문제가 얽혀 있어요','돌봄이 버거워요','대화를 시작하고 싶어요']),
 topic('children',3,'자녀와의 관계','어떤 장면에서 고민이 커지나요?',['훈육 기준이 달라요','아이 마음이 궁금해요','함께할 시간이 부족해요','내가 자꾸 조급해져요']),
 topic('friends',3,'친구·사람 관계','어떤 관계가 마음에 남나요?',['멀어진 친구','반복되는 부탁','새로운 모임','오해가 생긴 관계']),
 topic('energy',4,'기력·생활 리듬','요즘 일상에서 어려운 부분은요?',['쉬어도 지친 느낌','수면 리듬이 불규칙해요','일과 휴식의 경계','생활 습관을 바꾸고 싶어요']),
 topic('anxiety',4,'불안한 마음','어떤 순간에 생각이 많아지나요?',['결정하기 직전','밤에 혼자 있을 때','다른 사람과 비교할 때','앞날을 생각할 때']),
 topic('burnout',4,'번아웃·휴식','지금 가장 필요한 것은 무엇인가요?',['잠시 멈출 여유','일을 줄일 기준','주변의 도움','다시 시작할 계기']),
 topic('confidence',4,'자신감','어떤 경험이 마음에 남아 있나요?',['최근의 실패','거절당한 경험','남과 비교하는 습관','새 도전 앞의 망설임']),
 topic('moving',5,'이사·환경 변화','변화를 고민하는 이유는 무엇인가요?',['생활비를 줄이려고요','일이나 가족 때문이에요','새 출발을 하고 싶어요','지금 환경이 불편해요']),
 topic('decision',5,'두 갈래 선택','결정을 어렵게 하는 것은요?',['둘 다 장단점이 있어요','실패가 두려워요','주변의 의견이 달라요','정보가 부족해요']),
 topic('timing',5,'시작할 타이밍','어느 정도 준비가 되어 있나요?',['생각만 하고 있어요','조금씩 준비 중이에요','실행 직전이에요','이미 시작했어요']),
 topic('direction',5,'앞으로의 방향','가장 먼저 정리하고 싶은 것은요?',['내가 원하는 것','현실적인 우선순위','반복되는 선택','다음 한 걸음']),
]
export function chatQuestions(t:ChatTopic,answers:string[]) {
 const context=answers[0]||'현재 상황'
 const priority=t.group===CHAT_GROUPS[0]?['내 마음부터 정리하기','상대와 대화할 방법','관계의 거리 조절','다음 행동 정하기']
 :t.group===CHAT_GROUPS[1]?['지출과 부담 줄이기','현실적인 기준 세우기','선택의 위험 살피기','장기 계획 정리하기']
 :t.group===CHAT_GROUPS[4]?['오늘의 부담 덜기','휴식 기준 정하기','도움을 요청할 방법','작은 습관 만들기']
 :['현재 상황 이해하기','선택 기준 세우기','관계를 조율할 방법','다음 행동 정하기']
 return [{id:'situation',text:t.question,options:t.options},{id:'focus',text:`“${context}”에서 무엇을 먼저 짚어볼까요?`,options:priority},{id:'horizon',text:`“${answers[1]||'고민 정리'}”, 어느 시점의 조언이 필요한가요?`,options:['오늘 바로 해볼 일','이번 주의 방향','앞으로 한 달','서두르지 않고 준비하기']}]
}
export type ChatInput={topicId:string;answers:string[];characterId:string;sourceId:string;note:string;requestId:string;consent:boolean}
export function validChatInput(v:unknown):v is ChatInput {
 if(!v||typeof v!=='object'||Array.isArray(v))return false
 const i=v as ChatInput,t=CHAT_TOPICS.find(t=>t.id===i.topicId)
 if(!t||!CHAT_GUIDES.some(g=>g.id===i.characterId)||typeof i.sourceId!=='string'||!/^[\w-]{1,80}$/.test(i.sourceId)||typeof i.requestId!=='string'||!/^[\w-]{8,80}$/.test(i.requestId)||i.consent!==true||typeof i.note!=='string'||i.note.length>300||!Array.isArray(i.answers)||i.answers.length!==3)return false
 return chatQuestions(t,i.answers).every((q,n)=>q.options.includes(i.answers[n]))
}
export type ChatAnswer={summary:string;interpretation:string;action:string;caution:string;nextQuestion:string}
export function readChatAnswer(raw:unknown):ChatAnswer {
 const p=typeof raw==='string'?JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g,'')):raw
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('답변 형식을 확인하지 못했어요.')
 const keys=['summary','interpretation','action','caution','nextQuestion'] as const
 if(keys.some(k=>typeof p[k]!=='string'||!p[k].trim()||p[k].length>1500))throw Error('답변이 완성되지 않았어요.')
 return Object.fromEntries(keys.map(k=>[k,p[k].trim()])) as ChatAnswer
}
export function compactChatManse(raw:unknown) {
 if(!raw||typeof raw!=='object')throw Error('저장된 사주 정보가 없습니다.')
 const data=raw as Record<string,unknown>,out:Record<string,unknown>={}
 for(const key of ['yearPillar','monthPillar','dayPillar','hourPillar']) {
  const value=data[key]; if(!value||typeof value!=='object'||Array.isArray(value)){out[key]=null;continue}
  const p=value as Record<string,unknown>
  out[key]=Object.fromEntries(['stem','branch','stemElement','branchElement','sipsinStem','sipsinBranch'].filter(k=>typeof p[k]==='string').map(k=>[k,String(p[k]).slice(0,30)]))
 }
 if(!out.dayPillar||!Object.keys(out.dayPillar).length)throw Error('사주 원국을 확인해주세요.')
 return out
}
