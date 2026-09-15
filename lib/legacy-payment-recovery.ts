import { createServerSupabase } from './supabase'
import { toss } from './payment-service'
import { paymentMatches, PRODUCTS } from './access-policy'
// Old is_paid flags are untrusted. Only independent provider evidence can migrate them.
export async function recoverLegacyPayments() {
 const db=createServerSupabase()
 const {data:rows,error}=await db.from('payments').select('order_id,toss_payment_key,amount').eq('status','done').limit(100)
 if(error) throw error
 let verified=0
 for(const row of rows??[]) {
  const match=/^unlock_([a-f0-9]{8,32})_\d+$/.exec(row.order_id)
  if(!match||!row.toss_payment_key||row.amount!==PRODUCTS.unlock.amount)continue
  const {data:reading}=await db.from('readings').select('id,access_verified,user_id').eq('share_id',match[1]).maybeSingle()
  if(!reading||reading.access_verified||!reading.user_id)continue
  const response=await toss('/payments/'+encodeURIComponent(row.toss_payment_key))
  if(!response.ok)continue
  if(!paymentMatches(row,await response.json(),row.toss_payment_key))continue
  const {error:updateError}=await db.from('readings').update({access_verified:true,is_paid:true}).eq('id',reading.id)
  if(updateError) throw updateError
  verified++
 }
 return verified
}
