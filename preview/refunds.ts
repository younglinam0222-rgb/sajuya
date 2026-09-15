import {v4 as uuid} from 'uuid'
import type {RefundOrder,RefundRecord} from '../app/components/refunds/types'
const now=()=>new Date().toISOString()
let orders:RefundOrder[]=[];let refunds:RefundRecord[]=[];let version=0
// Device-local example state only. This module is excluded from the production app.
const persist=()=>{try{localStorage.setItem('sajugung-refund-demo-v1',JSON.stringify({orders,refunds}))}catch{}}
export function resetRefundDemo(){version++;orders=[
 {order_id:'sample-partial',product:'three',amount:4900,coins:3,available:2,refunded_amount:0,tracked:true,created_at:now(),jobs:[{id:'sample-job-one',product:'사주',status:'done'}]},
 {order_id:'sample-unused',product:'one',amount:1900,coins:1,available:1,refunded_amount:0,tracked:true,created_at:now(),jobs:[]},
 {order_id:'sample-failure',product:'one',amount:1900,coins:1,available:1,refunded_amount:0,tracked:true,created_at:now(),jobs:[{id:'sample-job-fail',product:'궁합',status:'failed'}]},
 {order_id:'sample-content',product:'one',amount:1900,coins:1,available:0,refunded_amount:0,tracked:true,created_at:now(),jobs:[{id:'sample-job-content',product:'사주',status:'done'}]},
 {order_id:'sample-network',product:'one',amount:1900,coins:1,available:0,refunded_amount:0,tracked:true,created_at:now(),jobs:[]}
 ];refunds=[
 {id:'sample-review',order_id:'sample-content',user_id:'예시 회원',kind:'content',reason:'안내된 해석 중 조언 항목이 보이지 않아요. 확인해주세요.',status:'review',amount:0,coins:0,review_reason:'제공 내용과 요청 사유의 확인이 필요합니다.',decision_note:null,created_at:now()},
 {id:'sample-check',order_id:'sample-network',user_id:'예시 회원',kind:'unused',reason:'미사용 유료 엽전 환불',status:'uncertain',amount:1900,coins:1,review_reason:'결제 응답이 늦어 결과를 다시 확인하고 있습니다.',decision_note:null,created_at:now()}
 ];persist()}
try{const saved=JSON.parse(localStorage.getItem('sajugung-refund-demo-v1')||'null');if(saved?.orders&&saved?.refunds){orders=saved.orders;refunds=saved.refunds}else resetRefundDemo()}catch{resetRefundDemo()}
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})
function complete(r:RefundRecord){if(r.status==='succeeded')return;const o=orders.find(o=>o.order_id===r.order_id)!;r.status='succeeded';r.review_reason=null;o.refunded_amount+=r.amount;persist()}
export function refundFixture(path:string,method:string,body:Record<string,any>){
 if(!['/api/refunds','/api/admin/refunds'].includes(path))return null
 const admin=path.includes('/admin/')
 if(method==='GET'){for(const r of refunds)if(r.status==='queued'&&Date.now()-Date.parse(r.created_at)>=1000)complete(r);return json({orders,refunds,admin})}
 if(admin){const r=refunds.find(r=>r.id===body.id);if(!r)return json({error:'요청이 없어요.'},404);const o=orders.find(o=>o.order_id===r.order_id)!
  const n=['unused','duplicate'].includes(r.kind)?o.available:1
  const amount=Math.min(o.amount-o.refunded_amount,Math.ceil(o.amount*n/o.coins))
  if(body.action==='quote')return json({eligible:r.status==='review'&&amount>0,amount:r.status==='review'?amount:0,coins:n,paid:o.amount,available:o.available,jobStatus:o.jobs[0]?.status??null,message:r.status==='review'?'샘플에서는 요청 사유가 확인된 상황을 체험합니다.':'결제 결과를 확인 중입니다. 결제 상태 다시 확인을 이용해주세요.'})
  if(body.action==='reject'){r.status='rejected';r.decision_note=body.note;persist();return json({message:'처리 사유를 저장했습니다.'})}
  if(body.action==='approve'){if(r.status!=='review'||amount<=0||body.expectedAmount!==amount)return json({error:'사용 내역이 변경됐습니다. 예정 금액을 다시 확인해주세요.'},409);r.amount=amount;r.coins=n;if(['unused','duplicate'].includes(r.kind)||o.jobs[0]?.status==='failed')o.available-=n;r.decision_note=body.note;complete(r);return json({message:'예시 환불이 완료됐어요. 실제 결제는 취소되지 않았습니다.'})}
  if(body.action==='reconcile'){complete(r);return json({message:'예시 결제 기록에서 취소를 확인했습니다.'})}
 }
 const o=orders.find(o=>o.order_id===body.orderId);if(!o)return json({error:'주문이 없습니다.'},404)
 const existing=refunds.find(r=>r.order_id===o.order_id&&!['succeeded','rejected'].includes(r.status));if(existing)return json({message:'이미 접수한 요청을 확인하고 있어요.'})
 const auto=(body.kind==='unused'||body.kind==='failure')&&o.available>0
 const n=body.kind==='failure'?1:o.available
 const r:RefundRecord={id:uuid(),order_id:o.order_id,kind:body.kind,reason:body.reason||'미사용 유료 엽전 환불',status:auto?'queued':'review',amount:auto?Math.min(o.amount-o.refunded_amount,Math.ceil(o.amount*n/o.coins)):0,coins:auto?n:0,review_reason:auto?null:'요청 내용과 이용 기록을 확인한 뒤 안내해드릴게요.',decision_note:null,created_at:now()}
 refunds.unshift(r)
 if(auto){o.available-=n;const current=version;setTimeout(()=>{if(current===version)complete(r)},1000)}
 persist();return json({message:auto?'환불 요청을 접수했어요. 처리 중인 엽전은 보관됩니다.':'검토 요청을 접수했어요.'})
}
