declare module 'lunar-javascript' {
  class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar
    getSolar(): Solar
  }
  class Solar {
    getYear(): number
    getMonth(): number
    getDay(): number
  }
  export = Lunar
}
