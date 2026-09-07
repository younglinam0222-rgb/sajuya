import { contentNoticeHref } from '@/lib/safeNextPath'

export type GenerateGate = 'ok' | 'login' | 'notice' | 'unavailable' | 'error'

export async function readGenerateGate(res: Response): Promise<GenerateGate> {
  if (res.status === 401) return 'login'
  if (res.status === 403 || res.status === 503) {
    try {
      const json = await res.clone().json() as { code?: string }
      if (json.code === 'content_notice_required') return 'notice'
      if (json.code === 'content_notice_unavailable') return 'unavailable'
    } catch {
      /* 본문이 SSE이면 JSON이 아님 */
    }
  }
  if (!res.ok) return 'error'
  return 'ok'
}

export function goToContentNotice(nextPath: string) {
  window.location.assign(contentNoticeHref(nextPath))
}

export function goToLoginForNotice(nextPath: string) {
  const notice = contentNoticeHref(nextPath)
  window.location.assign(`/login?callbackUrl=${encodeURIComponent(notice)}`)
}

export async function applyGenerateGate(res: Response, nextPath: string): Promise<GenerateGate> {
  const gate = await readGenerateGate(res)
  if (gate === 'notice') goToContentNotice(nextPath)
  if (gate === 'login') goToLoginForNotice(nextPath)
  return gate
}
