# 사주궁 — 현재 코드 기반 통합본

이 소스는 사용자가 제공한 `sajuya-main.zip`의 83개 파일을 기준으로 기능을 통합했습니다. 기존 기능과 네 캐릭터의 원본 이미지·ID를 보존하고, 승인된 최종 샘플 B안의 홈·결과 화면과 색상·서체·배치를 실제 Next.js 앱에 적용한 검수용 소스입니다. 접근 권한, 결제·환불, 1:1 대화, 선택 상담, 후기는 실제 서버 기능에 연결합니다.

**운영 배포 완료본이 아닙니다.** 실제 OAuth·Supabase·Claude·토스 연결 검증과 사업자 운영 정보 확정이 필요합니다. 궁합·대운·택일·연도별 신규 생성과 기존 결과 개별 결제 해제는 검증 보류 상태이며, 서버가 엽전 차감 전에 요청을 거절합니다.

## 로컬 실행

```bash
npm ci
cp .env.example .env.local
# .env.local에 본인의 검수 환경 값을 입력합니다. 비밀키는 커밋하지 않습니다.
npm run dev
```

`dev`, `build`, `start`는 원래 Next.js 명령을 유지합니다. Vite 검수앱이나 가짜 로그인·가짜 결제·상담 예시를 실행 앱에 포함하지 않습니다. Node 24에서 검증하며, 최소 Node 22.18 이상이 필요합니다.

## 환경 변수

`.env.example`은 변수 이름과 기본 차단 상태만 포함합니다. 서버의 `SUPABASE_URL`과 브라우저의 `NEXT_PUBLIC_SUPABASE_URL`은 같은 검수 프로젝트로 설정하세요. `NEXT_PUBLIC_*`는 빌드 시 고정되므로 수정 후 재빌드가 필요합니다. `SUPABASE_URL`은 서버 실행 시 읽습니다. 이 구분이 HTTP 테스트의 데이터베이스 주소 혼선을 막습니다.

실제 API 호출·결제 테스트 전에는 실제 검수용 키와 계정이 필요합니다. 테스트용 가짜 키를 운영 환경에 배포하면 안 됩니다.

## 데이터베이스 적용

새 **별도 검수 DB**에는 아래 순서를 사용합니다.

1. `supabase-schema.sql`
2. `supabase-schema-upgrade.sql`
3. `supabase-schema-upgrade-3-daily.sql`
4. `supabase-launch-security.sql`
5. `supabase-refunds.sql`
6. `supabase-chat.sql`
7. `supabase-conversation.sql`
8. `supabase-reviews.sql`

이미 사용 중인 DB에 처음부터 재실행하지 마세요. 초기 SQL은 일부 정책 생성이 반복 실행 가능하지 않습니다. 운영 DB의 실제 스키마·정책·기존 결제 원장을 비교하고 백업한 뒤 차이만 적용해야 합니다. 과거 잔액을 전부 유료 엽전으로 추정해 환불하지 않습니다.

## 검증 명령

```bash
npm run typecheck
npm run lint
npm run test:security
npm run test:refunds
npm run test:chat
npm run test:conversation
npm run test:manse
npm run test:reviews
npm run build
node tests/final-http.mjs
node tests/refund-http.mjs
node tests/reviews-http.mjs
```

HTTP 검사 중 final-http와 refund-http는 각자 로컬 Next 서버와 가짜 DB 서버를 띄웁니다. 같은 DB 포트 3110을 사용하므로 **순서대로** 실행합니다. Next 빌드가 먼저 있어야 합니다. `SUPABASE_URL`을 가짜 DB 주소로 주입하여 빌드 시 설정한 공개 DB 주소와 독립적으로 테스트합니다. 이 검사는 실제 토스·Supabase·Claude에 접속하는 실결제 검사가 아닙니다.

## 실제 운영에 연결하기 전

- 로그인 제공자별 실제 콜백과 기존 회원·보관함·잔액 연결을 확인합니다. 과거 회원 ID는 임의로 변경하지 않습니다.
- 결제 테스트키로 주문 생성, 승인, 중복 승인, 새로고침, 웹훅 중복, 전액·부분 취소, 네트워크 단절 후 재확인을 검증합니다.
- `CONVERSATION_ENABLED`, `CHAT_ENABLED`, `REFUNDS_ENABLED`는 검수 통과 뒤 켭니다. 상담 가격은 서버 설정을 따릅니다.
- 환불 재처리 작업과 결제 정합성 작업을 운영 스케줄러에 연결하고 실패를 관찰합니다.
- 환불 불확실 상태는 토스에서 상태를 재확인해 해결하며, 임의로 완료 표시하지 않습니다.
- 운영자의 정확한 사업자·고객센터·개인정보 처리 정보와 가격·약관을 확정합니다.

상세 변경과 검증 결과는 함께 제공하는 `CURRENT_SOURCE_UPGRADE_REPORT.md`를 확인하세요.
