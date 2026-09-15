// Exercise the actual route/service source with a real SQL engine and a local
// provider response stub. No network, actual payment, or operational DB is used.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'
import ts from 'typescript'
import assert from 'node:assert/strict'

const root=process.cwd(),db=new PGlite(),providers=new Map()
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;`)
for(const f of ['supabase-schema.sql','supabase-schema-upgrade.sql','supabase-schema-upgrade-3-daily.sql','supabase-launch-security.sql','supabase-refunds.sql','supabase-chat.sql','supabase-conversation.sql'])await db.exec(readFileSync(f,'utf8'))
const rpc=async(name,args)=>{assert.match(name,/^[a-z_]+$/);const entries=Object.entries(args);return (await db.query(`SELECT ${name}(${entries.map(([k],i)=>`${k}=>$${i+1}`).join(',')}) value`,entries.map(([,v])=>v))).rows[0]?.value}
class Query {
 constructor(table){assert.match(table,/^[a-z_]+$/);this.table=table;this.filters=[];this.columns='*';this.maximum=null}
 select(columns){this.columns=columns;return this}
 eq(key,value){assert.match(key,/^[a-z_]+$/);this.filters.push([key,value]);return this}
 limit(n){this.maximum=n;return this}
 async run(single=false){
  try{assert.match(this.columns,/^[a-z_,*]+$/);const query=`SELECT ${this.columns} FROM ${this.table}${this.filters.length?' WHERE '+this.filters.map(([k],i)=>`${k}=$${i+1}`).join(' AND '):''}${this.maximum?' LIMIT '+this.maximum:''}`;const rows=(await db.query(query,this.filters.map(([,v])=>v))).rows;return {data:single?(rows[0]??null):rows,error:null}}
  catch(error){return {data:null,error}}
 }
 single(){return this.run(true)}
 maybeSingle(){return this.run(true)}
 then(resolve,reject){return this.run().then(resolve,reject)}
}
globalThis.__refundTestDb={from:table=>new Query(table),rpc:async(name,args)=>{try{return {data:await rpc(name,args),error:null}}catch(error){return {data:null,error}}}}
globalThis.__refundTestRpc=rpc
const hooks=registerHooks({
 resolve(specifier,context,next){
  if(specifier==='next/server')return {url:'test:next-server',shortCircuit:true}
  let target=specifier.startsWith('@/')?path.join(root,specifier.slice(2)):specifier.startsWith('.')&&context.parentURL?.startsWith('file:')?path.resolve(path.dirname(fileURLToPath(context.parentURL)),specifier):null
  if(target&&!path.extname(target)&&existsSync(target+'.ts'))target+='.ts'
  if(target===path.join(root,'lib/supabase.ts'))return {url:'test:supabase',shortCircuit:true}
  if(target===path.join(root,'lib/server-access.ts'))return {url:'test:server-access',shortCircuit:true}
  if(target&&existsSync(target))return {url:pathToFileURL(target).href,shortCircuit:true}
  return next(specifier,context)
 },
 load(url,context,next){
  const stubs={
   'test:next-server':`export class NextResponse extends Response {static json(data,init){return new Response(JSON.stringify(data),{...init,headers:{'Content-Type':'application/json',...init?.headers}})}} export const NextRequest=Request;`,
   'test:supabase':`export const createServerSupabase=()=>globalThis.__refundTestDb;`,
   'test:server-access':`export const rpc=globalThis.__refundTestRpc;export class AccessError extends Error{constructor(status,message){super(message);this.status=status}}export const failure=e=>new Response(JSON.stringify({error:e.message}),{status:e.status??503});export const requireUser=()=>{throw Error('Authentication must not be bypassed in this test')};`
  }
  if(stubs[url])return {format:'module',source:stubs[url],shortCircuit:true}
  if(url.startsWith('file:')&&url.endsWith('.ts')&&!url.includes('/node_modules/'))return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true}
  return next(url,context)
 }
})
const originalFetch=globalThis.fetch
let posts=0
globalThis.fetch=async(url,init={})=>{
 assert.ok(String(url).startsWith('https://api.tosspayments.com/v1/payments/'))
 if(init.method&&init.method!=='GET'){posts++;throw Error('Recovery must not issue a new payment or cancellation')}
 const key=decodeURIComponent(new URL(url).pathname.split('/').at(-1)),payment=providers.get(key)
 return new Response(JSON.stringify(payment??{}),{status:payment?200:404,headers:{'Content-Type':'application/json'}})
}
process.env.TOSS_SECRET_KEY='test-only-no-network'
process.env.REFUNDS_ENABLED='true'
const {POST}=await import('../app/api/pay/webhook/route.ts')
const {externalRefundMatches,attachExternalRefund,refundPorts}=await import('../lib/refund-service.ts')
const {inspectRefundPayment}=await import('../lib/refund-engine.ts')
const webhook=async(orderId,status='DONE')=>POST(new Request('http://local/api/pay/webhook',{method:'POST',body:JSON.stringify({data:{orderId,status}})}))
const payment=(orderId,key)=>({orderId,paymentKey:key,totalAmount:4900,balanceAmount:4900,status:'DONE',currency:'KRW',method:'카드',cancels:[]})
async function seedLegacy(share,key,alreadyVerified=false){
 const orderId='unlock_'+share+'_123'
 await db.query('INSERT INTO users(id,yeobjeun_balance) VALUES($1,7)',[key])
 const reading=(await db.query("INSERT INTO readings(share_id,user_id,character_id,saju_data,ai_result,access_verified,is_paid,share_token) VALUES($1,$2,'sinRyeong','{}','private result',$3,$3,$4) RETURNING id",[share,key,alreadyVerified,'a'.repeat(48-share.length)+share])).rows[0]
 await db.query("INSERT INTO payments(user_id,reading_id,order_id,toss_payment_key,amount,status) VALUES($1,$2,$3,$1,4900,'done')",[key,reading.id,orderId])
 providers.set(key,payment(orderId,key));return {orderId,key,reading:reading.id}
}
const readingState=async id=>(await db.query('SELECT access_verified,is_paid,share_token FROM readings WHERE id=$1',[id])).rows[0]

// Missing commerce_orders entry: real webhook -> provider GET -> registration -> entitlement.
const legacy=await seedLegacy('deadbeef','legacy-key')
assert.equal((await webhook(legacy.orderId,'CANCELED')).status,200) // payload status is ignored
assert.equal((await readingState(legacy.reading)).access_verified,true)
assert.equal((await db.query('SELECT product FROM commerce_orders WHERE order_id=$1',[legacy.orderId])).rows[0].product,'unlock')
const canceled=providers.get(legacy.key)
canceled.status='CANCELED';canceled.balanceAmount=0;canceled.cancels=[{transactionKey:'legacy-cancel',cancelAmount:4900,cancelReason:'Toss console',cancelStatus:'DONE'}]
assert.equal((await webhook(legacy.orderId)).status,200);assert.equal((await webhook(legacy.orderId)).status,200)
assert.deepEqual(await readingState(legacy.reading),{access_verified:false,is_paid:false,share_token:null})
assert.equal((await db.query("SELECT count(*)::int n FROM refund_requests WHERE transaction_key='legacy-cancel'")).rows[0].n,1)
assert.equal((await db.query('SELECT yeobjeun_balance FROM users WHERE id=$1',[legacy.key])).rows[0].yeobjeun_balance,7)
assert.equal((await db.query('SELECT count(*)::int n FROM credit_lots WHERE user_id=$1',[legacy.key])).rows[0].n,0)

// Previously orphaned trusted reading is revoked even if public refund reception is disabled.
const orphan=await seedLegacy('cafebabe','orphan-key',true),orphanPayment=providers.get(orphan.key)
orphanPayment.status='CANCELED';orphanPayment.balanceAmount=0;orphanPayment.cancels=[{transactionKey:'orphan-cancel',cancelAmount:4900,cancelReason:'console',cancelStatus:'DONE'}]
process.env.REFUNDS_ENABLED='false'
assert.equal((await webhook(orphan.orderId)).status,200)
assert.equal((await readingState(orphan.reading)).access_verified,false)
assert.equal((await webhook(orphan.orderId)).status,200)
process.env.REFUNDS_ENABLED='true'

// A mismatched provider response cannot grant access or create a purchase mapping.
const wrong=await seedLegacy('badc0ffe','mismatch-key')
providers.get(wrong.key).orderId=legacy.orderId
assert.equal((await webhook(wrong.orderId)).status,200)
assert.equal((await readingState(wrong.reading)).access_verified,false)
assert.equal((await db.query('SELECT count(*)::int n FROM commerce_orders WHERE order_id=$1',[wrong.orderId])).rows[0].n,0)

// First cancellation in the provider console: administrator sees a real match,
// attaches it once, and never initiates a second cancellation.
await db.exec("INSERT INTO users(id,yeobjeun_balance) VALUES('external-user',0); INSERT INTO commerce_orders(order_id,user_id,product,amount,coins,payment_key,consent_version) VALUES('external-order','external-user','one',1900,1,'external-key','test'); SELECT complete_payment('external-order','external-key',1900)")
const external={...payment('external-order','external-key'),totalAmount:1900,balanceAmount:0,status:'CANCELED',cancels:[{transactionKey:'external-first',cancelAmount:1900,cancelReason:'console first',cancelStatus:'DONE'}]}
providers.set('external-key',external)
await inspectRefundPayment(refundPorts,await refundPorts.order('external-order'),external)
const externalId=(await db.query("SELECT id FROM refund_requests WHERE order_id='external-order'")).rows[0].id
assert.deepEqual(await externalRefundMatches(externalId),[{transactionKey:'external-first',amount:1900}])
await attachExternalRefund(externalId,'external-first','admin','토스 취소 거래 대조')
assert.equal((await db.query("SELECT yeobjeun_balance FROM users WHERE id='external-user'")).rows[0].yeobjeun_balance,0)
assert.equal((await refundPorts.order('external-order')).refund_review,false)
await inspectRefundPayment(refundPorts,await refundPorts.order('external-order'),external)
assert.equal((await db.query("SELECT count(*)::int n FROM refund_requests WHERE transaction_key='external-first'")).rows[0].n,1)
assert.equal(posts,0)
console.log('PASS actual webhook + recovery/service source + full SQL: legacy registration, orphan cancellation, entitlement/share revocation, disabled-refund synchronization, provider mismatch rejection, unchanged legacy balance, first external cancellation admin matching/attachment, duplicate webhook, zero payment/cancel POSTs')
globalThis.fetch=originalFetch;hooks.deregister();delete globalThis.__refundTestDb;delete globalThis.__refundTestRpc
await db.close()
