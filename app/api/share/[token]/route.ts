import { NextRequest, NextResponse } from 'next/server'
import { readPublicShare } from '@/lib/shareDb'
import { recordShareFunnel } from '@/lib/shareFunnel'
import { isShareTokenShape } from '@/lib/shareToken'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!isShareTokenShape(token)) {
    return NextResponse.json({ error: '공유된 풀이를 찾을 수 없습니다' }, { status: 404, headers: noStore() })
  }
  const result = await readPublicShare(token)
  if (!result.ok) {
    return NextResponse.json({ error: '공유가 중지되었거나 링크가 더 이상 유효하지 않습니다' }, { status: 404, headers: noStore() })
  }
  await recordShareFunnel({ event: 'share_page_view', token })
  return NextResponse.json(result.view, {
    headers: {
      ...noStore(),
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  })
}

function noStore() {
  return {
    'Cache-Control': 'private, no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
  }
}
