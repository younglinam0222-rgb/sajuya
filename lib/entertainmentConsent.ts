export const ENTERTAINMENT_NOTICE =
  '본 서비스는 엔터테인먼트 및 참고 목적으로 제공되며, 운세·궁합 해석 결과는 재미로 즐기시기 바랍니다. 실제 인생의 중요한 결정(결혼, 투자, 이직 등)은 반드시 본인의 판단과 전문가 상담을 통해 내리시기 바랍니다. 본 서비스는 결과의 정확성을 보장하지 않으며, 이용에 따른 책임은 이용자 본인에게 있습니다.'

export const ENTERTAINMENT_CHECKBOX_LABEL =
  '위 내용에 동의하며, 재미로 즐기는 콘텐츠임을 확인했습니다.'

export function hasEntertainmentConsent(value: unknown): boolean {
  return value === true
}

export const CONSENT_REQUIRED_MESSAGE = '서비스 이용 고지에 동의해야 이용할 수 있어요.'
