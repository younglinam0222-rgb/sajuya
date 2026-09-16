export type ContentNoticeErrorKind =
  | 'missing_relation'
  | 'missing_column'
  | 'permission'
  | 'fk_violation'
  | 'mentions_table'
  | 'other'
  | 'none'

export function classifyContentNoticeError(error: { code?: string; message?: string } | null): {
  code: string | null
  kind: ContentNoticeErrorKind
} {
  if (!error) return { code: null, kind: 'none' }
  const msg = error.message || ''
  const code = error.code || null
  if (code === '42P01' || code === 'PGRST205' || /schema cache/i.test(msg)) {
    return { code, kind: 'missing_relation' }
  }
  if (code === 'PGRST204') return { code, kind: 'missing_column' }
  if (code === '42501' || /permission denied|row-level security|RLS/i.test(msg)) {
    return { code, kind: 'permission' }
  }
  if (code === '23503') return { code, kind: 'fk_violation' }
  if (/content_notice_acks/.test(msg)) return { code, kind: 'mentions_table' }
  return { code, kind: 'other' }
}

export function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  return classifyContentNoticeError(error).kind === 'missing_relation'
}
