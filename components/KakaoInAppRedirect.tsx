'use client'

import { useEffect } from 'react'

// ✅ 신규: 카카오톡으로 공유된 링크를 누르면 카카오톡 자체 인앱 브라우저로 열리는데,
// 이 브라우저는 로그인 세션(next-auth 쿠키) 처리가 불안정해서 "Error" 화면이 뜨는
// 경우가 있음(친구 휴대폰에서 재현 확인됨). 카카오톡 UA를 감지하면 즉시 시스템
// 기본 브라우저(사파리/크롬)로 강제 이동시켜서 이 문제를 원천 차단.
export default function KakaoInAppRedirect() {
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('kakaotalk')) {
      const targetUrl = window.location.href
      // 카카오톡이 자체 지원하는 스킴 — 이 링크를 열면 카카오톡이 알아서
      // 시스템 기본 브라우저로 같은 주소를 다시 열어줌
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(targetUrl)}`
    }
  }, [])

  return null
}
