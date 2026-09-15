import {NextRequest,NextResponse} from 'next/server'
import {failure,AccessError,rpc} from '@/lib/server-access'
import {requireRefundAdmin,requireRefunds,refundBody,isId,runRefund,refundSnapshot,externalRefundMatches,attachExternalRefund} from '@/lib/refund-service'
const headers={'Cache-Control':'private, no-store'}
export async function GET(req:NextRequest){try{const user=await requireRefundAdmin(req);requireRefunds();return NextResponse.json({...await refundSnapshot(user,true),admin:true},{headers})}catch(e){return failure(e)}}
export async function POST(req:NextRequest){try{
 const user=await requireRefundAdmin(req);requireRefunds();const b=await refundBody(req)
 if(!isId(b.id)||!['quote','approve','reject','reconcile','external'].includes(String(b.action)))throw new AccessError(400,'요청을 확인해주세요.')
 if(b.action==='quote')return NextResponse.json({...await rpc('refund_review_quote',{p_id:b.id}),matches:await externalRefundMatches(b.id)},{headers})
 if(b.action==='reconcile'){await runRefund(b.id);return NextResponse.json({message:'토스 결제 내역을 다시 확인했습니다.'},{headers})}
 if(typeof b.note!=='string'||!b.note.trim()||b.note.length>600)throw new AccessError(400,'처리 사유를 입력해주세요.')
 if(b.action==='external'){if(typeof b.transactionKey!=='string'||b.transactionKey.length>100)throw new AccessError(400,'취소 거래를 확인해주세요.');await attachExternalRefund(b.id,b.transactionKey,user,b.note);return NextResponse.json({message:'토스에서 확인된 취소 내역을 반영했습니다.'},{headers})}
 if(b.action==='approve'&&(!Number.isSafeInteger(b.expectedAmount)||Number(b.expectedAmount)<=0))throw new AccessError(400,'환불 예정 금액을 먼저 확인해주세요.')
 const r=await rpc('decide_refund',{p_id:b.id,p_actor:user,p_approve:b.action==='approve',p_note:b.note,p_expected_amount:b.action==='approve'?b.expectedAmount:null})
 if(r.error)throw new AccessError(409,r.error==='quote_changed'?'사용 내역이 변경됐습니다. 예정 금액을 다시 확인해주세요.':'결정할 수 없는 요청입니다.')
 if(r.status==='queued')await runRefund(r.id)
 return NextResponse.json({message:r.status==='review'?'자동 정산할 수 없는 기록입니다. 추가 확인 사유를 확인해주세요.':b.action==='reject'?'처리 사유를 저장했습니다.':'승인한 요청을 처리했습니다. 결제 결과를 확인해주세요.'},{headers})
}catch(e){return failure(e)}}
export const maxDuration=60
