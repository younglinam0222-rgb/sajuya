import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {processRefund,inspectRefundPayment} from '../lib/refund-engine.ts'
const db=new PGlite()
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;`)
for(const f of ['supabase-schema.sql','supabase-schema-upgrade.sql','supabase-schema-upgrade-3-daily.sql','supabase-launch-security.sql','supabase-refunds.sql'])await db.exec(readFileSync(f,'utf8'))
let provider,posts=0,mode='',settleError=false
const rpc=async(name,args)=>{if(name==='settle_refund'&&settleError){settleError=false;throw Error('simulated DB failure')}const entries=Object.entries(args);return (await db.query(`SELECT ${name}(${entries.map(([k],i)=>`${k} => $${i+1}`).join(',')}) value`,entries.map(([,v])=>v))).rows[0]?.value}
const ports={rpc,now:()=>Date.now(),order:async id=>(await db.query('SELECT * FROM commerce_orders WHERE order_id=$1',[id])).rows[0],known:async id=>(await db.query('SELECT id,status,transaction_key FROM refund_requests WHERE order_id=$1',[id])).rows,payment:async()=>{if(mode==='offline')throw Error('offline');return structuredClone(provider)},cancel:async(key,amount,reason,idempotency)=>{
 posts++;assert.equal(key,provider.paymentKey);assert.ok(idempotency.startsWith('refund-'));assert.equal(amount,1900)
 if(mode==='lost-before-provider'){mode='offline';throw Error('lost request')}
 if(!provider.cancels.length){provider.cancels.push({transactionKey:'tx-'+reason,cancelReason:reason,cancelAmount:amount,cancelStatus:'DONE'});provider.balanceAmount-=amount;provider.status='CANCELED'}
 if(mode==='lost-success'){mode='';throw Error('lost response')}
 return structuredClone(provider)
}}
async function setup(id){posts=0;mode='';await db.query('INSERT INTO users(id,yeobjeun_balance) VALUES($1,0)',[id]);await db.query("INSERT INTO commerce_orders(order_id,user_id,product,amount,coins,consent_version,payment_key) VALUES($1,$1,'one',1900,1,'test',$2)",[id,'key-'+id]);await rpc('complete_payment',{p_order:id,p_key:'key-'+id,p_amount:1900});provider={orderId:id,paymentKey:'key-'+id,totalAmount:1900,balanceAmount:1900,status:'DONE',currency:'KRW',method:'카드',isPartialCancelable:true,cancels:[]};return rpc('request_refund',{p_user:id,p_order:id,p_kind:'unused',p_reason:'',p_key:'request-'+id,p_job:null})}
const row=async id=>(await db.query('SELECT * FROM refund_requests WHERE id=$1',[id])).rows[0]
let r=await setup('success');await Promise.all([processRefund(ports,r.id),processRefund(ports,r.id)]);assert.equal(posts,1);assert.equal((await row(r.id)).status,'succeeded');await processRefund(ports,r.id);assert.equal(posts,1)
r=await setup('lost-response');mode='lost-success';await processRefund(ports,r.id);assert.equal((await row(r.id)).status,'succeeded');assert.equal(posts,1)
r=await setup('lost-db');settleError=true;await processRefund(ports,r.id);assert.equal((await row(r.id)).status,'succeeded');assert.equal(posts,1)
r=await setup('unknown');mode='lost-before-provider';await processRefund(ports,r.id);assert.equal((await row(r.id)).status,'uncertain');assert.equal((await row(r.id)).held,1);mode='';await processRefund(ports,r.id);assert.equal((await row(r.id)).status,'succeeded');assert.equal(posts,2);assert.equal(provider.cancels.length,1)
r=await setup('expired-retry');await db.query("UPDATE refund_requests SET submitted_at=now()-interval '2 days',status='uncertain' WHERE id=$1",[r.id]);await processRefund(ports,r.id);assert.equal(posts,0);assert.equal((await row(r.id)).status,'blocked')
r=await setup('foreign-payment');provider.orderId='someone-else';await processRefund(ports,r.id);assert.equal(posts,0);assert.equal((await row(r.id)).status,'uncertain')
r=await setup('external');provider.cancels=[{transactionKey:'external-cancel',cancelReason:'토스 관리자 취소',cancelAmount:1900,cancelStatus:'DONE'}];provider.status='CANCELED';provider.balanceAmount=0;await processRefund(ports,r.id);assert.equal(posts,0);assert.equal((await row(r.id)).status,'blocked')
// A confirmed, same-amount external receipt can be linked without a second cancellation.
const link={p_id:r.id,p_transaction:'external-cancel',p_amount:1900,p_actor:'owner',p_note:'토스 취소 거래와 신청 금액 일치 확인'}
await assert.rejects(rpc('settle_external_refund',{...link,p_amount:2000}));assert.equal((await row(r.id)).status,'blocked')
await rpc('settle_external_refund',link);await rpc('settle_external_refund',link)
await inspectRefundPayment(ports,await ports.order(r.order_id),provider)
assert.equal((await row(r.id)).status,'succeeded');assert.equal((await ports.order(r.order_id)).refund_review,false);assert.equal(posts,0)
assert.equal((await db.query("SELECT count(*)::int n FROM refund_events WHERE refund_id=$1 AND event='external_linked'",[r.id])).rows[0].n,1)
r=await setup('pending');provider.cancels=[{transactionKey:'pending',cancelReason:'sajugung:'+r.id,cancelAmount:1900,cancelStatus:'PENDING'}];await processRefund(ports,r.id);assert.equal(posts,0);assert.equal((await row(r.id)).status,'uncertain');provider.cancels[0].cancelStatus='DONE';provider.balanceAmount=0;provider.status='CANCELED';await processRefund(ports,r.id);assert.equal((await row(r.id)).status,'succeeded')
r=await setup('virtual');provider.method='가상계좌';await processRefund(ports,r.id);assert.equal(posts,0);assert.equal((await row(r.id)).status,'blocked')
// Webhook settlement is idempotent and never grants credits again.
r=await setup('webhook');provider.cancels=[{transactionKey:'webhook-tx',cancelReason:'sajugung:'+r.id,cancelAmount:1900,cancelStatus:'DONE'}];provider.balanceAmount=0;provider.status='CANCELED';await inspectRefundPayment(ports,await ports.order(r.order_id),provider);await inspectRefundPayment(ports,await ports.order(r.order_id),provider);assert.equal((await row(r.id)).status,'succeeded');assert.equal((await ports.order(r.order_id)).refunded_amount,1900)
console.log('PASS refund engine + real SQL: parallel processor; lost provider response; lost DB save; ambiguous retry with same key; retry cutoff; foreign order; out-of-band cancellation; pending vs done; unsupported payment; repeated webhook')
await db.close()
