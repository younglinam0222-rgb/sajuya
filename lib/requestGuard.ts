import { NextRequest, NextResponse } from 'next/server'

const MAX_JSON_BYTES = 40_000
const MAX_NAME = 40
const MAX_QUESTION = 200

export function originAllowed(req: NextRequest) {
  const allowed = process.env.NEXTAUTH_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  if (!origin && !referer) return false
  const candidates = [origin, referer].filter(Boolean) as string[]
  const hosts = new Set<string>()
  if (allowed) {
    try { hosts.add(new URL(allowed.startsWith('http') ? allowed : `https://${allowed}`).host) } catch { /* ignore */ }
  }
  hosts.add('localhost:3000')
  hosts.add('sajuya.vercel.app')
  if (process.env.VERCEL_URL) hosts.add(process.env.VERCEL_URL.replace(/^https?:\/\//, ''))
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    try { hosts.add(new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL.startsWith('http') ? process.env.VERCEL_PROJECT_PRODUCTION_URL : `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`).host) } catch { /* ignore */ }
  }
  for (const c of candidates) {
    try {
      const host = new URL(c).host
      if (hosts.has(host)) return true
      if (host.endsWith('.vercel.app') && host.includes('sajuya')) return true
    } catch { /* ignore */ }
  }
  return false
}

/** 쿠키 인증 상태변경 API용. 웹훅에는 쓰지 않는다. */
export function rejectCrossSiteCookieMutation(req: NextRequest) {
  if (req.method === 'GET' || req.method === 'HEAD') return null
  if (!originAllowed(req)) {
    return NextResponse.json({ error: '잘못된 요청 출처입니다' }, { status: 403 })
  }
  return null
}

export function rejectOversizedJson(req: NextRequest) {
  const len = Number(req.headers.get('content-length') || '0')
  if (Number.isFinite(len) && len > MAX_JSON_BYTES) {
    return NextResponse.json({ error: '요청이 너무 큽니다' }, { status: 413 })
  }
  return null
}

export function clipSajuInput(body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME) : ''
  const personalQuestion = typeof body.personalQuestion === 'string'
    ? body.personalQuestion.trim().slice(0, MAX_QUESTION)
    : ''
  return { ...body, name, personalQuestion }
}

const windows = new Map<string, { start: number; count: number }>()

/** DB 한도 적용 전 프로세스 보조. 서비스 전체 한도로 보고하지 않음. */
export function localBurstGuard(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const cur = windows.get(key)
  if (!cur || now - cur.start > windowMs) {
    windows.set(key, { start: now, count: 1 })
    return true
  }
  if (cur.count >= limit) return false
  cur.count += 1
  return true
}
