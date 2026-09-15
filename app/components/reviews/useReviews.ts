'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PublicReview } from '@/lib/reviews-policy'
export type ReviewPage = { items: PublicReview[]; nextCursor: string | null }
export async function fetchReviewJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, cache: 'no-store' })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.error || '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.')
  if (!result) throw new Error('후기를 불러오지 못했어요. 다시 시도해주세요.')
  return result as T
}
export function useReviews() {
  const [page, setPage] = useState<ReviewPage>({ items: [], nextCursor: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const active = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    try {
      const result = await fetchReviewJson<ReviewPage>('/api/reviews', { signal: controller.signal })
      if (!controller.signal.aborted) { setPage(result); setError('') }
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '후기를 불러오지 못했어요.')
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }, [])
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0)
    const whenVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    const timer = setInterval(whenVisible, 25000)
    document.addEventListener('visibilitychange', whenVisible)
    window.addEventListener('online', whenVisible)
    return () => { clearTimeout(initial); clearInterval(timer); active.current?.abort(); document.removeEventListener('visibilitychange', whenVisible); window.removeEventListener('online', whenVisible) }
  }, [refresh])
  return { page, loading, error, refresh }
}
