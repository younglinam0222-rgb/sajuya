import { createServerSupabase } from './supabase'
import { isShareFunnelEvent, type ShareFunnelEvent } from './readingShare'
import { tokenPrefix } from './shareToken'

export async function recordShareFunnel(input: {
  event: ShareFunnelEvent
  token?: string | null
}) {
  if (!isShareFunnelEvent(input.event)) return
  const prefix = input.token ? tokenPrefix(input.token) : null
  console.log(JSON.stringify({
    tag: 'share_funnel',
    event: input.event,
    tokenPrefix: prefix,
  }))
  try {
    const supabase = createServerSupabase()
    const { error } = await supabase.from('share_funnel_events').insert({
      event_type: input.event,
      token_prefix: prefix,
    })
    if (error) {
      console.error(JSON.stringify({ tag: 'share_funnel', phase: 'insert', code: error.code }))
    }
  } catch {
    /* table may be missing on Preview until SQL is applied */
  }
}
