import { NextRequest,NextResponse } from 'next/server'
import { requireUser,failure,AccessError } from '@/lib/server-access'
import { createServerSupabase } from '@/lib/supabase'
import { PRODUCTS, ProductId } from '@/lib/access-policy'
export async function GET(req:NextRequest,{params}:{params:Promise<{orderId:string}>}) {
 try {
  const user=await requireUser(req),{orderId}=await params
  const {data,error}=await createServerSupabase().from('commerce_orders').select('order_id,amount,product,status').eq('order_id',orderId).eq('user_id',user).single()
  if(error||!data) throw new AccessError(404,'주문이 없습니다.')
  if(data.product==='unlock'&&data.status!=='done')throw new AccessError(503,'기존 결과의 별도 구매는 점검 중입니다. 결제를 마쳤다면 결제 내역에서 확인해주세요.')
  return NextResponse.json({...data,orderName:PRODUCTS[data.product as ProductId].name},{headers:{'Cache-Control':'private, no-store'}})
 }catch(e){return failure(e)}
}
