# 사주궁 전체 디자인 샘플 — 검토 대기

이 버전은 사용자가 올린 `sajuya-main (3).zip`을 기준으로 만든 **비공개 디자인 샘플**입니다. 실제 Vercel 사이트, 원본 ZIP, 인증 제공자, 결제, 데이터베이스, 해석 API에는 반영하지 않았습니다. 실제 업그레이드는 사용자가 샘플을 검토하고 승인한 범위에 한해 별도로 진행합니다.

## 유지한 뼈대

홈: 헤더 → 추천 배너 캐러셀 → 오늘의 무료 운세 → 4개 캐릭터 → 신탁 메뉴(프리미엄 2개 / 무료·일부무료 4개) → 서비스 안내 → 가입 안내 → 엽전 안내 → 푸터. 하단 5개 메뉴의 이름과 목적지를 유지했습니다.

원본의 페이지 경로, 입력 필드, 선택지, 캐릭터 이미지, 해석 스트림 수신·완료 판정·저장·재시도 로직을 보존했습니다. 기존 가입/요금 안내 문구와 실제 가격 상수도 유지했습니다. 메뉴·요금·환불 등 운영 정책 변경은 이 샘플에 포함하지 않았습니다.

## 시각적으로 제안하는 변경

- 남색 바탕, 금빛 포인트, 한글 명조 제목과 읽기 쉬운 본문.
- 원본 캐릭터를 크게 보여주는 배너와 카드, 휴대폰 2열 / 큰 화면 4열 캐릭터 배치.
- 원래 카드·입력창·결과 화면의 대비, 여백, 테두리, 글자 크기 정리.
- 입력 완료 / 해석 / 결과 정리 안내. 임의의 완료 퍼센트 없이 실제 수신된 제목 수를 표시.
- 키보드 포커스, 로그인 동의와 모달, 모션 감소, 모바일 확대 지원.

## 비공개 샘플에서 확인하는 방법

첫 화면은 비로그인 상태입니다. 상단 `검토 메뉴`에서 예시 로그인하거나, 원래 로그인 버튼에서 동의 후 예시 로그인할 수 있습니다. 로그인은 실제 계정 인증이 아닙니다.

사주 페이지에서 임의의 이름을 넣고 진행하면 같은 브라우저 메모리의 예시 해석을 보여줍니다. 예시 결과는 실제 사주 판단이 아닙니다. 상단 메뉴에서 결과/결제 화면으로 바로 이동하거나 해석 오류·저장 오류·지연 상황을 선택할 수 있습니다. 입력 정보는 외부로 전송하지 않습니다.

`preview/`에만 라우팅·인증·결제·응답 시뮬레이션이 있습니다. Next 운영 앱은 이 디렉터리를 import하지 않습니다. `npm run preview:build`는 샘플 정적 파일만 생성하며 Sites에는 해당 `dist/`만 배포합니다. `npm run build`와 원본 서버 기능은 운영 환경용으로 남겨두었습니다.

## 원본에서 이어지는 사항

첨부본의 `/refund` 페이지는 홈과 비슷한 콘텐츠이고, 사주/결과의 로그인 후 무료 공개 안내와 홈의 가격 안내가 함께 존재합니다. 이번 디자인 샘플은 이 운영 규칙을 임의로 바꾸지 않았습니다. 실제 반영을 승인받으면 최신 운영 원본과 다시 비교해 정리해야 합니다.

브라우저 폰트는 Noto Sans KR / Noto Serif KR 화면 사용 글자를 로컬 서브셋으로 만들었고 OFL 라이선스를 포함했습니다. 캐릭터 원본 이미지는 수정하지 않았습니다.


## Main direction comparison — 2026-09-14
Only preview/ contains the two new homepage directions; production app/ and backend sources are unchanged in this revision.
A uses cool light surfaces, serif headings, separate portraits and compact pricing rows. B uses large portraits, sans headings and dark surfaces. Both preserve section order, all four characters, six service destinations, login/shop entry points and bottom navigation.
The upper review bar selects A/B and desktop viewport widths (360/390/430 or full). The old sample remains under ?concept=previous. Child routes deliberately retain the previous design until a direction is approved.
Motion: one 650ms portrait entrance; 2.5% hover enlargement on pointer devices. No repeating brightness pulses, autoplay carousel or fabricated character video. Reduced-motion preference disables these effects.
Reference principles (content and documentation inspected, no visual clone): https://www.29cm.co.kr/ (separate product storytelling); https://www.aesop.com/ (distinction between guided selection and product facts); https://tossmini-docs.toss.im/tds-react-native/foundation/typography/ (type hierarchy).
The dev wrapper retains ordinary Next development, choosing the already-existing Vite preview only when the supervised preview supplies --strictPort. CSP permits self frames for the viewport comparison; external frames and connections remain excluded.


