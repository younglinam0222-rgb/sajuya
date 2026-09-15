export type ShareSettings = {
  enabled: boolean
  includePersonal: boolean
  displayName: string
  publicPath: string | null
}

export type PublicShareView = {
  displayName: string
  characterId: string
  titles: unknown[]
  strategy: unknown
  personalAnswer: { question: string; answer: string } | null
  includePersonal: boolean
}

function parseAi(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw)
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

export function clipDisplayName(raw: unknown, fallback = '친구') {
  const name = typeof raw === 'string' ? raw.trim().slice(0, 12) : ''
  return name || fallback
}

export function buildPublicShareView(input: {
  aiResult?: unknown
  characterId?: unknown
  displayName?: unknown
  includePersonal?: boolean
}): PublicShareView {
  const parsed = parseAi(input.aiResult) ?? {}
  const titles = Array.isArray(parsed.titles) ? parsed.titles : []
  const strategy = parsed.strategy && typeof parsed.strategy === 'object' ? parsed.strategy : null
  let personalAnswer: { question: string; answer: string } | null = null
  if (input.includePersonal && parsed.personalAnswer && typeof parsed.personalAnswer === 'object') {
    const pa = parsed.personalAnswer as { question?: unknown; answer?: unknown }
    if (typeof pa.answer === 'string' && pa.answer.trim()) {
      personalAnswer = {
        question: typeof pa.question === 'string' ? pa.question : '',
        answer: pa.answer,
      }
    }
  }
  return {
    displayName: clipDisplayName(input.displayName),
    characterId: typeof input.characterId === 'string' ? input.characterId : 'baekhalma',
    titles,
    strategy,
    personalAnswer,
    includePersonal: !!input.includePersonal && !!personalAnswer,
  }
}

export const SHARE_FUNNEL_EVENTS = ['share_click', 'share_page_view', 'share_cta_start', 'purchase_complete'] as const
export type ShareFunnelEvent = typeof SHARE_FUNNEL_EVENTS[number]

export function isShareFunnelEvent(v: unknown): v is ShareFunnelEvent {
  return typeof v === 'string' && (SHARE_FUNNEL_EVENTS as readonly string[]).includes(v)
}

export function kakaoShareCard(displayName: string) {
  return {
    title: `${displayName}님의 사주 풀이`,
    description: '사주궁에서 본 풀이예요. 생년월일이나 개인 질문은 미리보기에 넣지 않습니다.',
  }
}
