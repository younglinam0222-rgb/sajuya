import { NextRequest,NextResponse } from 'next/server'
import { reconcilePayment } from '@/lib/payment-service'
import { failure } from '@/lib/server-access'
import { createServerSupabase } from '@/lib/supabase'
// Webhook content is a notification only. Never grant access based on its status/amount.
export async function POST(req:NextRequest) {
 try {
  const body=await req.json(), orderId=body?.data?.orderId
  if(typeof orderId!=='string'||orderId.length>64) return NextResponse.json({received:true})
  const {data}=await createServerSupabase().from('commerce_orders').select('status,payment_key').eq('order_id',orderId).maybeSingle()
  if(!data||!data.payment_key) return NextResponse.json({received:true})
  await reconcilePayment(orderId,false)
  return NextResponse.json({received:true})
 }catch(e){return failure(e)}
}
