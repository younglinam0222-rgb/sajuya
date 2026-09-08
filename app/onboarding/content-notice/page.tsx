'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import ContentNoticeForm from '@/app/components/ContentNoticeForm'
import { contentNoticeHref, safeNextPath } from '@/lib/safeNextPath'

export default function ContentNoticeOnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status, update } = useSession()
  const nextPath = safeNextPath(searchParams.get('next'), '/')
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sessionStuck, setSessionStuck] = useState(false)

  useEffect(() => {
    if (status !== 'loading') return
    const timer = window.setTimeout(() => setSessionStuck(true), 4000)
    return () => window.clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.replace(`/login?callbackUrl=${encodeURIComponent(contentNoticeHref(nextPath))}`)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/content-notice')
        if (res.status === 401) {
          router.replace(`/login?callbackUrl=${encodeURIComponent(contentNoticeHref(nextPath))}`)
          return
        }
        const data = await res.json()
        if (cancelled) return
        if (data.acknowledged === true) {
          router.replace(nextPath)
          return
        }
        setReady(true)
      } catch {
        if (!cancelled) setLoadError('확인 상태를 불러오지 못했습니다. 새로고침해 주세요.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [status, nextPath, router])

  if (status === 'loading' || !ready) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-gray-400 text-sm flex flex-col items-center justify-center px-6 text-center gap-3">
        <p>{loadError || (sessionStuck ? '로그인 상태를 확인하지 못했습니다.' : '확인 단계를 준비하고 있어요...')}</p>
        {sessionStuck && (
          <Link href={`/login?callbackUrl=${encodeURIComponent(contentNoticeHref(nextPath))}`} className="underline text-gray-300">
            로그인 화면으로 이동
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-16">
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-gray-400 text-xl">←</Link>
          <h1 className="text-xl font-bold">가입 마무리</h1>
        </div>
        <p className="text-sm text-gray-400 mb-5 leading-relaxed">
          {session?.user?.name ? `${session.user.name}님, ` : ''}
          서비스 이용 전에 아래 안내를 한 번만 확인해 주세요. 소셜 로그인만으로 확인한 것으로 보지 않습니다.
        </p>
        <ContentNoticeForm
          onConfirmed={async () => {
            await update()
            router.replace(nextPath)
          }}
        />
      </div>
    </div>
  )
}
