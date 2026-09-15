# 사주궁 통합 작업 — 진행 상태 (실제 GitHub 저장소 기준)

마지막 갱신: 2026-09-15 (한국 시간)
저장소: `younglinam0222-rgb/sajuya` / GitHub 기본 브랜치 `main` (HEAD `e2453e6`)
작업 브랜치: `local/fix-launch-access-payments` (원격에 이미 push됨, HEAD `5d6a6c8`)

## 0. 지금 무엇이 가능한가 (한 문장 판정)

**실제 GitHub 저장소 clone(.git 포함)을 확보해 읽기/쓰기 권한을 모두 확인했고(주의: 이번 세션이
push한 게 아니라 이미 push되어 있던 것을 확인함), 다른 Claude 세션이 먼저 만들어 둔 통합 커밋
2개를 독립적으로 교차 검증한 결과 핵심 보안 수정이 실제로 유효함을 확인했다. PR은 아직
생성되지 않았고, `gh` CLI 인증이 없어 이 세션에서 직접 만들지는 못했다(아래 3절).**

## 1. 이번에 확보/검증한 것

| 항목 | 내용 |
|---|---|
| 실제 저장소 확보 | 사용자가 전달한 `sajugung_integrated_local-fix-launch-access-payments.zip`(10.6MB, `.git` 포함)에서 실제 GitHub 저장소 clone 확보. `origin=https://github.com/younglinam0222-rgb/sajuya.git`, GitHub HEAD `e2453e6` |
| 기존 통합 작업 발견 | 커밋 작성자가 `Claude (sandbox integration)`인 두 커밋이 이미 존재: ① `791524f` 참고본(b90e34e)의 신규 서브시스템 111개 파일 통합(환불/채팅/상담/보안테스트/SQL/preview) — GitHub와 충돌 없는 순수 추가. ② `5d6a6c8` 결제/인증/사주계산 등 GitHub와 내용이 다르던 43개 파일을 참고본 버전으로 교체 |
| **43개 교체 커밋 독립 검증** | GitHub 원본이 참고본보다 못한 게 아닌지(=최신 기능·보안수정을 실수로 지운 게 아닌지)를 4개 파일 실제 diff로 직접 대조: |
| → `app/api/auth/[...nextauth]/route.ts` | 단순 리팩터(`lib/auth-options.ts`로 로직 이동). 신규 회원가입 시 자동 지급 잔액을 `1`→`0`으로 변경(중복 무료 지급 방지, 무료 체험은 별도 서버 원장이 관리하도록 통일), 회원가입 DB 오류 시 무조건 통과하던 것을 실패 처리하도록 강화 — **개선** |
| → `app/api/pay/confirm/route.ts` | GitHub 원본은 **로그인 확인이 아예 없고**, 클라이언트가 보낸 금액을 고정 상수와만 비교, 주문-사용자 결속 없음. 참고본은 `requireUser` 인증, 주문을 `commerce_orders`에서 사용자 소유로 조회해 금액 대조, `bind_payment`로 결제키 중복바인딩 방지 — **심각한 결제 위조 취약점 수정** |
| → `app/api/result/[shareId]/route.ts` | GitHub 원본은 **인증·소유권 검사 전혀 없이 서비스 롤 키로 `select('*')`를 아무 shareId에나 반환** — 다른 사람의 유료 결과·개인 질문이 통째로 노출되는 심각한 취약점. 참고본은 소유권 검증이 있는 `/api/readings/[shareId]`로 위임 — **심각한 개인정보 노출 수정** |
| → `app/refund/page.tsx` | 341줄 → 2줄(`/terms#refund`로 redirect). 실제 환불 처리 UI는 `app/components/refunds/RefundCenter.tsx`로 이동 확인됨. 지시문 T절("환불 조항을 약관 안 통합 조항으로 일치")과 정확히 일치 — **기능 손실 아닌 의도된 통합** |
| 제외 확인 | `git ls-files`, 파일시스템 전체에서 `promo` 관련 파일 검색 — 이전에 미검증으로 제외하기로 한 `app/api/admin/promotions/`, `supabase-promo.sql`이 실제로 포함되지 않았음을 확인 |
| 비밀값 검사 | 두 통합 커밋 diff에 `.env*` 파일이나 API 키/시크릿 패턴 없음 확인 후 진행 |
| npm ci | 409 packages, 정상 |
| test:security / test:refunds / test:chat / test:conversation / manse-facts | **전부 PASS** (sajugung-work에서 확인한 것과 동일한 통과 항목) |
| npm run build | **PASS** (테스트용 `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3110`로 빌드) |
| lint | production 코드 기준 90 errors — sajugung-work에서 발견한 것과 동일한 목록(신규 회귀 없음). `dist/`는 `.gitignore`에 있어 git에는 없고 로컬 zip에만 남아있던 빌드 찌꺼기라 lint 노이즈였음(무시) |
| **push 자격증명 확인** | `git push --dry-run`이 별도 로그인 없이 성공 — 이 컴퓨터의 Windows Git Credential Manager에 `younglinam0222-rgb` 계정 자격증명이 이미 있음. `git ls-remote --heads origin`으로 확인해보니 **이 브랜치는 이미 원격에 push되어 있었음**(이번 세션이 새로 push한 게 아님) |

## 2. 막힌 것 — 사용자 확인 필요

**PR 생성**: `gh auth status`는 로그인 안 됨으로 나옴. git 자체 push는 되지만(Credential Manager),
`gh pr create`는 별도의 GitHub CLI 인증이 필요해서 이 세션에서 PR을 직접 만들지 못했다.

바로 열 수 있는 PR 링크:
`https://github.com/younglinam0222-rgb/sajuya/compare/main...local/fix-launch-access-payments?expand=1`

옵션:
1. 사용자가 위 링크를 열어 직접 PR 생성 (가장 빠름, 위험 없음)
2. 사용자가 이 컴퓨터에서 `gh auth login` 한 번 실행 → 이후 세션이 `gh pr create`로 상세 설명(비교표, 테스트 결과, 미검증 항목 포함) 포함해 생성

브랜치 이름도 원래 지시문의 `fix/launch-access-payments`가 아니라 `local/fix-launch-access-payments`로 되어 있음 — 그대로 PR 낼지, 이름을 맞출지 확인 필요.

## 3. 아직 검증하지 않은 것

- `791524f`(111개 파일, "충돌없음"으로 표시된 커밋)은 무결성만 확인했고 4개 파일처럼 라인 단위로 전부 대조하지는 않음 — 다음 단계에서 최소 결제/환불 관련 신규 파일(`lib/refund-engine.ts`, `lib/payment-service.ts` 등)은 마저 확인 예정
- `tests/http-access.mjs` 별도 미실행
- npm audit critical(2)/high(6) — sajugung-work와 동일하게 미해결, 사용자 확인 대기
- B~Z의 나머지 항목(디자인 B안 실제 통합 여부, 궁합/대운/연도/택일 해제 조건, 약관 실제 사업자정보 등)은 이 두 커밋에 이미 반영되어 있을 가능성이 높으나 파일 단위로 아직 전수 확인 못함
