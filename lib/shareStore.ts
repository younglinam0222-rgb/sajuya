import { buildPublicShareView, clipDisplayName } from './readingShare'
import { isShareTokenShape, newShareToken } from './shareToken'

type ShareRow = {
  shareId: string
  userId: string
  isPaid: boolean
  aiResult: string
  characterId: string
  enabled: boolean
  includePersonal: boolean
  displayName: string
  token: string | null
}

export class InMemoryShareStore {
  readings = new Map<string, ShareRow>()
  byToken = new Map<string, string>()

  seed(row: Omit<ShareRow, 'enabled' | 'includePersonal' | 'displayName' | 'token'> & Partial<ShareRow>) {
    this.readings.set(row.shareId, {
      enabled: false,
      includePersonal: false,
      displayName: '친구',
      token: null,
      ...row,
    })
  }

  enable(shareId: string, userId: string, opts?: { includePersonal?: boolean; displayName?: string }) {
    const row = this.readings.get(shareId)
    if (!row) return { ok: false as const, code: 'not_found' }
    if (row.userId !== userId) return { ok: false as const, code: 'forbidden' }
    if (!row.isPaid) return { ok: false as const, code: 'not_purchased' }
    if (!row.token) {
      row.token = newShareToken()
      this.byToken.set(row.token, shareId)
    }
    row.enabled = true
    if (opts?.includePersonal != null) row.includePersonal = !!opts.includePersonal
    if (opts?.displayName) row.displayName = clipDisplayName(opts.displayName)
    return { ok: true as const, code: 'enabled', token: row.token }
  }

  disable(shareId: string, userId: string) {
    const row = this.readings.get(shareId)
    if (!row) return { ok: false as const, code: 'not_found' }
    if (row.userId !== userId) return { ok: false as const, code: 'forbidden' }
    row.enabled = false
    return { ok: true as const, code: 'disabled' }
  }

  reissue(shareId: string, userId: string) {
    const row = this.readings.get(shareId)
    if (!row) return { ok: false as const, code: 'not_found' }
    if (row.userId !== userId) return { ok: false as const, code: 'forbidden' }
    if (!row.isPaid) return { ok: false as const, code: 'not_purchased' }
    if (row.token) this.byToken.delete(row.token)
    row.token = newShareToken()
    row.enabled = true
    this.byToken.set(row.token, shareId)
    return { ok: true as const, code: 'reissued', token: row.token }
  }

  readPublic(token: string) {
    if (!isShareTokenShape(token)) return { ok: false as const, code: 'not_found' }
    const shareId = this.byToken.get(token)
    if (!shareId) return { ok: false as const, code: 'not_found' }
    const row = this.readings.get(shareId)
    if (!row || !row.enabled || row.token !== token || !row.isPaid) {
      return { ok: false as const, code: 'not_found' }
    }
    return {
      ok: true as const,
      view: buildPublicShareView({
        aiResult: row.aiResult,
        characterId: row.characterId,
        displayName: row.displayName,
        includePersonal: row.includePersonal,
      }),
    }
  }
}
