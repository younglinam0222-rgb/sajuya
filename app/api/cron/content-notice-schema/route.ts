import { NextRequest, NextResponse } from 'next/server'
import { logContentNoticeEvent, probeContentNoticeSchema } from '@/lib/contentNoticeDb'

export const dynamic = 'force-dynamic'

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
  const schema = await probeContentNoticeSchema()
  logContentNoticeEvent('schema_probe', schema)
  return NextResponse.json(schema)
}
