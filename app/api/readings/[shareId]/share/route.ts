import { randomBytes } from 'node:crypto'
import { NextRequest,NextResponse } from 'next/server'
import { requireUser,failure,AccessError } from '@/lib/server-access'
import { createServerSupabase } from '@/lib/supabase'
export async function POST(req:NextRequest,{params}:{params:Promise<{shareId:string}>}) {
 try {
  const user=await requireUser(req),{shareId}=await params,db=createServerSupabase()
  const {data}=await db.from('readings').select('id,share_token,is_paid,access_verified,product').eq('share_id',shareId).eq('user_id',user).single()
  if(data?.product==='conversation'||!data?.access_verified||(!data.is_paid&&data.product!=='daily')) throw new AccessError(403,'이용 가능한 결과만 공유할 수 있습니다.')
  if(!data.share_token) {
   const {error}=await db.from('readings').update({share_token:randomBytes(24).toString('hex')}).eq('id',data.id).is('share_token',null)
   if(error) throw error
  }
  const {data:shared,error}=await db.from('readings').select('share_token').eq('id',data.id).single()
  if(error||!shared?.share_token) throw new Error('Share failed')
  return NextResponse.json({path:'/share/'+shared.share_token},{headers:{'Cache-Control':'private, no-store'}})
 }catch(e){return failure(e)}
}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{shareId:string}>}) {
 try{
  const user=await requireUser(req),{shareId}=await params
  const {error}=await createServerSupabase().from('readings').update({share_token:null}).eq('share_id',shareId).eq('user_id',user)
  if(error)throw error
  return NextResponse.json({success:true})
 }catch(e){return failure(e)}
}
