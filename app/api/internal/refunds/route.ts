import {timingSafeEqual} from 'node:crypto'
import {NextRequest,NextResponse} from 'next/server'
import {runRefundBatch} from '@/lib/refund-service'
import {failure} from '@/lib/server-access'
async function handler(req:NextRequest){
 const key=process.env.CRON_SECRET,actual=Buffer.from(req.headers.get('authorization')??''),expected=Buffer.from('Bearer '+(key??''))
 if(!key||actual.length!==expected.length||!timingSafeEqual(actual,expected))return new NextResponse(null,{status:401})
 try{return NextResponse.json({checked:await runRefundBatch()},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}
}
export const GET=handler
export const POST=handler
export const maxDuration=240
