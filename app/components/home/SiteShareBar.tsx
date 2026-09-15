'use client'
import { useState } from 'react'
import { ensureKakaoReady, getKakaoDiagnostics, KAKAO_READY_MESSAGE } from '@/lib/kakaoShare'

export default function SiteShareBar() {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [manualUrl, setManualUrl] = useState('')

  const siteUrl = () => {
    if (typeof window === 'undefined') return ''
    return window.location.origin + '/'
  }

  const copyLink = async () => {
    const url = siteUrl()
    setError('')
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setManualUrl('')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setManualUrl(url)
      setError('자동 복사에 실패했어요. 아래 주소를 직접 복사해주세요.')
    }
  }

  const kakaoShare = async () => {
    const url = siteUrl()
    setError('')
    const ready = await ensureKakaoReady()
    if (!ready.ok) {
      setError(KAKAO_READY_MESSAGE[ready.reason])
      setManualUrl(url)
      return
    }
    try {
      ;(window as unknown as { Kakao: { Share: { sendDefault: (value: unknown) => void } } }).Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: '사주궁',
          description: '일일운세 첫 1회 무료 · 나를 읽는 사주 풀이',
          imageUrl: `${window.location.origin}/characters/baekhalma.png`,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [{ title: '사주궁 둘러보기', link: { mobileWebUrl: url, webUrl: url } }],
      })
    } catch (e) {
      setManualUrl(url)
      setError(e instanceof Error ? e.message : '카카오 공유에 실패했어요.')
      console.error(JSON.stringify({ tag: '사주궁:kakao', event: 'site_share_failed', ...getKakaoDiagnostics() }))
    }
  }

  return (
    <aside className="sg-site-share">
      <p>사주궁을 친구에게 알려주세요</p>
      <div>
        <button type="button" className="sg-kakao-share" onClick={() => void kakaoShare()}>카카오톡 공유</button>
        <button type="button" onClick={() => void copyLink()}>{copied ? '링크를 복사했어요' : '링크 복사'}</button>
      </div>
      {error && <p role="status">{error}</p>}
      {manualUrl && <input readOnly value={manualUrl} aria-label="사주궁 주소" onFocus={e => e.currentTarget.select()} />}
    </aside>
  )
}
