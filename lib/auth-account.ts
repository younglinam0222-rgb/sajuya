export type OAuthProfile = {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

export type AccountSyncResult =
  | { ready: true }
  | { ready: false; stage: 'lookup' | 'insert'; code: string | null }

export async function syncOAuthAccount(store: {
  find(id: string): Promise<{ exists: boolean; error: boolean; code: string | null }>
  create(profile: OAuthProfile): Promise<{ error: boolean; code: string | null }>
}, profile: OAuthProfile): Promise<AccountSyncResult> {
  let found: Awaited<ReturnType<typeof store.find>>
  try {
    found = await store.find(profile.id)
  } catch {
    return { ready: false, stage: 'lookup', code: null }
  }
  if (found.error) return { ready: false, stage: 'lookup', code: found.code }
  if (found.exists) return { ready: true }
  try {
    const created = await store.create(profile)
    if (!created.error) return { ready: true }
    if (created.code === '23505') {
      // A concurrent callback may have inserted this ID. Confirm the row exists;
      // another unique constraint could have caused the conflict instead.
      const again = await store.find(profile.id)
      if (!again.error && again.exists) return { ready: true }
    }
    return { ready: false, stage: 'insert', code: created.code }
  } catch {
    return { ready: false, stage: 'insert', code: null }
  }
}
