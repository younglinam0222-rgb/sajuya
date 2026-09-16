import { createServerSupabase } from '@/lib/supabase'
import { CONTENT_NOTICE_VERSION } from '@/lib/contentNotice'
import { classifyContentNoticeError } from '@/lib/contentNoticeErrors'

export type { ContentNoticeErrorKind } from '@/lib/contentNoticeErrors'
export { classifyContentNoticeError, isMissingRelation } from '@/lib/contentNoticeErrors'

export type AckLookup =
  | { status: 'acked'; acknowledgedAt: string; version: string }
  | { status: 'missing' }
  | { status: 'unavailable'; code?: string | null; kind: string }

export function logContentNoticeEvent(event: string, extra?: Record<string, unknown>) {
  const safe = extra ? Object.fromEntries(
    Object.entries(extra).filter(([key]) =>
      !/birth|question|prompt|token|email|name|password|secret|user[_-]?id|authorization/i.test(key)
    )
  ) : {}
  console.info(JSON.stringify({ tag: 'content_notice', event, ...safe }))
}

export async function probeContentNoticeSchema() {
  const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  let supabaseHost = ''
  try {
    supabaseHost = new URL(rawUrl).host
  } catch {
    supabaseHost = ''
  }
  const supabase = createServerSupabase()
  const users = await supabase.from('users').select('id').limit(1)
  const acks = await supabase
    .from('content_notice_acks')
    .select('user_id,notice_version,acknowledged_at')
    .limit(1)
  const usersClass = classifyContentNoticeError(users.error)
  const acksClass = classifyContentNoticeError(acks.error)
  const columns = !acks.error && acks.data?.[0] ? Object.keys(acks.data[0]).sort() : []
  const insertProbe = await supabase.from('content_notice_acks').insert({
    user_id: '__schema_probe_do_not_keep__',
    notice_version: '__probe__',
  })
  if (!insertProbe.error) {
    await supabase
      .from('content_notice_acks')
      .delete()
      .eq('user_id', '__schema_probe_do_not_keep__')
      .eq('notice_version', '__probe__')
  }
  return {
    supabaseHost,
    users: { status: users.error ? 'error' : 'ok', ...usersClass },
    acksSelect: {
      status: acks.error ? 'error' : 'ok',
      ...acksClass,
      columns,
      rowReturned: Array.isArray(acks.data),
    },
    acksInsert: {
      status: insertProbe.error ? 'error' : 'ok',
      ...classifyContentNoticeError(insertProbe.error),
    },
  }
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
    const classified = classifyContentNoticeError(error)
    logContentNoticeEvent('lookup_error', classified)
    return { status: 'unavailable', ...classified }
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
  | { ok: false; code: 'unavailable' | 'write_failed'; kind?: string }
> {
  const existing = await loadContentNoticeAck(userId, version)
  if (existing.status === 'unavailable') {
    return { ok: false, code: 'unavailable', kind: existing.kind }
  }
  if (existing.status === 'acked') {
    return { ok: true, duplicate: true, acknowledgedAt: existing.acknowledgedAt }
  }

  const supabase = createServerSupabase()
  const { error } = await supabase
    .from('content_notice_acks')
    .upsert(
      { user_id: userId, notice_version: version, acknowledged_at: new Date().toISOString() },
      { onConflict: 'user_id,notice_version', ignoreDuplicates: true }
    )

  if (error) {
    const classified = classifyContentNoticeError(error)
    const again = await loadContentNoticeAck(userId, version)
    if (again.status === 'acked') {
      return { ok: true, duplicate: true, acknowledgedAt: again.acknowledgedAt }
    }
    logContentNoticeEvent('write_error', classified)
    if (classified.kind === 'missing_relation') {
      return { ok: false, code: 'unavailable', kind: classified.kind }
    }
    return { ok: false, code: 'write_failed', kind: classified.kind }
  }

  const verified = await loadContentNoticeAck(userId, version)
  if (verified.status === 'acked') {
    return { ok: true, duplicate: false, acknowledgedAt: verified.acknowledgedAt }
  }
  if (verified.status === 'unavailable') {
    return { ok: false, code: 'unavailable', kind: verified.kind }
  }
  logContentNoticeEvent('write_error', { code: 'verify_missed', kind: 'other' })
  return { ok: false, code: 'write_failed', kind: 'other' }
}
