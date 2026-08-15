declare module 'lunar-javascript' {
  class LunarObj {
    getYearInGanZhi(): string
    getYearInGanZhiByLiChun(): string
    getMonthInGanZhi(): string
    getDayInGanZhi(): string
    getTimeInGanZhi(): string
    getSolar(): Solar
  }
  class Solar {
    static fromYmd(year: number, month: number, day: number): Solar
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar
    getYear(): number
    getMonth(): number
    getDay(): number
    getLunar(): LunarObj
  }
  class Lunar {
    static fromYmd(year: number, month: number, day: number): LunarObj
  }
  const exportObj: { Lunar: typeof Lunar; Solar: typeof Solar }
  export = exportObj
}
