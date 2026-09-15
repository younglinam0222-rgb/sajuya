import { createServerSupabase } from './supabase'
import { paymentMatches } from './access-policy'
import { AccessError, rpc } from './server-access'

export async function toss(path:string, init:RequestInit={}) {
 const key=process.env.TOSS_SECRET_KEY
 if(!key) throw new AccessError(503,'결제 설정을 확인 중입니다.')
 return fetch('https://api.tosspayments.com/v1'+path,{
  ...init,cache:'no-store',signal:AbortSignal.timeout(15000),
  headers:{Authorization:'Basic '+Buffer.from(key+':').toString('base64'),'Content-Type':'application/json',...init.headers},
 })
}
export async function reconcilePayment(orderId:string, confirm=false) {
 const db=createServerSupabase()
 const {data:order,error}=await db.from('commerce_orders').select('*').eq('order_id',orderId).single()
 if(error||!order) throw new AccessError(404,'주문이 없습니다.')
 if(!order.payment_key) throw new AccessError(409,'결제 인증이 아직 완료되지 않았습니다.')
 let response=await toss('/payments/'+encodeURIComponent(order.payment_key))
 if(!response.ok) throw new AccessError(503,'결제 내역을 확인하지 못했습니다. 다시 결제하지 말고 확인을 재시도해주세요.')
 let payment=await response.json()
 if(payment.orderId!==order.order_id || payment.totalAmount!==order.amount || payment.currency!=='KRW') throw new AccessError(409,'주문 정보가 일치하지 않습니다.')
 if(payment.status==='IN_PROGRESS' && confirm) {
  if(order.product==='unlock')throw new AccessError(503,'기존 결과의 별도 구매는 점검 중입니다. 추가 결제는 진행되지 않았습니다.')
  response=await toss('/payments/confirm',{method:'POST',headers:{'Idempotency-Key':order.order_id},
   body:JSON.stringify({paymentKey:order.payment_key,orderId:order.order_id,amount:order.amount})})
  if(response.ok) payment=await response.json()
  else {
   // Another request may already have confirmed it. Re-read the provider's authoritative status.
   const check=await toss('/payments/'+encodeURIComponent(order.payment_key))
   if(check.ok) payment=await check.json()
  }
 }
 if(process.env.REFUNDS_ENABLED==='true' && (payment.cancels?.length || ['CANCELED','PARTIAL_CANCELED'].includes(payment.status))) {
  const {syncRefundPayment}=await import('./refund-service')
  await syncRefundPayment(order.order_id,payment)
  return {success:true,canceled:payment.status==='CANCELED',redirectUrl:'/payments'}
 }
 if(payment.status==='CANCELED' && payment.paymentKey===order.payment_key) return rpc('cancel_payment',{p_order:order.order_id,p_key:order.payment_key,p_amount:order.amount})
 if(!paymentMatches(order,payment,order.payment_key)) throw new AccessError(409,'결제가 완료되지 않았습니다. 결제 상태를 다시 확인해주세요.')
 return rpc('complete_payment',{p_order:order.order_id,p_key:order.payment_key,p_amount:order.amount})
}
