'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CONTENT_NOTICE_BODY,
  CONTENT_NOTICE_CHECKBOX_LABEL,
} from '@/lib/contentNotice'

type Props = {
  onConfirmed: () => void | Promise<void>
  submitLabel?: string
}

export default function ContentNoticeForm({ onConfirmed, submitLabel = '확인하고 계속하기' }: Props) {
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!checked || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/content-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          data.code === 'content_notice_unavailable' || data.code === 'unavailable'
            ? '확인 기록을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.'
            : '확인을 저장하지 못했습니다. 다시 시도해 주세요.'
        )
        return
      }
      await onConfirmed()
    } catch {
      setError('확인을 저장하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-800 bg-[#111118] p-4">
        <h2 className="text-white text-sm font-bold mb-3">콘텐츠 안내</h2>
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
          {CONTENT_NOTICE_BODY}
        </p>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        이 확인은 이용약관·개인정보·마케팅·결제 동의를 대신하지 않습니다.{' '}
        <Link href="/terms" className="underline text-gray-400">이용약관</Link>
        {' · '}
        <Link href="/privacy" className="underline text-gray-400">개인정보처리방침</Link>
      </p>

      <div className="flex items-start gap-3">
        <input
          id="content-notice-ack"
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
        />
        <label
          htmlFor="content-notice-ack"
          className="text-sm text-gray-300 leading-relaxed cursor-pointer min-h-11"
        >
          {CONTENT_NOTICE_CHECKBOX_LABEL}
        </label>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!checked || saving}
        className="w-full py-3.5 rounded-2xl font-bold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}
      >
        {saving ? '저장 중...' : submitLabel}
      </button>
    </div>
  )
}
