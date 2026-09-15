import {NextRequest,NextResponse} from 'next/server'
import {requireUser,failure,AccessError,rpc} from '@/lib/server-access'
import {requireRefunds,refundBody,isId,runRefund,refundSnapshot} from '@/lib/refund-service'
const headers={'Cache-Control':'private, no-store'}
export async function GET(req:NextRequest){try{const user=await requireUser(req);requireRefunds();return NextResponse.json(await refundSnapshot(user),{headers})}catch(e){return failure(e)}}
export async function POST(req:NextRequest){try{
 const user=await requireUser(req);requireRefunds();const b=await refundBody(req)
 if(typeof b.orderId!=='string'||b.orderId.length>100||!isId(b.requestId)||!['unused','failure','content','duplicate'].includes(String(b.kind))||typeof b.reason!=='string'||b.reason.length>600||(b.kind!=='unused'&&!b.reason.trim())||(b.jobId!==null&&!isId(b.jobId)))throw new AccessError(400,'주문과 요청 내용을 확인해주세요.')
 // No client-supplied user, payment key, refund amount, or credit count is accepted.
 const r=await rpc('request_refund',{p_user:user,p_order:b.orderId,p_kind:b.kind,p_reason:b.reason,p_key:b.requestId,p_job:b.jobId})
 if(r.error)throw new AccessError(r.error==='missing'?404:409,r.error==='missing'?'본인의 결제 내역을 확인해주세요.':'요청 내역이 일치하지 않습니다.')
 if(r.status==='queued')await runRefund(r.id)
 return NextResponse.json({message:r.status==='review'?'확인이 필요한 요청으로 접수했어요. 검토 결과를 안내해드릴게요.':'환불 요청을 접수했어요. 아래 처리 내역에서 결과를 확인해주세요.'},{headers})
}catch(e){return failure(e)}}
export const maxDuration=60
