import { createServerSupabase } from '@/lib/supabase'
import { CONTENT_NOTICE_VERSION } from '@/lib/contentNotice'

export type AckLookup =
  | { status: 'acked'; acknowledgedAt: string; version: string }
  | { status: 'missing' }
  | { status: 'unavailable' }

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = error.message || ''
  return error.code === '42P01' || error.code === 'PGRST205' || msg.includes('content_notice_acks')
}

export function logContentNoticeEvent(event: string, extra?: Record<string, unknown>) {
  const safe = extra ? Object.fromEntries(
    Object.entries(extra).filter(([key]) =>
      !/birth|question|prompt|token|email|name|password|secret/i.test(key)
    )
  ) : {}
  console.info(JSON.stringify({ tag: 'content_notice', event, ...safe }))
}

export async function loadContentNoticeAck(userId: string, version = CONTENT_NOTICE_VERSION): Promise<AckLookup> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('content_notice_acks')
    .select('acknowledged_at, notice_version')
    .eq('user_id', userId)
    .eq('notice_version', version)
    .maybeSingle()

  if (error) {
    if (isMissingRelation(error)) return { status: 'unavailable' }
    logContentNoticeEvent('lookup_error', { code: error.code })
    return { status: 'unavailable' }
  }
  if (!data) return { status: 'missing' }
  return {
    status: 'acked',
    acknowledgedAt: data.acknowledged_at,
    version: data.notice_version,
  }
}

export async function saveContentNoticeAck(userId: string, version = CONTENT_NOTICE_VERSION): Promise<
  | { ok: true; duplicate: boolean; acknowledgedAt: string }
  | { ok: false; code: 'unavailable' | 'write_failed' }
> {
  const existing = await loadContentNoticeAck(userId, version)
  if (existing.status === 'unavailable') return { ok: false, code: 'unavailable' }
  if (existing.status === 'acked') {
    return { ok: true, duplicate: true, acknowledgedAt: existing.acknowledgedAt }
  }

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('content_notice_acks')
    .upsert(
      { user_id: userId, notice_version: version, acknowledged_at: new Date().toISOString() },
      { onConflict: 'user_id,notice_version', ignoreDuplicates: true }
    )
    .select('acknowledged_at')
    .maybeSingle()

  if (error) {
    if (isMissingRelation(error)) return { ok: false, code: 'unavailable' }
    const again = await loadContentNoticeAck(userId, version)
    if (again.status === 'acked') {
      return { ok: true, duplicate: true, acknowledgedAt: again.acknowledgedAt }
    }
    logContentNoticeEvent('write_error', { code: error.code })
    return { ok: false, code: 'write_failed' }
  }

  const acknowledgedAt = data?.acknowledged_at || new Date().toISOString()
  return { ok: true, duplicate: false, acknowledgedAt }
}
