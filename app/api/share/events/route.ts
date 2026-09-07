import { NextRequest, NextResponse } from 'next/server'
import { rejectCrossSiteCookieMutation } from '@/lib/requestGuard'
import { isShareFunnelEvent } from '@/lib/readingShare'
import { recordShareFunnel } from '@/lib/shareFunnel'
import { isShareTokenShape } from '@/lib/shareToken'

export async function POST(req: NextRequest) {
  const csrf = rejectCrossSiteCookieMutation(req)
  if (csrf) return csrf
  const body = await req.json().catch(() => ({}))
  if (!isShareFunnelEvent(body.event)) {
    return NextResponse.json({ error: 'unknown event' }, { status: 400 })
  }
  if (body.event === 'purchase_complete') {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const token = isShareTokenShape(body.token) ? body.token : null
  await recordShareFunnel({ event: body.event, token })
  return NextResponse.json({ ok: true })
}
