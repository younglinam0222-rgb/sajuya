/** Open-redirect 방지. 사이트 내부 경로만 허용. */
export function safeNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback
  let value = raw.trim()
  try {
    value = decodeURIComponent(value)
  } catch {
    return fallback
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  if (value.startsWith('/onboarding/content-notice')) return fallback
  return value
}

export function contentNoticeHref(next?: string | null): string {
  const n = safeNextPath(next, '/')
  return `/onboarding/content-notice?next=${encodeURIComponent(n)}`
}
