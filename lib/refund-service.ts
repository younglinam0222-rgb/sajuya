import {NextRequest} from 'next/server'
import {createServerSupabase} from './supabase'
import {requireUser,AccessError,rpc} from './server-access'
import {toss} from './payment-service'
import {processRefund,inspectRefundPayment,RefundPorts,RefundPayment} from './refund-engine'
export function refundsEnabled(){return process.env.REFUNDS_ENABLED==='true'}
export function requireRefunds(){if(!refundsEnabled())throw new AccessError(503,'환불 접수 연결을 준비 중입니다. 고객센터로 문의해주세요.')}
export async function requireRefundAdmin(req:NextRequest){
 const id=await requireUser(req)
 const allowed=(process.env.ADMIN_USER_IDS??'').split(',').map(x=>x.trim()).filter(Boolean)
 if(!allowed.includes(id))throw new AccessError(403,'주인장만 확인할 수 있습니다.')
 return id
}
export async function refundBody(req:NextRequest){
 const origin=req.headers.get('origin'),expected=new URL(process.env.NEXTAUTH_URL??req.nextUrl.origin).origin
 // Browser mutations require a matching origin; no permissive origin-less fallback.
 if(origin!==expected)throw new AccessError(403,'요청 출처를 확인할 수 없습니다.')
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new AccessError(415,'JSON 요청이 필요합니다.')
 const raw=await req.text();if(raw.length>2500)throw new AccessError(413,'입력이 너무 깁니다.')
 try{return JSON.parse(raw) as Record<string,unknown>}catch{throw new AccessError(400,'요청 내용을 확인해주세요.')}
}
export const isId=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
export const refundPorts:RefundPorts={
 rpc,
 async order(id){const {data,error}=await createServerSupabase().from('commerce_orders').select('order_id,payment_key,amount,refunded_amount,refund_review,product').eq('order_id',id).single();if(error||!data?.payment_key)throw Error('order');return data},
 async known(id){const {data,error}=await createServerSupabase().from('refund_requests').select('id,status,transaction_key').eq('order_id',id);if(error)throw error;return data??[]},
 async payment(key){const response=await toss('/payments/'+encodeURIComponent(key));if(!response.ok)throw Error('provider unavailable');return response.json()},
 async cancel(key,amount,marker,idempotency){const response=await toss('/payments/'+encodeURIComponent(key)+'/cancel',{method:'POST',headers:{'Idempotency-Key':idempotency},body:JSON.stringify({cancelReason:marker,cancelAmount:amount})});if(!response.ok)throw Error('provider cancel unconfirmed');return response.json()},
 now:()=>Date.now(),
}
export async function runRefund(id:string){requireRefunds();await processRefund(refundPorts,id)}
export async function syncRefundPayment(orderId:string,payment:RefundPayment){
 requireRefunds();const order=await refundPorts.order(orderId)
 return inspectRefundPayment(refundPorts,order,payment)
}
export async function runRefundBatch(){
 requireRefunds()
 const {data,error}=await createServerSupabase().from('refund_requests').select('id').in('status',['queued','processing','uncertain','blocked']).lte('next_check_at',new Date().toISOString()).order('next_check_at').limit(4)
 if(error)throw error
 for(const r of data??[])await runRefund(r.id)
 return data?.length??0
}
export async function refundSnapshot(user:string,admin=false){return rpc('refund_snapshot',{p_user:user,p_admin:admin})}

// Linking records a cancellation already completed at Toss; it never sends another cancel.
export async function externalRefundMatches(id:string){
 const {data:r,error}=await createServerSupabase().from('refund_requests').select('id,order_id,status,kind,amount,held,spend_attempt').eq('id',id).single()
 if(error||!r)throw new AccessError(404,'요청이 없습니다.')
 const unreserved=r.kind==='external'&&r.status==='review'&&!r.held&&!r.spend_attempt
 if(!unreserved&&(!['blocked','uncertain','processing'].includes(r.status)||(!r.held&&!r.spend_attempt)))return []
 const order=await refundPorts.order(r.order_id),payment=await refundPorts.payment(order.payment_key),known=await refundPorts.known(r.order_id)
 if(payment.orderId!==order.order_id||payment.paymentKey!==order.payment_key||payment.totalAmount!==order.amount||payment.currency!=='KRW')throw new AccessError(409,'결제 정보가 일치하지 않습니다.')
 const cancels=payment.cancels??[]
 if(!Array.isArray(cancels)||cancels.some(c=>!Number.isSafeInteger(c.cancelAmount)||c.cancelAmount<=0||!c.transactionKey)
 ||!Number.isSafeInteger(payment.balanceAmount)||payment.balanceAmount<0
 ||payment.balanceAmount!==order.amount-cancels.filter(c=>c.cancelStatus==='DONE').reduce((sum,c)=>sum+c.cancelAmount,0))
  throw new AccessError(409,'토스 취소 금액과 잔액을 대조하지 못했습니다.')
 const matches=[]
 for(const c of cancels){
  if(c.cancelStatus!=='DONE'||!Number.isSafeInteger(c.cancelAmount)||c.cancelAmount<=0||known.some(k=>k.transaction_key===c.transactionKey))continue
  if(unreserved){const q=await rpc('external_refund_quote',{p_id:id,p_amount:c.cancelAmount});if(!q?.eligible)continue}
  else if(c.cancelAmount!==r.amount)continue
  matches.push({transactionKey:c.transactionKey,amount:c.cancelAmount})
 }
 return matches
}
export async function attachExternalRefund(id:string,transaction:string,actor:string,note:string){
 const matches=await externalRefundMatches(id),match=matches.find(c=>c.transactionKey===transaction)
 if(!match)throw new AccessError(409,'해당 금액의 완료된 취소를 확인할 수 없습니다.')
 const r=await rpc('settle_external_refund',{p_id:id,p_transaction:transaction,p_amount:match.amount,p_actor:actor,p_note:note})
 const order=await refundPorts.order(r.order_id);await syncRefundPayment(r.order_id,await refundPorts.payment(order.payment_key))
}
