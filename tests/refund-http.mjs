import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {spawn} from 'node:child_process'
import {encode} from 'next-auth/jwt'
const origin='http://127.0.0.1:3114',calls=[]
const fake=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const b=JSON.parse(raw||'{}');calls.push({path:req.url,body:b});res.setHeader('Content-Type','application/json');if(req.method==='GET'&&req.url.startsWith('/rest/v1/refund_requests?'))return res.end(JSON.stringify({id:'11111111-1111-4111-8111-111111111111',status:'review',held:0}));if(req.url==='/rest/v1/rpc/refund_snapshot')return res.end(JSON.stringify({orders:[],refunds:[]}));if(req.url==='/rest/v1/rpc/request_refund')return res.end(JSON.stringify(b.p_order==='owned'?{id:'11111111-1111-4111-8111-111111111111',status:'review'}:{error:'missing'}));if(req.url==='/rest/v1/rpc/refund_review_quote')return res.end(JSON.stringify({eligible:true,amount:1900,coins:1}));if(req.url==='/rest/v1/rpc/decide_refund')return res.end(JSON.stringify({error:'quote_changed'}));res.statusCode=500;res.end('{}')})
await new Promise(resolve=>fake.listen(3110,'127.0.0.1',resolve))
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3114'],{env:{...process.env,NEXTAUTH_URL:origin,NEXTAUTH_SECRET:'refund-http-test',SUPABASE_URL:'http://127.0.0.1:3110',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3110',NEXT_PUBLIC_SUPABASE_ANON_KEY:'test',SUPABASE_SERVICE_ROLE_KEY:'test',ADMIN_USER_IDS:'owner',REFUNDS_ENABLED:'true',TOSS_SECRET_KEY:'',CRON_SECRET:'refund-worker-test'},stdio:['ignore','pipe','pipe']})
let logs='';server.stdout.on('data',b=>{logs=(logs+b).slice(-20000)});server.stderr.on('data',b=>{logs=(logs+b).slice(-20000)})
const expectStatus=async(response,status,label)=>{const result=await response;assert.equal(result.status,status,`${label}: ${result.status}; body=${(await result.clone().text()).slice(0,1000)}; mockPaths=${JSON.stringify(calls.map(c=>c.path))}`);return result}
try{
 let ready=false;for(let i=0;i<120;i++){try{const r=await fetch(origin+'/api/refunds');if(r.status===401){ready=true;break}}catch{}if(server.exitCode!==null)throw Error(logs);await new Promise(resolve=>setTimeout(resolve,150))}assert.ok(ready,'test server ready: '+logs)
 for(const path of ['/api/refunds','/api/admin/refunds'])for(const method of ['GET','POST'])assert.equal((await fetch(origin+path,{method})).status,401)
 for(const method of ['GET','POST'])assert.equal((await fetch(origin+'/api/internal/refunds',{method})).status,401)
 assert.equal(calls.length,0)
 const cookie=async sub=>'next-auth.session-token='+await encode({token:{sub},secret:'refund-http-test'})
 const buyer={Cookie:await cookie('buyer')},owner={Cookie:await cookie('owner')}
 assert.equal((await fetch(origin+'/api/admin/refunds',{headers:buyer})).status,403)
 const payload={orderId:'owned',kind:'unused',reason:'',jobId:null,requestId:'22222222-2222-4222-8222-222222222222',amount:1,userId:'victim',paymentKey:'forged'}
 const post=(path,b,extra={})=>fetch(origin+path,{method:'POST',headers:{...buyer,Origin:origin,'Content-Type':'application/json',...extra},body:JSON.stringify(b)})
 assert.equal((await post('/api/refunds',payload,{Origin:'https://attacker.example'})).status,403)
 assert.equal((await fetch(origin+'/api/refunds',{method:'POST',headers:{...buyer,'Content-Type':'application/json'},body:JSON.stringify(payload)})).status,403)
 assert.equal(calls.length,0)
 await expectStatus(post('/api/refunds',payload),200,'refund request through runtime SUPABASE_URL')
 const request=calls.find(c=>c.path.endsWith('/request_refund')).body
 assert.equal(request.p_user,'buyer');assert.equal(request.p_order,'owned');assert.ok(!('p_amount' in request));assert.ok(!('p_payment_key' in request))
 assert.equal((await post('/api/refunds',{...payload,orderId:'foreign'})).status,404)
 assert.equal((await post('/api/refunds',{...payload,requestId:'invalid'})).status,400)
 assert.equal((await post('/api/admin/refunds',{action:'approve',id:'11111111-1111-4111-8111-111111111111',note:'test',expectedAmount:1900})).status,403)
 const a=await fetch(origin+'/api/admin/refunds',{headers:owner});assert.equal(a.status,200);assert.equal(a.headers.get('cache-control'),'private, no-store')
 assert.equal((await post('/api/admin/refunds',{action:'quote',id:'11111111-1111-4111-8111-111111111111'},owner)).status,200)
 assert.equal((await post('/api/admin/refunds',{action:'approve',id:'11111111-1111-4111-8111-111111111111',note:'확인',expectedAmount:1900},owner)).status,409)
 const decision=calls.find(c=>c.path.endsWith('/decide_refund')).body;assert.equal(decision.p_actor,'owner')
 console.log('PASS real Next HTTP: anonymous/role denial; strict same-origin; worker secret; body validation; client amount/user/key ignored; order ownership; protected admin quote; stale approval rejection; no-store')
}finally{server.kill('SIGTERM');if(server.exitCode===null)await new Promise(resolve=>server.once('exit',resolve));await new Promise(resolve=>fake.close(resolve))}
