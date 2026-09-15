import { NextRequest, NextResponse } from 'next/server'
import { failure, rpc } from '@/lib/server-access'
import { publicReview, REVIEW_PAGE_SIZE } from '@/lib/reviews-policy'
import { parseReviewCursor, encodeReviewCursor } from '@/lib/reviews-service'

export async function GET(req: NextRequest) {
  try {
    const cursor = parseReviewCursor(req.nextUrl.searchParams.get('cursor'))
    const result = await rpc('list_public_reviews', { p_before_time: cursor.time, p_before_id: cursor.id, p_limit: REVIEW_PAGE_SIZE })
    if (!result || !Array.isArray(result.items)) throw new Error('Review list unavailable')
    const items = result.items.map(publicReview)
    if (items.some((item: unknown) => item === null)) throw new Error('Invalid review projection')
    const last = result.items.at(-1)
    return NextResponse.json({ items, nextCursor: result.hasMore && last ? encodeReviewCursor(last.created_at, last.id) : null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return failure(error) }
}
