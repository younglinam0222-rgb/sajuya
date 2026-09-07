import { createServerSupabase } from './supabase'
import { buildPublicShareView, clipDisplayName, type ShareSettings } from './readingShare'
import { isShareTokenShape, newShareToken } from './shareToken'

export async function loadShareSettings(shareId: string, userId: string): Promise<ShareSettings | null> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('reading_public_shares')
    .select('token, enabled, include_personal, display_name, user_id')
    .eq('share_id', shareId)
    .maybeSingle()
  if (error || !data || data.user_id !== userId) return null
  return {
    enabled: !!data.enabled,
    includePersonal: !!data.include_personal,
    displayName: clipDisplayName(data.display_name),
    publicPath: data.enabled && data.token ? `/s/${data.token}` : null,
  }
}

export async function upsertShare(input: {
  shareId: string
  userId: string
  isPaid: boolean
  action: 'enable' | 'disable' | 'reissue' | 'update'
  includePersonal?: boolean
  displayName?: string
}) {
  if (!input.isPaid && input.action !== 'disable') {
    return { ok: false as const, code: 'not_purchased' }
  }
  const supabase = createServerSupabase()
  const { data: existing } = await supabase
    .from('reading_public_shares')
    .select('*')
    .eq('share_id', input.shareId)
    .maybeSingle()

  if (existing && existing.user_id !== input.userId) {
    return { ok: false as const, code: 'forbidden' }
  }

  if (input.action === 'disable') {
    if (!existing) return { ok: true as const, code: 'disabled', settings: emptySettings() }
    await supabase.from('reading_public_shares').update({
      enabled: false,
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('share_id', input.shareId).eq('user_id', input.userId)
    return { ok: true as const, code: 'disabled', settings: { ...emptySettings(), displayName: clipDisplayName(existing.display_name) } }
  }

  const rotate = input.action === 'reissue' || !existing?.token
  const token = rotate ? newShareToken() : existing.token
  const includePersonal = input.includePersonal ?? existing?.include_personal ?? false
  const displayName = clipDisplayName(input.displayName ?? existing?.display_name)
  const row = {
    share_id: input.shareId,
    token,
    user_id: input.userId,
    enabled: true,
    include_personal: !!includePersonal,
    display_name: displayName,
    updated_at: new Date().toISOString(),
    revoked_at: null,
  }
  const { error } = await supabase.from('reading_public_shares').upsert(row, { onConflict: 'share_id' })
  if (error) {
    console.error(JSON.stringify({ tag: 'share', phase: 'upsert', code: error.code }))
    return { ok: false as const, code: 'rpc_error' }
  }
  return {
    ok: true as const,
    code: input.action === 'reissue' ? 'reissued' : 'enabled',
    settings: {
      enabled: true,
      includePersonal: !!includePersonal,
      displayName,
      publicPath: `/s/${token}`,
    } satisfies ShareSettings,
  }
}

function emptySettings(): ShareSettings {
  return { enabled: false, includePersonal: false, displayName: '친구', publicPath: null }
}

export async function readPublicShare(token: string) {
  if (!isShareTokenShape(token)) return { ok: false as const, code: 'not_found' }
  const supabase = createServerSupabase()
  const { data: share, error } = await supabase
    .from('reading_public_shares')
    .select('share_id, user_id, enabled, include_personal, display_name, token')
    .eq('token', token)
    .maybeSingle()
  if (error || !share || !share.enabled || share.token !== token) {
    return { ok: false as const, code: 'not_found' }
  }
  const { data: reading } = await supabase
    .from('readings')
    .select('share_id, user_id, is_paid, ai_result, character_id')
    .eq('share_id', share.share_id)
    .maybeSingle()
  if (!reading || reading.user_id !== share.user_id || !reading.is_paid) {
    return { ok: false as const, code: 'not_found' }
  }
  return {
    ok: true as const,
    view: buildPublicShareView({
      aiResult: reading.ai_result,
      characterId: reading.character_id,
      displayName: share.display_name,
      includePersonal: share.include_personal,
    }),
  }
}
