import { NextRequest, NextResponse } from 'next/server'
import { failure, AccessError } from '@/lib/server-access'
import { createServerSupabase } from '@/lib/supabase'
import { existingGuestOwner, sajuOwner } from '@/lib/guest-access'

// Compatibility endpoint: client content and isPaid are never accepted as authority.
export async function POST(req: NextRequest) {
 try {
  const owner = await sajuOwner(req)
  let userId = owner.userId
  const {requestId}=await req.json()
  if(typeof requestId!=='string') throw new AccessError(400,'요청 정보가 없습니다.')
  const db=createServerSupabase()
  const {data:ownerLink,error}=await db.from('generation_requests').select('job_id').eq('user_id',userId).eq('request_id',requestId).maybeSingle()
  if(error) throw error
  let link=ownerLink
  if (!link && !owner.guestId) {
   const guest=existingGuestOwner(req)
   if (guest) {
    const fallback=await db.from('generation_requests').select('job_id').eq('user_id',guest.userId).eq('request_id',requestId).maybeSingle()
    if (fallback.error) throw fallback.error
    if (fallback.data) { link=fallback.data; userId=guest.userId }
   }
  }
  if(!link) throw new AccessError(404,'서버에서 생성한 결과가 없습니다.')
  const {data:job}=await db.from('generation_jobs').select('reading_id,status').eq('id',link.job_id).eq('user_id',userId).single()
  if(job?.status!=='done') throw new AccessError(409,'풀이가 아직 완성되지 않았습니다. 다시 시도해주세요.')
  const {data:reading}=await db.from('readings').select('share_id').eq('id',job.reading_id).eq('user_id',userId).single()
  if(!reading) throw new Error('Missing persisted reading')
  return NextResponse.json({shareId:reading.share_id,isComplete:true,updated:false})
 }catch(e){return failure(e)}
}
