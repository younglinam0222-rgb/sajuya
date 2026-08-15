'use client'

import Script from 'next/script'

// ✅ 신규: 카카오 JS SDK를 앱 전체에서 한 번만 로드·초기화.
// 이게 없으면 카카오 공유 버튼이 항상 조용히 "링크 복사"로만 동작함.
// NEXT_PUBLIC_KAKAO_JS_KEY는 카카오 로그인용 키(KAKAO_CLIENT_ID)와는 별개로,
// 카카오 개발자 콘솔 > 앱 설정 > 앱 키 > "JavaScript 키"를 발급받아 넣어야 함.
export default function KakaoInit() {
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
  if (!jsKey) return null

  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
      strategy="afterInteractive"
      onLoad={() => {
        const Kakao = (window as any).Kakao
        if (Kakao && !Kakao.isInitialized()) {
          Kakao.init(jsKey)
        }
      }}
    />
  )
}
