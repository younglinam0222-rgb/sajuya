import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { CONTENT_NOTICE_VERSION } from '@/lib/contentNotice'
import { parseAckBody } from '@/lib/contentNoticeParse'
import { loadContentNoticeAck, logContentNoticeEvent, saveContentNoticeAck } from '@/lib/contentNoticeDb'

async function sessionUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | undefined)?.id ?? null
}

export async function GET() {
  const userId = await sessionUserId()
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.', code: 'login_required' }, { status: 401 })
  }

  const ack = await loadContentNoticeAck(userId)
  if (ack.status === 'unavailable') {
    return NextResponse.json({
      acknowledged: false,
      version: CONTENT_NOTICE_VERSION,
      persisted: false,
      code: 'content_notice_unavailable',
    })
  }
  if (ack.status === 'missing') {
    return NextResponse.json({
      acknowledged: false,
      version: CONTENT_NOTICE_VERSION,
      persisted: true,
    })
  }
  return NextResponse.json({
    acknowledged: true,
    version: ack.version,
    acknowledgedAt: ack.acknowledgedAt,
    persisted: true,
  })
}

export async function POST(req: NextRequest) {
  const userId = await sessionUserId()
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.', code: 'login_required' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바르지 않습니다.', code: 'invalid_body' }, { status: 400 })
  }

  const parsed = parseAckBody(body)
  if (!parsed.ok) {
    logContentNoticeEvent('ack_rejected', { code: parsed.code })
    return NextResponse.json(
      { error: '확인 값이 올바르지 않습니다.', code: parsed.code },
      { status: 400 }
    )
  }

  const saved = await saveContentNoticeAck(userId)
  if (!saved.ok) {
    return NextResponse.json(
      { error: '확인 기록을 저장할 수 없습니다.', code: saved.code },
      { status: saved.code === 'unavailable' ? 503 : 500 }
    )
  }

  logContentNoticeEvent('ack_saved', { duplicate: saved.duplicate })
  return NextResponse.json({
    ok: true,
    duplicate: saved.duplicate,
    version: CONTENT_NOTICE_VERSION,
    acknowledgedAt: saved.acknowledgedAt,
  })
}
