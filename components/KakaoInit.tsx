'use client'

import Script from 'next/script'

// NEXT_PUBLIC_KAKAO_JS_KEY는 카카오 로그인용 REST 키(KAKAO_CLIENT_ID)와 다르다.
// 카카오 개발자 콘솔 > 앱 키 > JavaScript 키가 필요하다.
export default function KakaoInit() {
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
  if (!jsKey) return null

  const initKakao = () => {
    const Kakao = (window as any).Kakao
    if (!Kakao) return
    try {
      if (!Kakao.isInitialized()) Kakao.init(jsKey)
    } catch (e) {
      console.error(JSON.stringify({
        tag: '사주궁:kakao',
        event: 'init_failed',
        err: e instanceof Error ? e.message : String(e),
      }))
    }
  }

  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
      strategy="afterInteractive"
      onLoad={initKakao}
      onReady={initKakao}
    />
  )
}
