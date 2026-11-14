type MutationRequest = {
  headers: Headers
}

export function isAllowedMutationOrigin(req: MutationRequest) {
  const origin = req.headers.get('origin')
  if (req.headers.get('sec-fetch-site') === 'cross-site') return false
  if (!origin) return true
  try {
    const source = new URL(origin)
    const host = req.headers.get('host')
    if (!host) return false
    const local = host.startsWith('localhost:') || host.startsWith('127.0.0.1:')
    return source.host === host && (source.protocol === 'https:' || (local && source.protocol === 'http:'))
  } catch {
    return false
  }
}
