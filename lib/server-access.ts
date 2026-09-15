import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createServerSupabase } from './supabase'

export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export async function requireUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.sub) throw new AccessError(401, '로그인이 필요합니다.')
  if (req.method !== 'GET') {
    const origin = req.headers.get('origin')
    const expected = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : req.nextUrl.origin
    if ((origin && origin !== expected) || req.headers.get('sec-fetch-site') === 'cross-site')
      throw new AccessError(403, '허용되지 않은 요청입니다.')
  }
  return token.sub
}
export function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof AccessError ? error.message : '처리하지 못했습니다. 잠시 후 다시 시도해주세요.' },
    { status: error instanceof AccessError ? error.status : 503, headers: { 'Cache-Control': 'private, no-store' } })
}
export async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await createServerSupabase().rpc(name, args)
  if (error) throw new Error(`Database operation failed: ${name}`)
  return data
}
