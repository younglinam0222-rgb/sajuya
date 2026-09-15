import { recoverLegacyPayments } from '@/lib/legacy-payment-recovery'
import { timingSafeEqual } from 'node:crypto'
import { NextRequest,NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { reconcilePayment } from '@/lib/payment-service'
import { failure,rpc } from '@/lib/server-access'
export async function POST(req:NextRequest) {
 const expected=process.env.RECONCILE_SECRET, actual=Buffer.from(req.headers.get('authorization')??'')
 const expectedBytes=Buffer.from('Bearer '+(expected??''))
 if(!expected||actual.length!==expectedBytes.length||!timingSafeEqual(actual,expectedBytes)) return new NextResponse(null,{status:401})
 try {
  if(req.nextUrl.searchParams.get('legacy')==='1') return NextResponse.json({legacyVerified:await recoverLegacyPayments()})
  const db=createServerSupabase()
  const {data:orders,error}=await db.from('commerce_orders').select('order_id').eq('status','pending').not('payment_key','is',null).limit(50)
  if(error) throw error
  let recovered=0
  for(const order of orders??[]) { try { await reconcilePayment(order.order_id,false); recovered++ } catch {} }
  const {data:jobs,error:jobError}=await db.from('generation_jobs').select('id,attempt').eq('status','running').lt('updated_at',new Date(Date.now()-1200000).toISOString()).limit(100)
  if(jobError) throw jobError
  for(const job of jobs??[]) await rpc('finish_generation',{p_job:job.id,p_attempt:job.attempt,p_success:false})
  return NextResponse.json({paymentsRecovered:recovered,jobsRecovered:jobs?.length??0})
 }catch(e){return failure(e)}
}
export const maxDuration=300
