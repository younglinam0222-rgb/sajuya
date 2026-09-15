'use client'

import { sanitizeText } from '@/lib/sajuSanitize'

function FormattedAnswer({ text, highlightColor }: { text: string; highlightColor: string }) {
  const normalized = sanitizeText(text).replace(/\s*(첫째,|둘째,|셋째,|넷째,|다섯째,|⚠️)/g, '\n$1').trim()
  const lines = normalized.split('\n').map(l => l.trim()).filter(l => l !== '')
  return (
    <div className="text-gray-300 text-sm leading-relaxed space-y-3">
      {lines.map((line, i) => {
        const isNumbered = /^(첫째|둘째|셋째|넷째|다섯째|\d+[.)])/.test(line)
        const isWarning = line.startsWith('⚠️')
        return (isNumbered || isWarning) ? (
          <p key={i} className="font-semibold" style={{ color: highlightColor }}>{line}</p>
        ) : (
          <p key={i}>{line}</p>
        )
      })}
    </div>
  )
}

export default function PersonalQuestionCard({
  question,
  answer,
  charColor,
  locked = false,
  retrying = false,
  retryError = '',
  onRetry,
}: {
  question: string
  answer: string
  charColor: string
  locked?: boolean
  retrying?: boolean
  retryError?: string
  onRetry?: () => void
}) {
  const q = question.trim()
  if (!q) return null

  return (
    <div className="mx-4 mt-4 rounded-2xl p-4 border-2" style={{ borderColor: charColor, background: `${charColor}18` }}>
      <div className="flex items-center gap-2 mb-2">
        <span>🔮</span>
        <span className="font-bold text-sm" style={{ color: charColor }}>족집게 질문</span>
        {locked && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">잠김</span>}
      </div>
      <p className="text-sm text-white font-medium mb-3">“{sanitizeText(q)}”</p>
      {locked ? (
        <p className="text-sm text-gray-400">전체보기를 구매하면 답변을 확인할 수 있어요</p>
      ) : answer.trim() ? (
        <FormattedAnswer text={answer} highlightColor={charColor} />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-red-300">답변을 불러오지 못했어요</p>
          {retryError && <p className="text-xs text-gray-500">{retryError}</p>}
          {onRetry && (
            <button
              type="button"
              disabled={retrying}
              onClick={onRetry}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: charColor }}
            >
              {retrying ? '답변을 다시 생성하는 중...' : '이 질문만 다시 생성'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