## B carousel refinement
B is now the initial review direction. Four existing banner images/copy/destinations dissolve together over 850ms every 7 seconds. Pause/resume and manual selection remain available. Pointer hover temporarily pauses; keyboard/manual interaction stops autoplay until resumed. Hidden documents, offscreen banners and open login/shop dialogs suspend the timer. Reduced-motion disables autoplay and transitions. Branding and Vercel configuration are unchanged.


## Trial policy sample
- Main daily copy: account-lifetime first daily reading only; no daily reset. Signup coin grant removed from preview copy and mock balance starts at zero.
- Daeun/taekil/yearly: replace partial-free claims with passes pending. No invented price or live charging. Vite's copy transform is preview-only.
- Preview daily route gates anonymous visitors, stores fabricated successful results device-locally, reopens stored results, and blocks additional generation after first success. No actual submitted birth profile is persisted by this fixture. Review controls expose an explicitly labeled sample reset. This local fixture is not a security boundary or server entitlement implementation.
- Source inspection: production auth uses NextAuth provider user.id as users.id, still grants 1 coin on insertion, and does not show a unified cross-provider member mapping. Supabase Auth linking documentation does not automatically apply to this NextAuth integration.
- Approval-stage production work required: stable internal member ID with verified provider links; unique per-member daily trial grant; atomic request reservation and idempotency; final saved result before entitlement completion; recoverable failures; same-day/profile result reuse; RLS and server-only credit mutation. No Vercel, Supabase or production auth changes performed.
- Validation: TypeScript/build passed. Browser verified anonymous gate, simulated login, generation, first-use restriction, saved-result reopening, and no horizontal overflow at 390px.

## B result redesign (v7)
Preview-only adapters for daily, saju, compatibility, daeun, taekil, yearly. Shared portrait header, navy reading surface, numbered chapters, topic index, larger-text toggle, score meters, expandable pillars, date cards and lifecycle rows. Production app and API code unchanged. All original interpretation fields retained; daily biorhythm and saju personal-answer retry/share callbacks retained. No new pricing or backend entitlement implementation. Review toolbar offers six direct sample result views with fabricated data. Existing original payment-paused saju access behavior remains unchanged.

## Result accents and original grouping
Keep core saju titles separately numbered (12 for the existing fixture), followed by strategy/advice and optional question. Muted rose warning, warm sand advice, slate blue question surfaces preserve readable light body text. Inline warning markers are highlighted. Preview only.

## Screenshot skeleton correction
Restore individual bordered interpretation cards with category badges and in-card amber warnings. Keep expanded colored stem/branch grid, five-bar lifecycle chart and detailed rows, strategy group heading, semantic advice/question cards, and existing functional share actions. Compact B portrait header. Shared presentation applies to all six result types. No production API changes.

## Conversion clarity update
Preserve B hero/carousel, four guides, six menus and existing result skeleton. Replace unsupported wealth/99-point-match promises with relevant questions. Add static result proof tabs, a login-free full sample, character choice reasons, FAQ, explicit preview pricing conditions and daily-to-saju bridge. No fabricated reviews, scarcity, social counts or guaranteed conversion improvements. Existing 1900 KRW display reads NYANG_PRICE; unresolved 4900 KRW unlock/backend policy is not changed or represented as finalized. Local session-only allowlisted click events record no personal content and are not real analytics. Review panel can inspect/reset these events.
Evidence: https://www.nngroup.com/articles/recognition-and-recall/ ; https://www.nngroup.com/articles/information-scent/ . These support visible choices/clear destinations, not a quantified uplift for this service.
Competitor notes: saju-kid.com advertises 990 KRW purchases, daily free fortunes/chat and displays testimonials. Founder LinkedIn promotion claims 50억 revenue, without audited profit evidence; do not treat as annual profit. Public privacy policy lists Google/Firebase for storage, not a named model provider. No competitor AI provider established.
