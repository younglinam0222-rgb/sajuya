import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {spawn} from 'node:child_process'
import {encode} from 'next-auth/jwt'
const origin='http://127.0.0.1:3107',calls=[]
const base={name:'검증계정',year:'1986',month:'4',day:'19',hour:'09:35',characterId:'baekhalma'}
const conversationInput={...base,conversation:{roomId:'source--baekhalma',sourceId:'source',message:'이전 질문',previousId:null,maxCoins:1}}
const fake=createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk
 const b=JSON.parse(raw||'{}'),u=new URL(req.url,'http://localhost');calls.push({path:u.pathname,body:b})
 res.setHeader('Content-Type','application/json')
 if(u.pathname==='/rest/v1/generation_requests')return res.end(JSON.stringify({job_id:u.searchParams.get('request_id')==='eq.consent-request'?'old-conversation':'old-year-job'}))
 if(u.pathname==='/rest/v1/generation_jobs')return res.end(JSON.stringify(u.searchParams.get('id')==='eq.old-conversation'?{fingerprint:'previous-conversation-year',product:'conversation',input:conversationInput,status:'failed',updated_at:'2025-12-31T12:00:00Z'}:{fingerprint:'server-owned-previous-year',product:'saju',input:base}))
 if(u.pathname==='/rest/v1/rpc/reserve_generation')return res.end(JSON.stringify({cached:true,response:'data: '+JSON.stringify({text:'saved'})+'\n\ndata: [DONE]\n\n'}))
 if(u.pathname==='/rest/v1/commerce_orders')return res.end(JSON.stringify({order_id:'pending-unlock',product:'unlock',amount:4900,status:'pending'}))
 if(u.pathname==='/rest/v1/readings')return res.end(JSON.stringify({share_id:'locked',user_id:'buyer',is_paid:true,access_verified:false,product:'saju',saju_data:{form:{}},ai_result:JSON.stringify({titles:[{title:'SAMPLE',content:'ONE_ONLY'},{title:'HIDDEN',content:'PAID_SECRET'}],personalAnswer:{answer:'PRIVATE_QUESTION'}})}))
 res.end('null')
})
await new Promise(r=>fake.listen(3110,'127.0.0.1',r))
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3107'],{env:{PATH:process.env.PATH,NEXTAUTH_URL:origin,NEXTAUTH_SECRET:'build-placeholder',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3110',NEXT_PUBLIC_SUPABASE_ANON_KEY:'build-placeholder',SUPABASE_SERVICE_ROLE_KEY:'build-placeholder',CONVERSATION_ENABLED:'true',CONVERSATION_COST_COINS:'1',ANTHROPIC_API_KEY:'test-placeholder-cached-responses-only'},stdio:'ignore'})
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(origin)).status===200){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,200))}assert.ok(ready,'isolated Next server startup')
 const auth={Cookie:'next-auth.session-token='+await encode({token:{sub:'buyer'},secret:'build-placeholder'}),'Content-Type':'application/json',Origin:origin}
 const post=(route,body,headers=auth)=>fetch(origin+'/api/'+route,{method:'POST',headers,body:JSON.stringify(body)})
 for(const route of ['saju','daily','gunghap','daeun','yearly','taekil','chat','conversation','attendance','readings/save','pay/ready','pay/confirm','refunds','readings/known/share'])assert.equal((await post(route,{},{})).status,401,route)
 for(const route of ['readings/known','result/known','storage','pay/order/known','refunds'])assert.equal((await fetch(origin+'/api/'+route)).status,401,route)
 assert.equal((await post('saju',{...base,requestId:'same-request-2026'})).status,200)
 assert.equal(calls.find(c=>c.path==='/rest/v1/rpc/reserve_generation').body.p_hash,'server-owned-previous-year')
 const count=calls.length
 assert.equal((await post('saju',{...base,retry:{personal:true}})).status,400)
 assert.equal((await post('saju',{...base,month:'2',day:'31'})).status,400)
 assert.equal((await post('saju',{...base,hour:'24:80'})).status,400)
 assert.equal((await post('pay/ready',{packageId:'unlock',agreed:true})).status,503)
 for(const product of ['gunghap','daeun','yearly','taekil'])assert.equal((await post(product,base)).status,503)
 assert.equal(calls.length,count,'invalid/paused requests must not touch DB or charge')
 assert.equal((await post('saju',{...base,name:'changed',requestId:'same-request-2026'})).status,409)
 assert.equal((await post('saju',base,{...auth,Origin:'https://elsewhere.example'})).status,403)
 const locked=await fetch(origin+'/api/readings/locked',{headers:auth});assert.equal(locked.status,200);const body=await locked.text();assert.ok(body.includes('ONE_ONLY'));assert.ok(!body.includes('PAID_SECRET'));assert.ok(!body.includes('PRIVATE_QUESTION'))
 assert.equal((await fetch(origin+'/api/pay/order/pending-unlock',{headers:auth})).status,503)
 const retry={sourceId:'source',characterId:'baekhalma',message:'이전 질문',previousId:null,requestId:'consent-request',maxCoins:0,consent:true},before=calls.filter(c=>c.path==='/rest/v1/rpc/reserve_generation').length
 assert.equal((await post('conversation',retry)).status,409)
 assert.equal(calls.filter(c=>c.path==='/rest/v1/rpc/reserve_generation').length,before,'changed maximum must not reserve')
 assert.equal((await post('conversation',{...retry,maxCoins:1})).status,200)
 assert.equal(calls.filter(c=>c.path==='/rest/v1/rpc/reserve_generation').at(-1).body.p_hash,'previous-conversation-year')
 console.log('PASS: real local Next HTTP; 19 auth gates; one sample only; cross-origin denial; stored fingerprint replay; changed input denial; invalid date/time and legacy retry no writes; paused products and pending unlock checkout blocked')
}finally{server.kill('SIGTERM');await new Promise(r=>fake.close(r))}
