'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { REVIEW_MAX_CHARS, reviewLength, type PublicReview } from '@/lib/reviews-policy'
import { fetchReviewJson, useReviews, type ReviewPage } from '@/app/components/reviews/useReviews'
import ReviewCard from '@/app/components/reviews/ReviewCard'
import '@/app/components/reviews/reviews.css'

type MyStatus = { eligible: boolean; review: PublicReview | null }

export default function ReviewsPage() {
  const { status, data: session } = useSession()
  const viewerId = (session?.user as { id?: string } | undefined)?.id
  const { page, loading, error, refresh } = useReviews()
  const [mine, setMine] = useState<MyStatus | null>(null)
  const [myError, setMyError] = useState('')
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [older, setOlder] = useState<PublicReview[]>([])
  const [olderCursor, setOlderCursor] = useState<string | null | undefined>(undefined)
  const [moreBusy, setMoreBusy] = useState(false)
  const [moreError, setMoreError] = useState('')
  const [hiddenId, setHiddenId] = useState<string | null>(null)
  const loadMine = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await fetchReviewJson<MyStatus>('/api/reviews/me', { signal })
      if (!signal?.aborted) { setMine(result); setRating(result.review?.rating || 5); setBody(result.review?.body || ''); setMyError('') }
    } catch (error) { if (!signal?.aborted) setMyError(error instanceof Error ? error.message : '작성 권한을 확인하지 못했어요.') }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    const initial = setTimeout(() => {
      setMine(null); setBody(''); setMyError('')
      if (status === 'authenticated') void loadMine(controller.signal)
    }, 0)
    return () => { clearTimeout(initial); controller.abort() }
  }, [status, viewerId, loadMine])
  const length = reviewLength(body.normalize('NFC'))
  const items = [...page.items, ...older].filter((item, index, all) => item.id !== hiddenId && all.findIndex(value => value.id === item.id) === index)
  const cursor = olderCursor === undefined ? page.nextCursor : olderCursor
  async function save() {
    setBusy(true); setNotice(''); setConfirmDelete(false)
    try {
      const result = await fetchReviewJson<{ review: PublicReview }>('/api/reviews/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, body }) })
      setMine({ eligible: true, review: result.review }); setBody(result.review.body); setHiddenId(null); setOlder([]); setOlderCursor(undefined)
      setNotice('후기를 저장했어요. 홈과 게시판에 공개됩니다.'); await refresh()
    } catch (error) { setNotice(error instanceof Error ? error.message : '저장하지 못했어요.') }
    finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true); setNotice('')
    try {
      await fetchReviewJson('/api/reviews/me', { method: 'DELETE' })
      setHiddenId(mine?.review?.id || null); setMine(mine ? { ...mine, review: null } : null); setBody(''); setRating(5); setConfirmDelete(false)
      setNotice('내 후기를 삭제했어요.'); await refresh()
    } catch (error) { setNotice(error instanceof Error ? error.message : '삭제하지 못했어요.') }
    finally { setBusy(false) }
  }
  async function loadMore() {
    if (!cursor) return
    setMoreBusy(true); setMoreError('')
    try { const result = await fetchReviewJson<ReviewPage>('/api/reviews?cursor=' + encodeURIComponent(cursor)); setOlder(current => [...page.items, ...current, ...result.items]); setOlderCursor(result.nextCursor) }
    catch (error) { setMoreError(error instanceof Error ? error.message : '이전 후기를 불러오지 못했어요.') }
    finally { setMoreBusy(false) }
  }
  return <main className="rv-board">
    <div className="mx-auto max-w-md px-4 pb-24 pt-5">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm text-[#d4bc92]">← 사주궁으로</Link>
      <p className="mt-5 text-xs font-semibold tracking-widest text-[#c6a66d]">사주궁 이용 이야기</p>
      <h1 className="mb-3 mt-2 text-2xl font-bold">다녀간 분들의 이야기</h1>
      <p className="mb-6 text-sm leading-7 text-[#c4cdd8]">어떤 점이 좋았나요? 아쉬웠던 점도 편하게 남겨주세요. 실제 풀이 결과를 이용한 회원이 작성하는 공간이에요.</p>

      <section aria-labelledby="write-review" className="rv-form">
        <h2 id="write-review" className="mb-3 font-bold">{mine?.review ? '내 후기 수정' : '후기 남기기'}</h2>
        {status === 'unauthenticated' ? <p className="text-sm leading-7 text-[#c4cdd8]">로그인 후 이용 후기를 남길 수 있어요. <Link href="/login?callbackUrl=%2Freviews" className="text-[#d4bc92] underline underline-offset-4">로그인하기</Link></p>
          : status === 'loading' || (!mine && !myError) ? <p role="status" className="text-sm text-[#c4cdd8]">작성 권한을 확인하고 있어요.</p>
          : myError ? <p role="status" className="text-sm leading-6 text-amber-200">{myError} <button type="button" onClick={() => void loadMine()} className="underline underline-offset-4">다시 확인</button></p>
          : <>
            {!mine?.eligible && <p className="mb-3 text-sm leading-7 text-[#c4cdd8]">풀이 결과를 이용한 후 작성할 수 있어요. <Link href="/storage" className="text-[#d4bc92] underline underline-offset-4">내 보관함</Link></p>}
            {mine?.eligible && <form onSubmit={event => { event.preventDefault(); void save() }}>
              <fieldset disabled={busy} className="mb-4">
                <legend className="mb-2 text-sm text-[#e0e5ec]">별점</legend>
                <div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map(value => <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm ${rating === value ? 'border-[#c6a66d] bg-[#c6a66d]/15 text-[#f0debd]' : 'border-[#455365] text-[#c4cdd8]'}`}><input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} className="accent-[#c6a66d]" />{value}점</label>)}</div>
              </fieldset>
              <label htmlFor="review-body" className="mb-2 block text-sm text-[#e0e5ec]">후기 내용</label>
              <textarea id="review-body" value={body} onChange={event => setBody(event.target.value)} disabled={busy} rows={5} aria-describedby="review-help review-length" placeholder="이용하며 느낀 점을 400자 안으로 남겨주세요." className="w-full resize-y rounded-md border border-[#5c6a7b] bg-[#0c1119] p-3 text-sm leading-7 text-white placeholder:text-[#a7b3c3] focus:border-[#c6a66d]" />
              <p id="review-length" className={`mb-3 mt-1 text-right text-xs ${length > REVIEW_MAX_CHARS ? 'text-rose-300' : 'text-[#a7b3c3]'}`}>{length} / {REVIEW_MAX_CHARS}자</p>
              <p id="review-help" className="mb-4 text-xs leading-6 text-[#a7b3c3]">후기는 홈과 게시판에 공개돼요. 실명, 연락처, 생년월일 등 개인정보는 적지 마세요. 회원당 한 개의 후기를 수정하며 사용할 수 있어요.</p>
              <button type="submit" disabled={busy || !body.trim() || length > REVIEW_MAX_CHARS} className="min-h-11 w-full rounded-md bg-[#c6a66d] px-4 py-3 text-sm font-bold text-[#17202c] disabled:bg-[#344151] disabled:text-[#a7b3c3]">{busy ? '처리 중…' : mine.review ? '후기 수정하기' : '후기 공개 등록하기'}</button>
            </form>}
            {mine?.review && <div className="mt-3">{confirmDelete ? <div className="rounded-md border border-rose-300/30 p-3"><p className="mb-2 text-sm text-[#e0e5ec]">내 후기를 삭제할까요?</p><div className="flex gap-3"><button type="button" disabled={busy} onClick={() => void remove()} className="min-h-11 px-2 text-sm text-rose-200">삭제하기</button><button type="button" disabled={busy} onClick={() => setConfirmDelete(false)} className="min-h-11 px-2 text-sm text-[#c4cdd8]">돌아가기</button></div></div> : <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)} className="min-h-11 text-xs text-[#a7b3c3] underline underline-offset-4">내 후기 삭제</button>}</div>}
          </>}
        {notice && <p role="status" className="mt-3 text-sm leading-6 text-[#d4bc92]">{notice}</p>}
      </section>

      <section aria-labelledby="review-list-title">
        <div className="mb-1 flex items-center justify-between gap-2"><h2 id="review-list-title" className="font-bold">이용 후기</h2><button type="button" onClick={() => { setOlder([]); setOlderCursor(undefined); setHiddenId(null); void refresh() }} className="min-h-11 text-xs text-[#d4bc92]">전체 새로고침</button></div>
        <p className="mb-4 text-xs leading-6 text-[#a7b3c3]">최신 후기부터 보여드려요. 새 후기는 자동으로 반영됩니다.</p>
        {error && <p role="status" className="mb-4 rounded-md bg-amber-500/10 p-3 text-sm leading-6 text-amber-200">{error}{!!items.length && ' 마지막으로 불러온 후기를 표시하고 있어요.'}</p>}
        {loading ? <p role="status" className="py-8 text-center text-sm text-[#a7b3c3]">후기를 불러오고 있어요.</p> : !items.length && !error ? <p className="rounded-md bg-[#17202c] px-4 py-8 text-center text-sm text-[#c4cdd8]">아직 등록된 후기가 없어요.<br /><span className="mt-2 inline-block text-[#a7b3c3]">첫 이야기를 들려주세요.</span></p> : <div className="space-y-0">{items.map(review => <ReviewCard key={review.id} review={review} />)}</div>}
        {moreError && <p role="status" className="mt-3 text-sm text-amber-200">{moreError}</p>}
        {cursor && <button type="button" disabled={moreBusy} onClick={() => void loadMore()} className="mt-4 min-h-11 w-full rounded-md border border-[#455365] py-3 text-sm text-[#e0e5ec] disabled:opacity-50">{moreBusy ? '불러오는 중…' : '이전 후기 더 보기'}</button>}
      </section>
    </div>
  </main>
}
