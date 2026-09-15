'use client'

import { useMemo, useState } from 'react'
import { buildPublicShareView, clipDisplayName, kakaoShareCard, type ShareSettings } from '@/lib/readingShare'
import { ensureKakaoReady, getKakaoDiagnostics, KAKAO_READY_MESSAGE } from '@/lib/kakaoShare'
import { sanitizeText } from '@/lib/sajuSanitize'

type Props = {
  shareId: string
  isPaid: boolean
  characterId: string
  aiResult: unknown
  initial?: ShareSettings | null
}

export default function ReadingSharePanel({ shareId, isPaid, characterId, aiResult, initial }: Props) {
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState(initial?.displayName || '친구')
  const [includePersonal, setIncludePersonal] = useState(!!initial?.includePersonal)
  const [settings, setSettings] = useState<ShareSettings | null>(initial ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const preview = useMemo(() => buildPublicShareView({
    aiResult,
    characterId,
    displayName,
    includePersonal,
  }), [aiResult, characterId, displayName, includePersonal])

  const publicUrl = settings?.publicPath
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${settings.publicPath}`
    : ''

  const save = async (action: 'enable' | 'disable' | 'reissue' | 'update') => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/readings/${shareId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, includePersonal, displayName: clipDisplayName(displayName) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '공유 설정을 저장하지 못했어요.')
        return
      }
      setSettings(data.settings)
    } catch {
      setError('공유 설정을 저장하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  const trackClick = () => {
    const token = settings?.publicPath?.split('/s/')[1] || null
    void fetch('/api/share/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'share_click', token }),
    })
  }

  const copyLink = async () => {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    trackClick()
    setTimeout(() => setCopied(false), 2000)
  }

  const kakaoShare = async () => {
    if (!publicUrl) return
    const ready = await ensureKakaoReady()
    if (!ready.ok) {
      setError(KAKAO_READY_MESSAGE[ready.reason])
      return
    }
    const card = kakaoShareCard(preview.displayName)
    trackClick()
    try {
      ;(window as any).Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: card.title,
          description: card.description,
          imageUrl: `${window.location.origin}/characters/baekhalma.png`,
          link: { mobileWebUrl: publicUrl, webUrl: publicUrl },
        },
        buttons: [{ title: '풀이 보기', link: { mobileWebUrl: publicUrl, webUrl: publicUrl } }],
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '카카오 공유에 실패했어요.')
      console.error(JSON.stringify({ tag: '사주궁:kakao', event: 'share_send_failed', ...getKakaoDiagnostics() }))
    }
  }

  if (!isPaid) return null

  return (
    <div className="px-4 mt-4 space-y-3">
      <button
        className="w-full py-4 rounded-2xl font-black text-base"
        style={{ background: '#fee500', color: '#3c1e1e' }}
        onClick={() => setOpen(true)}>
        친구에게 내 풀이 보여주기
      </button>

      {open && (
        <div className="rounded-2xl border border-purple-900/40 bg-[#111118] p-4 space-y-3">
          <p className="text-sm font-bold">공유하기 전에 확인할 것</p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            링크를 받은 사람은 로그인·결제 없이 아래 미리보기와 같은 내용을 봅니다. 받은 사람이 다시 전달하거나 화면을 캡처할 수 있어요.
          </p>
          <label className="block text-xs text-gray-400">공유용 별명
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value.slice(0, 12))}
              className="mt-1 w-full rounded-xl bg-[#0a0a0a] border border-gray-800 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-300">
            <input type="checkbox" checked={includePersonal} onChange={e => setIncludePersonal(e.target.checked)} />
            족집게 질문·답변도 포함
          </label>
          <div className="rounded-xl bg-[#0a0a0a] border border-gray-800 p-3 max-h-56 overflow-auto">
            <p className="text-xs text-purple-300 mb-2">공개될 실제 내용 미리보기</p>
            <p className="text-sm font-bold mb-2">{preview.displayName}님의 사주 풀이</p>
            <p className="text-[11px] text-gray-500 mb-2">
              판결문 {preview.titles.length}개 · 인생 전략 {preview.strategy ? '포함' : '없음'} · 족집게 {preview.includePersonal ? '포함' : '제외'}
            </p>
            {(preview.titles as { title?: string; content?: string }[]).slice(0, 2).map((t, i) => (
              <p key={i} className="text-[11px] text-gray-400 mb-2">
                {sanitizeText(t.title)} — {sanitizeText(String(t.content || '')).slice(0, 80)}
              </p>
            ))}
            {!preview.includePersonal && (
              <p className="text-[11px] text-gray-600">족집게 질문·생년월일·출생지·계정 정보는 응답에서 빠집니다.</p>
            )}
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy} onClick={() => save(settings?.enabled ? 'update' : 'enable')} className="py-2.5 rounded-xl text-xs font-bold text-white bg-purple-700 disabled:opacity-40">
              {settings?.enabled ? '설정 저장' : '공유 켜기'}
            </button>
            <button disabled={busy || !settings?.enabled} onClick={() => save('disable')} className="py-2.5 rounded-xl text-xs font-bold text-gray-300 bg-[#1a1a2e] disabled:opacity-40">
              공유 끄기
            </button>
          </div>
          {settings?.enabled && publicUrl && (
            <>
              <button onClick={kakaoShare} className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: '#fee500', color: '#3c1e1e' }}>
                카카오로 공유 링크 보내기
              </button>
              <button onClick={copyLink} className="w-full py-2.5 rounded-xl text-sm font-bold text-gray-300 bg-[#1a1a2e]">
                {copied ? '링크가 복사됐어요' : '공유 링크 복사'}
              </button>
              <button disabled={busy} onClick={() => save('reissue')} className="w-full py-2 text-[11px] text-gray-500">
                링크 재발급 (이전 링크는 즉시 막힘)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
