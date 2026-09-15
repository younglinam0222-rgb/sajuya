import { createServerSupabase } from './supabase'
import { toss } from './payment-service'
import { PRODUCTS } from './access-policy'
import { rpc } from './server-access'
import { refundPorts } from './refund-service'
import { inspectRefundPayment } from './refund-engine'

// Old flags cannot prove purchase. Query the provider, then atomically register the
// known payment-to-reading relationship so future webhooks can also revoke it.
export async function recoverLegacyPayment(orderId:string) {
 const match=/^unlock_([a-f0-9]{8,32})_\d+$/.exec(orderId)
 if(!match)return false
 const db=createServerSupabase()
 const {data:row,error}=await db.from('payments').select('order_id,toss_payment_key,amount,user_id,reading_id').eq('order_id',orderId).eq('status','done').maybeSingle()
 if(error)throw error
 if(!row?.toss_payment_key||!row.user_id||row.amount!==PRODUCTS.unlock.amount)return false
 const {data:reading,error:readingError}=await db.from('readings').select('id,user_id').eq('share_id',match[1]).maybeSingle()
 if(readingError)throw readingError
 if(!reading||reading.user_id!==row.user_id||(row.reading_id&&row.reading_id!==reading.id))return false
 const response=await toss('/payments/'+encodeURIComponent(row.toss_payment_key))
 if(!response.ok)throw Error('legacy provider unavailable')
 const payment=await response.json()
 if(payment.orderId!==row.order_id||payment.paymentKey!==row.toss_payment_key||payment.totalAmount!==row.amount||payment.currency!=='KRW'
 ||!['DONE','CANCELED','PARTIAL_CANCELED'].includes(payment.status))return false
 await rpc('register_legacy_payment',{p_order:row.order_id,p_key:row.toss_payment_key,p_amount:row.amount,p_share:match[1]})
 if(payment.status==='DONE'&&!(payment.cancels?.length)){
  await rpc('complete_payment',{p_order:row.order_id,p_key:row.toss_payment_key,p_amount:row.amount})
 }else{
  // Cancellation synchronization is essential even when the public refund form is disabled.
  const order=await refundPorts.order(row.order_id)
  await inspectRefundPayment(refundPorts,order,payment)
 }
 return true
}

export async function recoverLegacyPayments() {
 const {data:rows,error}=await createServerSupabase().from('payments').select('order_id').eq('status','done').limit(100)
 if(error)throw error
 let verified=0
 for(const row of rows??[])if(await recoverLegacyPayment(row.order_id))verified++
 return verified
}
