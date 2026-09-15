// Device-local prototype state, not a production entitlement or authentication boundary.
const key='sajugung-demo-daily-trial-v1'
export function readDailyTrial():any{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
export function saveDailyTrial(value:any){localStorage.setItem(key,JSON.stringify(value))}
export function resetDailyTrial(){localStorage.removeItem(key)}
