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
  const exportObj: { Lunar: {fromYmd(year: number, month: number, day: number): LunarObj}; Solar: typeof Solar; LunarUtil:{SHI_SHEN:Record<string,string>} }
  export = exportObj
}
