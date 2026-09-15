// Dependency-injected so the real cancellation workflow is tested without live money or credentials.
export interface RefundJob {id:string;order_id:string;user_id:string;status:string;amount:number;coins:number;submitted_at:string|null;attempts:number}
export interface RefundPayment {paymentKey:string;orderId:string;currency:string;totalAmount:number;balanceAmount:number;status:string;method:string;isPartialCancelable?:boolean;cancels?:{transactionKey:string;cancelAmount:number;cancelReason:string;cancelStatus:string}[]|null}
export interface RefundOrder {order_id:string;payment_key:string;amount:number;refunded_amount:number;refund_review:boolean}
export interface RefundPorts {
 rpc:(name:string,args:Record<string,unknown>)=>Promise<any>;
 order:(id:string)=>Promise<RefundOrder>;
 known:(id:string)=>Promise<{id:string;status:string;transaction_key:string|null}[]>;
 payment:(key:string)=>Promise<RefundPayment>;
 cancel:(key:string,amount:number,marker:string,idempotency:string)=>Promise<RefundPayment>;
 now:()=>number;
}
const marker=(id:string)=>'sajugung:'+id
export async function inspectRefundPayment(p:RefundPorts,order:RefundOrder,payment:RefundPayment,current?:RefundJob):Promise<'clear'|'settled'|'blocked'|'pending'> {
 if(payment.orderId!==order.order_id||payment.paymentKey!==order.payment_key||payment.totalAmount!==order.amount||payment.currency!=='KRW')throw Error('payment mismatch')
 const known=await p.known(order.order_id)
 const cancels=payment.cancels??[]
 // Only an exact, provider-confirmed transaction can complete an existing request.
 let settled=false
 for(const c of cancels){
  const own=known.find(r=>c.cancelReason===marker(r.id))
  if(own&&c.cancelStatus==='DONE'){
   await p.rpc('settle_refund',{p_id:own.id,p_transaction:c.transactionKey,p_amount:c.cancelAmount})
   if(current?.id===own.id)settled=true
  }else if(!own&&!known.some(r=>r.transaction_key===c.transactionKey)){
   await p.rpc('flag_external_refund',{p_order:order.order_id,p_note:'토스의 별도 취소 기록이 있습니다. 거래번호와 사용 내역을 대조해주세요.'})
   return 'blocked'
  }
 }
 const done=cancels.filter(c=>c.cancelStatus==='DONE').reduce((sum,c)=>sum+c.cancelAmount,0)
 if(!Number.isSafeInteger(payment.balanceAmount)||payment.balanceAmount<0||payment.balanceAmount!==order.amount-done)throw Error('provider balance mismatch')
 if(settled)return 'settled'
 if(cancels.some(c=>c.cancelStatus!=='DONE'))return 'pending'
 const latest=await p.order(order.order_id)
 if(latest.refunded_amount!==done){
  await p.rpc('flag_external_refund',{p_order:order.order_id,p_note:'토스 취소 금액과 내부 환불 기록이 다릅니다. 추가 취소 전에 확인해주세요.'})
  return 'blocked'
 }
 if(latest.refund_review)await p.rpc('clear_refund_review',{p_order:order.order_id,p_amount:done})
 return 'clear'
}
export async function processRefund(p:RefundPorts,id:string) {
 const job:RefundJob|null=await p.rpc('claim_refund',{p_id:id})
 if(!job)return
 const mark=(state:string,note:string)=>p.rpc('mark_refund',{p_id:id,p_state:state,p_note:note})
 try {
  const order=await p.order(job.order_id)
  const payment=await p.payment(order.payment_key)
  const observed=await inspectRefundPayment(p,order,payment,job)
  if(observed==='settled'||observed==='blocked')return
  if(observed==='pending'){await mark('uncertain','결제기관에서 취소를 처리하고 있습니다.');return}
  if(!['DONE','PARTIAL_CANCELED'].includes(payment.status)||job.amount<=0||job.amount>payment.balanceAmount){await mark('blocked','취소 가능한 결제 잔액과 상태를 확인해주세요.');return}
  if(!['카드','간편결제','계좌이체'].includes(payment.method)||(job.amount<payment.balanceAmount&&payment.isPartialCancelable===false)){
   await mark('blocked','이 결제수단은 별도 처리가 필요합니다. 토스 관리자에서 환불 방법을 확인해주세요.');return
  }
  // Toss retains idempotency keys for 15 days. Stop POST retries after 24h, well inside that window.
  if(job.submitted_at&&p.now()-Date.parse(job.submitted_at)>86400000){await mark('blocked','장시간 미확정 상태입니다. 새 취소 요청 없이 토스 거래 내역을 확인해주세요.');return}
  await mark('processing','결제 취소를 요청하고 있습니다.')
  try {
   const result=await p.cancel(order.payment_key,job.amount,marker(id),'refund-'+id)
   const state=await inspectRefundPayment(p,order,result,job)
   if(state==='settled'||state==='blocked')return
  }catch{
   // The provider may have succeeded while the response or our DB write was lost.
   const result=await p.payment(order.payment_key)
   const state=await inspectRefundPayment(p,order,result,job)
   if(state==='settled'||state==='blocked')return
  }
  await mark('uncertain','취소 결과를 다시 확인하고 있습니다. 같은 요청은 중복 처리되지 않습니다.')
 }catch{
  await mark('uncertain','결제 연결 또는 처리 기록을 확인하고 있습니다. 환불 대상 엽전은 보관 중입니다.')
 }
}
