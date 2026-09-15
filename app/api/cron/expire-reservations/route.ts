import { NextRequest, NextResponse } from 'next/server'
import { expireFullviewDue } from '@/lib/fullviewDb'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function cronAuthorized(req: NextRequest) {
  if (req.headers.get('x-vercel-cron') === '1') return true
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  return !!secret && auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  const expired = await expireFullviewDue()
  return NextResponse.json({ expired })
}
