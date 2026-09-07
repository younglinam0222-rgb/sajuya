import { randomBytes } from 'crypto'

export const SHARE_TOKEN_BYTES = 24

export function newShareToken() {
  return randomBytes(SHARE_TOKEN_BYTES).toString('base64url')
}

export function isShareTokenShape(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{32,64}$/.test(token)
}

export function tokenPrefix(token: string) {
  return token.slice(0, 6)
}
