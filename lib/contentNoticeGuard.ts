import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { loadContentNoticeAck, logContentNoticeEvent } from '@/lib/contentNoticeDb'
import { CONTENT_NOTICE_VERSION } from '@/lib/contentNotice'

export type NoticeGate =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }

export async function requireContentNotice(): Promise<NoticeGate> {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    logContentNoticeEvent('generate_blocked', { reason: 'login_required' })
    return {
      ok: false,
      response: NextResponse.json(
        { error: '로그인이 필요합니다.', code: 'login_required' },
        { status: 401 }
      ),
    }
  }

  const ack = await loadContentNoticeAck(userId, CONTENT_NOTICE_VERSION)
  if (ack.status === 'acked') return { ok: true, userId }
  if (ack.status === 'unavailable') {
    logContentNoticeEvent('generate_blocked', { reason: 'unavailable' })
    return {
      ok: false,
      response: NextResponse.json(
        { error: '콘텐츠 안내 확인을 확인할 수 없습니다.', code: 'content_notice_unavailable' },
        { status: 503 }
      ),
    }
  }

  logContentNoticeEvent('generate_blocked', { reason: 'notice_required' })
  return {
    ok: false,
    response: NextResponse.json(
      { error: '콘텐츠 안내 확인이 필요합니다.', code: 'content_notice_required' },
      { status: 403 }
    ),
  }
}
