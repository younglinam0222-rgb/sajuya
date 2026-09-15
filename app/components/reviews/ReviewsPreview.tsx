'use client'
import Link from 'next/link'
import { useReviews } from './useReviews'
import ReviewCard from './ReviewCard'
import './reviews.css'

export default function ReviewsPreview() {
  const { page, loading, error, refresh } = useReviews()
  return <section aria-labelledby="home-reviews-title" className="sg-section rv-preview" id="reviews-preview">
    <div className="sg-heading">
      <h2 id="home-reviews-title">후기 게시판</h2>
      <Link href="/reviews">전체 후기 보기 →</Link>
    </div>
    <p className="rv-intro">사주궁을 읽은 뒤의 이야기 · 400자 이내</p>
    {error && <p role="status" className="rv-notice">{error} <button type="button" onClick={() => void refresh()}>다시 불러오기</button></p>}
    {loading ? <p className="rv-empty-inline" role="status">후기를 불러오고 있어요.</p>
      : !page.items.length && !error ? <div className="rv-empty-inline"><p>첫 번째 이야기를 기다립니다.</p><span>어떤 부분이 도움 됐는지, 무엇이 아쉬웠는지 남겨주세요.</span><Link href="/reviews">후기 작성하기 →</Link></div>
      : <div>{page.items.slice(0, 2).map(review => <ReviewCard key={review.id} review={review} />)}</div>}
  </section>
}
