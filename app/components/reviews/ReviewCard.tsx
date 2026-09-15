import type { PublicReview } from '@/lib/reviews-policy'
import './reviews.css'

export default function ReviewCard({ review }: { review: PublicReview }) {
  const date = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(review.createdAt))
  return <article className="rv-card">
    <header>
      <b>{review.displayName}</b>
      <span>이용 확인</span>
    </header>
    <div className="rv-meta">
      <span aria-label={`별점 5점 중 ${review.rating}점`}>{'★'.repeat(review.rating)}<span className="rv-unrated">{'★'.repeat(5 - review.rating)}</span></span>
      <small><time dateTime={review.createdAt}>{date}</time>{review.updatedAt !== review.createdAt ? ' · 수정됨' : ''}</small>
    </div>
    <p>{review.body}</p>
  </article>
}
