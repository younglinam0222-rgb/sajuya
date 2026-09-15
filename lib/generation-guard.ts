import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash, randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { validReadingInput } from './input-validation'
import { canonical } from './access-policy'
import { decodeGeneration, replayWire } from './generation-result'
import { AccessError, failure, requireUser, rpc } from './server-access'
import { createServerSupabase } from './supabase'
import {birthSolarDate,koreanDate} from './manse-facts'

const context = new AsyncLocalStorage<{ jobId: string }>()
export async function recordUsage(model: string, usage: {input_tokens:number;output_tokens:number;cache_read_input_tokens?:number|null;cache_creation_input_tokens?:number|null}) {
  const job = context.getStore()
  if (!job) return
  const { error } = await createServerSupabase().from('ai_usage').insert({
    job_id:job.jobId, model, input_tokens:usage.input_tokens, output_tokens:usage.output_tokens,
    cache_read_tokens:usage.cache_read_input_tokens??0, cache_creation_tokens:usage.cache_creation_input_tokens??0,
  })
  if (error) console.error('[usage] persistence failed', {jobId:job.jobId})
}
export function guardedGeneration(product: string, generate: (req:NextRequest)=>Promise<Response>) {
 return async (req: NextRequest) => {
  let reservation: {id:string;attempt:string}|undefined
  try {
    const userId = await requireUser(req)
    if(['gunghap','daeun','yearly','taekil'].includes(product))throw new AccessError(503,'이 상품은 명리 계산 기준을 검증 중입니다. 현재 이용할 수 없으며 엽전은 사용되지 않았어요.')
    const raw = await req.text()
    if (raw.length>20000) throw new AccessError(413,'입력 내용이 너무 깁니다.')
    let input: Record<string,unknown>
    try { input=JSON.parse(raw) } catch { throw new AccessError(400,'입력 형식을 확인해주세요.') }
    if (!input || typeof input!=='object' || Array.isArray(input)) throw new AccessError(400,'입력을 확인해주세요.')
    if(!validReadingInput(product,input)) throw new AccessError(400,'이름과 생년월일, 질문 길이를 확인해주세요.')
    if(input.retry)throw new AccessError(400,'이전 결과의 부분 재생성은 지원하지 않습니다. 결제 내역에서 확인을 요청해주세요. 엽전은 사용되지 않았어요.')
    for(const suffix of product==='gunghap'?['1','2']:['']){
      try{birthSolarDate(Number(input['year'+suffix]),Number(input['month'+suffix]),Number(input['day'+suffix]),String(input['calType'+suffix]??'solar'))}
      catch{throw new AccessError(400,'실제 달력에 있는 생년월일인지 확인해주세요. 음력은 평달 기준입니다.')}
    }
    const requestId = typeof input.requestId==='string' && /^[\w-]{8,80}$/.test(input.requestId) ? input.requestId : randomUUID()
    delete input.requestId
    // Only full, server-validated results consume an entitlement. Partial retry flags cannot bypass this.
    delete input.retry
    const today = koreanDate()
    const period = product==='daily' ? today.iso : String(today.year)
    let hash=createHash('sha256').update(canonical({version:1,product,period,input})).digest('hex')
    const db=createServerSupabase()
    const {data:link,error:linkError}=await db.from('generation_requests').select('job_id').eq('user_id',userId).eq('request_id',requestId).maybeSingle()
    if(linkError)throw linkError
    if(link){
      const {data:job,error:jobError}=await db.from('generation_jobs').select('fingerprint,product,input').eq('user_id',userId).eq('id',link.job_id).single()
      if(jobError)throw jobError
      if(!job||job.product!==product||canonical(job.input)!==canonical(input))throw new AccessError(409,'요청 정보가 변경됐습니다. 새로 시작해주세요.')
      // Recover the same request across midnight/year boundaries with its server-owned fingerprint.
      hash=job.fingerprint
    }
    const reserved=await rpc('reserve_generation',{p_user:userId,p_hash:hash,p_product:product,p_request:requestId,p_input:input})
    const errors:Record<string,[number,string,('GENERATION_PENDING')?]>={
      balance:[402,'이 풀이에는 한냥이 필요합니다. 엽전을 충전해주세요.'],
      trial_used:[403,'계정당 최초 1회 무료 운세를 이미 이용하셨습니다. 저장된 결과는 다시 볼 수 있습니다.'],
      busy:[409,'이미 풀이를 생성 중입니다. 잠시 후 같은 내용으로 다시 확인해주세요.','GENERATION_PENDING'],
      rate:[429,'요청이 많습니다. 10분 후 다시 시도해주세요.'],
      conversation_limit:[429,'오늘 대화 한도 10회를 이용했습니다. 저장된 대화는 다시 볼 수 있어요.'],
      conversation_changed:[409,'다른 창에서 대화가 이어졌어요. 최신 대화를 불러온 후 다시 확인해주세요.'],
      price_changed:[409,'첫 무료 대화를 이미 사용했어요. 다음 답변 이용 조건을 다시 확인해주세요.'],
      chat_limit:[429,'오늘 상담 5회를 모두 이용했습니다. 저장된 상담은 다시 볼 수 있어요.'],
      refunded:[403,'환불 처리된 결과입니다. 새 상담을 시작해주세요.'],
      account:[401,'로그인을 다시 해주세요.'], conflict:[409,'요청 정보가 변경됐습니다. 새로 시작해주세요.'],
    }
    if (reserved.error) { const [s,m,code]=errors[reserved.error]??[503,'잠시 후 다시 시도해주세요.']; throw new AccessError(s,m,code) }
    const headers={'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'private, no-store'}
    if (reserved.cached) return new NextResponse(replayWire(reserved.response,requestId),{headers})
    reservation=reserved
    // Complete and persist on the server before delivering the result; a browser disconnect cannot forge/save partial content.
    const internal=new NextRequest(req.url,{method:'POST',headers:req.headers,body:JSON.stringify({...input,requestId}),signal:AbortSignal.timeout(290000)})
    const wire=await context.run({jobId:reserved.id},async()=>{
      const response=await generate(internal)
      if(!response.ok) throw new Error('Generation failed')
      return await response.text()
    })
    const decoded=decodeGeneration(product,wire,!!input.personalQuestion)
    const finished=await rpc('finish_generation',{p_job:reserved.id,p_attempt:reserved.attempt,p_success:true,p_response:wire,p_result:decoded.result,p_manse:decoded.manse})
    if(finished.error) throw new Error('Reservation expired')
    reservation=undefined
    return new NextResponse(replayWire(wire,requestId),{headers})
  } catch(error) {
    if(reservation) {
      try { await rpc('finish_generation',{p_job:reservation.id,p_attempt:reservation.attempt,p_success:false}) }
      catch { console.error('[generation] reservation requires recovery',{jobId:reservation.id}) }
    }
    return failure(error)
  }
 }
}
