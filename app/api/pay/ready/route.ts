import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser, failure, AccessError } from '@/lib/server-access'
import { PRODUCTS, validProduct } from '@/lib/access-policy'
import { createServerSupabase } from '@/lib/supabase'
export async function POST(req:NextRequest) {
 try {
  const user=await requireUser(req)
  const {packageId,agreed}=await req.json()
  if(!validProduct(packageId)||agreed!==true) throw new AccessError(400,'상품과 이용 조건 동의를 확인해주세요.')
  if(packageId==='unlock')throw new AccessError(503,'기존 결과의 별도 구매는 점검 중입니다. 이미 결제하셨다면 결제 내역에서 확인을 요청해주세요.')
  if(!process.env.TOSS_SECRET_KEY||!process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY) throw new AccessError(503,'결제 준비 중입니다.')
  const product=PRODUCTS[packageId], db=createServerSupabase()
  const {count,error:countError}=await db.from('commerce_orders').select('order_id',{count:'exact',head:true}).eq('user_id',user).gte('created_at',new Date(Date.now()-600000).toISOString())
  if(countError) throw countError
  if((count??0)>=10) throw new AccessError(429,'주문 요청이 많습니다. 잠시 후 다시 시도해주세요.')
  const orderId='saju_'+randomUUID().replace(/-/g,'')
  const {error}=await db.from('commerce_orders').insert({order_id:orderId,user_id:user,product:packageId,amount:product.amount,coins:product.coins,reading_id:null,consent_version:process.env.REFUNDS_ENABLED==='true'?'purchase-refund-v2':'purchase-v1'})
  if(error) throw error
  return NextResponse.json({orderId,amount:product.amount,orderName:product.name,checkoutUrl:'/checkout/'+orderId})
 }catch(e){return failure(e)}
}
