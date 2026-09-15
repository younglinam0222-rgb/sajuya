import { NextRequest, NextResponse } from 'next/server'
import { requireUser, failure, rpc, AccessError } from '@/lib/server-access'
import { publicReview, validateReview } from '@/lib/reviews-policy'
import { readReviewBody } from '@/lib/reviews-service'
const headers = { 'Cache-Control': 'private, no-store' }

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const result = await rpc('my_review_status', { p_user: user })
    if (!result || typeof result.eligible !== 'boolean') throw new Error('Review status unavailable')
    return NextResponse.json({ eligible: result.eligible, review: publicReview(result.review) }, { headers })
  } catch (error) { return failure(error) }
}
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const input = validateReview(await readReviewBody(req))
    if (!input) throw new AccessError(400, '별점 1~5점과 1~400자의 후기를 입력해주세요.')
    const result = await rpc('save_my_review', { p_user: user, p_rating: input.rating, p_body: input.body })
    if (result?.error === 'ineligible') throw new AccessError(403, '풀이 결과를 이용한 후 후기를 작성할 수 있어요.')
    if (result?.error === 'rate_limited') throw new AccessError(429, '잠시 후 다시 수정해주세요. 연속 수정은 10초 간격으로 가능해요.')
    const review = publicReview(result?.review)
    if (!review) throw new Error('Review was not saved')
    return NextResponse.json({ review }, { headers })
  } catch (error) { return failure(error) }
}
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req)
    await rpc('delete_my_review', { p_user: user })
    return NextResponse.json({ deleted: true }, { headers })
  } catch (error) { return failure(error) }
}
