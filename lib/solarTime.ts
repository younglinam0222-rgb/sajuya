// lib/solarTime.ts
// 한국 표준시(KST)는 동경 135도(일본 아카시) 기준이라, 실제 출생지의 태양이 남중하는
// "진짜 시간"(진태양시)과는 수십 분 차이가 날 수 있음. 시주(태어난 시간 기준 기둥)가
// 경계에 걸린 사람은 이 보정으로 결과가 달라질 수 있어서 선택 입력으로 제공.

// 시/도 단위 대표 경도(동경, °E) · 위도(북위, °N) — 정밀한 시/군/구 단위까지는 불필요.
// 위도는 시주 계산(진태양시 보정)에는 안 쓰이고, 선택 화면에 좌표를 보여주는 용도.
export const KOREA_REGIONS: { name: string; longitude: number; latitude: number }[] = [
  { name: '서울/경기', longitude: 127.00, latitude: 37.57 },
  { name: '인천',      longitude: 126.70, latitude: 37.46 },
  { name: '강원',      longitude: 127.73, latitude: 37.75 },
  { name: '충북',      longitude: 127.49, latitude: 36.64 },
  { name: '충남',      longitude: 126.66, latitude: 36.48 },
  { name: '대전/세종', longitude: 127.35, latitude: 36.35 },
  { name: '전북',      longitude: 127.15, latitude: 35.82 },
  { name: '전남',      longitude: 126.48, latitude: 34.82 },
  { name: '광주',      longitude: 126.85, latitude: 35.16 },
  { name: '경북',      longitude: 128.73, latitude: 36.58 },
  { name: '대구',      longitude: 128.60, latitude: 35.87 },
  { name: '경남',      longitude: 128.68, latitude: 35.24 },
  { name: '부산',      longitude: 129.08, latitude: 35.18 },
  { name: '울산',      longitude: 129.31, latitude: 35.54 },
  { name: '제주',      longitude: 126.53, latitude: 33.50 },
]

// 균시차(Equation of Time) 근사값 — 분 단위. 지구 공전궤도가 타원이라 생기는 오차.
// 표준 근사식(오차 ±1분 내외로 충분히 정확함)
function equationOfTimeMinutes(month: number, day: number): number {
  const cumDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  const dayOfYear = cumDays[month - 1] + day
  const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180)
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)
}

export interface SolarTimeCorrection {
  correctedYear: number
  correctedMonth: number
  correctedDay: number
  correctedHourMinute: string
  correctionMinutes: number  // 총 보정치(반올림) — 음수면 표준시보다 이른 시각
  changedDay: boolean        // 보정으로 날짜(일주)까지 바뀌었는지
}

// 표준시(KST) → 진태양시 보정
export function correctToTrueSolarTime(
  year: number, month: number, day: number, hourMinute: string, longitude: number
): SolarTimeCorrection {
  const [h, m] = hourMinute.split(':').map(Number)
  const longitudeCorrection = (longitude - 135) * 4 // 경도 1도 = 4분
  const eot = equationOfTimeMinutes(month, day)
  const totalCorrection = longitudeCorrection + eot

  let correctedTotal = Math.round(h * 60 + m + totalCorrection)
  let dayOffset = 0
  if (correctedTotal < 0) { correctedTotal += 1440; dayOffset = -1 }
  else if (correctedTotal >= 1440) { correctedTotal -= 1440; dayOffset = 1 }

  const correctedH = Math.floor(correctedTotal / 60)
  const correctedM = correctedTotal % 60

  let cy = year, cm = month, cd = day
  if (dayOffset !== 0) {
    const d = new Date(year, month - 1, day)
    d.setDate(d.getDate() + dayOffset)
    cy = d.getFullYear(); cm = d.getMonth() + 1; cd = d.getDate()
  }

  return {
    correctedYear: cy,
    correctedMonth: cm,
    correctedDay: cd,
    correctedHourMinute: `${String(correctedH).padStart(2, '0')}:${String(correctedM).padStart(2, '0')}`,
    correctionMinutes: Math.round(totalCorrection),
    changedDay: dayOffset !== 0,
  }
}
