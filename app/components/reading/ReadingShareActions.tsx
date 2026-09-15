'use client'
import { useState } from 'react'
import { ensureKakaoReady, getKakaoDiagnostics, KAKAO_READY_MESSAGE } from '@/lib/kakaoShare'

export default function ReadingShareActions({
  shareId,
  title,
  description,
  imagePath,
}: {
  shareId: string
  title: string
  description: string
  imagePath: string
}) {
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState('')
  const [manualUrl, setManualUrl] = useState('')

  const sharedUrl = async () => {
    const response = await fetch(`/api/readings/${shareId}/share`, { method: 'POST' })
    const data = await response.json() as { path?: string; error?: string }
    if (!response.ok || typeof data.path !== 'string' || !data.path.startsWith('/share/')) {
      throw new Error(data.error || '공유 링크를 만들지 못했습니다.')
    }
    return window.location.origin + data.path
  }

  const handleCopy = async () => {
    setError('')
    let url = ''
    try {
      url = await sharedUrl()
    } catch (e) {
      setError(e instanceof Error ? e.message : '공유 링크를 만들지 못했습니다.')
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setManualUrl('')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setManualUrl(url)
      setError('자동 복사에 실패했어요. 아래 공유 주소를 직접 복사해주세요.')
    }
  }

  const handleKakao = async () => {
    setError('')
    setSharing(true)
    let url = ''
    try {
      url = await sharedUrl()
    } catch (e) {
      setError(e instanceof Error ? e.message : '공유 링크를 만들지 못했습니다.')
      setSharing(false)
      return
    }
    const ready = await ensureKakaoReady()
    if (!ready.ok) {
      setManualUrl(url)
      setError(KAKAO_READY_MESSAGE[ready.reason])
      setSharing(false)
      return
    }
    const imageUrl = `${window.location.origin}${imagePath}`
    try {
      ;(window as unknown as { Kakao: { Share: { sendDefault: (value: unknown) => void } } }).Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description,
          imageUrl,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [{ title: '풀이 보기', link: { mobileWebUrl: url, webUrl: url } }],
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : '카카오 공유에 실패했어요.'
      setManualUrl(url)
      setError(message)
      console.error(JSON.stringify({ tag: '사주궁:kakao', event: 'share_send_failed', err: message, ...getKakaoDiagnostics() }))
    } finally {
      setSharing(false)
    }
  }

  const endShare = async () => {
    try {
      const response = await fetch(`/api/readings/${shareId}/share`, { method: 'DELETE' })
      setError(response.ok ? '기존 공유 링크를 종료했습니다.' : '공유 종료에 실패했습니다.')
      if (response.ok) setManualUrl('')
    } catch {
      setError('공유 종료에 실패했습니다. 다시 시도해주세요.')
    }
  }

  return (
    <div className="rr-share-panel">
      <p>공유 링크를 가진 사람은 해석 본문을 볼 수 있습니다. 생년월일 입력표와 선택 질문은 공유에서 제외됩니다.</p>
      <button type="button" className="rr-kakao-share" disabled={sharing} onClick={() => void handleKakao()}>
        {sharing ? '카카오 공유 준비 중...' : '카카오톡 공유하기'}
      </button>
      <button type="button" className="rr-copy-share" onClick={() => void handleCopy()}>
        {copied ? '링크를 복사했어요' : '공유 링크 복사하기'}
      </button>
      <button type="button" className="rr-end-share" onClick={() => void endShare()}>기존 공유 링크 종료</button>
      {error && <p className="rr-share-status" role="status">{error}</p>}
      {manualUrl && (
        <label className="rr-share-manual">
          공유 주소
          <input readOnly value={manualUrl} onFocus={e => e.currentTarget.select()} />
        </label>
      )}
    </div>
  )
}
