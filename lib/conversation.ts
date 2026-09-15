export type ConversationInput={sourceId:string;characterId:string;message:string;previousId:string|null;requestId:string;maxCoins:0|1;consent:boolean}
export type ConversationAnswer={memo:string;paragraphs:string[];suggestions:string[];recommendation:string|null}
export const CONVERSATION_GUIDES=['baekhalma','doryeong','gumiho','sinryeong']
const id=(x:unknown)=>typeof x==='string'&&/^[\w-]{1,80}$/.test(x)
export function validConversation(v:unknown):v is ConversationInput{
 if(!v||typeof v!=='object'||Array.isArray(v))return false
 const p=v as ConversationInput
 return id(p.sourceId)&&CONVERSATION_GUIDES.includes(p.characterId)&&typeof p.message==='string'&&p.message.trim().length>0&&p.message.length<=800&&(p.previousId===null||id(p.previousId))&&id(p.requestId)&&p.requestId.length>=8&&[0,1].includes(p.maxCoins)&&p.consent===true
}
export const conversationRoom=(source:string,guide:string)=>source+'--'+guide
export function readConversation(raw:unknown):ConversationAnswer {
 const value: unknown=typeof raw==='string'?JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g,'')):raw
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('대화 답변 형식을 확인하지 못했어요.')
 const p=value as Record<string,unknown>
 if(!p||typeof p!=='object'||typeof p.memo!=='string'||!p.memo.trim()||p.memo.length>120||!Array.isArray(p.paragraphs)||p.paragraphs.length<2||p.paragraphs.length>8||p.paragraphs.some((s:unknown)=>typeof s!=='string'||!s.trim()||s.length>500)||!Array.isArray(p.suggestions)||p.suggestions.length!==2||p.suggestions.some((s:unknown)=>typeof s!=='string'||!s.trim()||s.length>80)||!(p.recommendation===null||p.recommendation==='saju'))throw Error('대화 답변이 완성되지 않았어요.')
 return {memo:p.memo.trim(),paragraphs:p.paragraphs.map((s:string)=>s.trim()),suggestions:p.suggestions.map((s:string)=>s.trim()),recommendation:p.recommendation}
}
export type ConversationTurn={id:string;roomId:string;sourceId:string;characterId:string;message:string;answer:ConversationAnswer;createdAt:string;free:boolean}
export function compactConversation(turns:ConversationTurn[]){return turns.slice(-3).map(t=>({question:t.message.slice(0,800),reply:[t.answer.memo,...t.answer.paragraphs].join('\n').slice(0,1300)}))}
