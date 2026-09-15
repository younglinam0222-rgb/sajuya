import { NextRequest,NextResponse } from 'next/server'
import { requireUser,failure,AccessError,rpc } from '@/lib/server-access'
import { createServerSupabase } from '@/lib/supabase'
import { reconcilePayment } from '@/lib/payment-service'
export async function POST(req:NextRequest) {
 try {
  const user=await requireUser(req)
  const {paymentKey,orderId,amount}=await req.json()
  if(typeof paymentKey!=='string'||paymentKey.length>200||typeof orderId!=='string'||orderId.length>64||!Number.isSafeInteger(amount)) throw new AccessError(400,'결제 정보를 확인해주세요.')
  const {data:order}=await createServerSupabase().from('commerce_orders').select('amount').eq('order_id',orderId).eq('user_id',user).single()
  if(!order||order.amount!==amount) throw new AccessError(400,'주문 정보가 일치하지 않습니다.')
  if(!await rpc('bind_payment',{p_user:user,p_order:orderId,p_key:paymentKey})) throw new AccessError(409,'다른 결제 정보가 연결된 주문입니다.')
  const result=await reconcilePayment(orderId,true)
  if(result.canceled) throw new AccessError(409,'취소된 결제입니다.')
  return NextResponse.json(result)
 }catch(e){return failure(e)}
}
