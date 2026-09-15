import { NextRequest, NextResponse } from 'next/server'
import { failure, requireUser, rpc } from '@/lib/server-access'
export async function POST(req: NextRequest) {
 try { return NextResponse.json(await rpc('check_attendance',{p_user:await requireUser(req)})) }
 catch(e){return failure(e)}
}
