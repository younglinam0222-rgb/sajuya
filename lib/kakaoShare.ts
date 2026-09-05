export type KakaoReady =
  | { ok: true }
  | { ok: false; reason: 'missing_js_key' | 'sdk_not_loaded' | 'init_failed' | 'share_unavailable' }

export type KakaoDiagnostics = {
  hasJsKey: boolean
  sdkLoaded: boolean
  initialized: boolean
  hasShare: boolean
  origin: string
}

function getKakao(): any | null {
  if (typeof window === 'undefined') return null
  return (window as any).Kakao ?? null
}

export function getKakaoDiagnostics(): KakaoDiagnostics {
  const Kakao = getKakao()
  return {
    hasJsKey: Boolean(process.env.NEXT_PUBLIC_KAKAO_JS_KEY),
    sdkLoaded: Boolean(Kakao),
    initialized: Boolean(Kakao?.isInitialized?.()),
    hasShare: Boolean(Kakao?.Share?.sendDefault),
    origin: typeof window !== 'undefined' ? window.location.origin : '',
  }
}

export async function ensureKakaoReady(timeoutMs = 4000): Promise<KakaoReady> {
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
  if (!jsKey) return { ok: false, reason: 'missing_js_key' }

  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const Kakao = getKakao()
    if (Kakao) {
      if (!Kakao.isInitialized?.()) {
        try {
          Kakao.init(jsKey)
        } catch {
          return { ok: false, reason: 'init_failed' }
        }
      }
      if (Kakao.isInitialized?.() && Kakao.Share?.sendDefault) return { ok: true }
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const Kakao = getKakao()
  if (!Kakao) return { ok: false, reason: 'sdk_not_loaded' }
  if (!Kakao.isInitialized?.()) return { ok: false, reason: 'init_failed' }
  return { ok: false, reason: 'share_unavailable' }
}

export const KAKAO_READY_MESSAGE: Record<Exclude<KakaoReady, { ok: true }>['reason'], string> = {
  missing_js_key: '카카오 JavaScript 키가 설정되지 않아 공유를 시작할 수 없어요.',
  sdk_not_loaded: '카카오 공유 기능을 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
  init_failed: '카카오 공유 초기화에 실패했어요.',
  share_unavailable: '카카오 공유 API를 사용할 수 없어요.',
}
