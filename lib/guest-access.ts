import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { AccessError, requireUser } from './server-access'

const COOKIE = 'sajuya_guest'
const MAX_AGE = 60 * 60 * 24 * 90

function secret() {
  const value = process.env.NEXTAUTH_SECRET
  if (!value) throw new AccessError(503, '비로그인 풀이를 준비 중입니다.')
  return value
}

function signature(id: string) {
  return createHmac('sha256', secret()).update(`sajuya-guest-v1:${id}`).digest('hex')
}

function verifiedId(req: NextRequest) {
  const value = req.cookies.get(COOKIE)?.value ?? ''
  const match = /^([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(value)
  if (!match) return null
  const actual = Buffer.from(match[2], 'hex')
  const expected = Buffer.from(signature(match[1]), 'hex')
  return timingSafeEqual(actual, expected) ? match[1] : null
}

export type GuestOwner = { userId: string; guestId?: string; cookieValue?: string }

export function existingGuestOwner(req: NextRequest): GuestOwner | null {
  const id = verifiedId(req)
  return id ? { userId: `guest-${id}`, guestId: id } : null
}

export async function sajuOwner(req: NextRequest, createGuest = false): Promise<GuestOwner> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (typeof token?.sub === 'string' && token.sub) return { userId: await requireUser(req) }
  if (req.method !== 'GET') {
    const origin = req.headers.get('origin')
    const configured = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : req.nextUrl.origin
    if (!origin || (origin !== req.nextUrl.origin && origin !== configured) || req.headers.get('sec-fetch-site') === 'cross-site') {
      throw new AccessError(403, '허용되지 않은 요청입니다.')
    }
  }
  let id = verifiedId(req)
  if (!id && !createGuest) throw new AccessError(401, '이 브라우저에서 생성한 풀이가 아닙니다.')
  let cookieValue: string | undefined
  if (!id) {
    id = randomBytes(16).toString('hex')
    cookieValue = `${id}.${signature(id)}`
  }
  return { userId: `guest-${id}`, guestId: id, cookieValue }
}

export function withGuestCookie<T extends NextResponse>(response: T, req: NextRequest, owner?: GuestOwner): T {
  if (owner?.cookieValue) response.cookies.set(COOKIE, owner.cookieValue, {
    httpOnly: true, secure: req.nextUrl.protocol === 'https:', sameSite: 'lax',
    path: '/', maxAge: MAX_AGE,
  })
  return response
}

export function guestIpHash(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-vercel-forwarded-for')
  if (process.env.VERCEL && !ip) throw new AccessError(503, '비로그인 요청 확인을 잠시 사용할 수 없습니다.')
  return createHmac('sha256', secret()).update(`sajuya-guest-ip-v1:${ip ?? 'local'}`).digest('hex')
}
