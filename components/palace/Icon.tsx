import type { CSSProperties } from 'react'
export default function Icon({ name='spark', size=22, style }: { name?:string; size?:number; style?:CSSProperties }) {
 const paths:Record<string,React.ReactNode>={
  spark:<><path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z"/><path d="M19 2v4m-2-2h4"/></>,
  moon:<><path d="M20.5 14.3A9 9 0 0 1 9.7 3.5a9 9 0 1 0 10.8 10.8Z"/><path d="m17 3 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"/></>,
  heart:<><path d="M20.3 5.7a5 5 0 0 0-7.1 0L12 7l-1.2-1.3a5 5 0 0 0-7.1 7.1L12 21l8.3-8.2a5 5 0 0 0 0-7.1Z"/><path d="M12 10v7m-3-3h6"/></>,
  wave:<><path d="M2 7c4-6 6 6 10 0s6 6 10 0M2 12c4-6 6 6 10 0s6 6 10 0M2 17c4-6 6 6 10 0s6 6 10 0"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 11h18m-13 4h2m4 0h2m-8 3h2"/></>,
  sun:<><path d="M3 17h18M1 21h22M12 2v3M4.2 6.2l2 2m11.6 0 2-2M2 12h3m14 0h3"/><path d="M6 17v-2a6 6 0 0 1 12 0v2"/></>,
  coin:<><circle cx="12" cy="12" r="9"/><path d="m12 7 5 5-5 5-5-5Z"/></>,
  home:<><path d="m2 11 10-8 10 8M5 10v11h5v-6h4v6h5V10"/></>,
  chat:<><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H7l-4 3v-6.5A8.5 8.5 0 1 1 21 11.5Z"/><path d="M7 9h10M7 13h6"/></>,
  book:<><path d="M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v16"/><path d="M5 8h4m-4 4h4m6-4h4m-4 4h4"/></>,
  eye:<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,
  left:<path d="m15 5-7 7 7 7"/>,right:<path d="m9 5 7 7-7 7"/>,
  check:<path d="m5 12 4 4L19 6"/>,
 }
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]||paths.spark}</svg>
}
