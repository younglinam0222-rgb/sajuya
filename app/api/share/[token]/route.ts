import { NextRequest,NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { publicReading } from '@/lib/share-projection'
export async function GET(_req:NextRequest,{params}:{params:Promise<{token:string}>}) {
 const {token}=await params
 if(!/^[a-f0-9]{48}$/.test(token)) return new NextResponse(null,{status:404})
 const {data,error}=await createServerSupabase().from('readings').select('ai_result,is_paid,access_verified,product').eq('share_token',token).maybeSingle()
 if(error) return new NextResponse(null,{status:503})
 if(data?.product==='conversation'||!data?.access_verified||(!data.is_paid&&data.product!=='daily')) return new NextResponse(null,{status:404})
 try {return NextResponse.json(publicReading(data.ai_result),{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})}
 catch{return new NextResponse(null,{status:503})}
}
