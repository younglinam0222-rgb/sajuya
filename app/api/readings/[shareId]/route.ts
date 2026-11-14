import { NextRequest, NextResponse } from 'next/server'
import { requireUser, failure, AccessError } from '@/lib/server-access'
import { createServerSupabase } from '@/lib/supabase'
import { lockedResult } from '@/lib/access-policy'
export async function GET(req:NextRequest,{params}:{params:Promise<{shareId:string}>}) {
 try {
  const user=await requireUser(req), {shareId}=await params
  const {data,error}=await createServerSupabase().from('readings')
   .select('share_id,user_id,character_id,saju_data,ai_result,is_paid,access_verified,product')
   .eq('share_id',shareId).eq('user_id',user).maybeSingle()
  if(error) throw error
  if(!data) throw new AccessError(404,'풀이를 찾을 수 없습니다.')
  // access_verified is set only by the server after a complete generation.
  // Saju is temporarily free; legacy rows without verification remain locked.
  const allowed=data.access_verified && (data.is_paid || ['saju','daily','conversation'].includes(data.product))
  return NextResponse.json({share_id:data.share_id,character_id:data.character_id,saju_data:data.saju_data,
   ai_result:allowed?data.ai_result:JSON.stringify(lockedResult(data.ai_result)),
   is_paid:data.is_paid,full_access:allowed,can_share:allowed && data.is_paid,locked:!allowed,product:data.product},
   {headers:{'Cache-Control':'private, no-store'}})
 }catch(e){return failure(e)}
}
