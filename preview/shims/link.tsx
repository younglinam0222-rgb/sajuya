import {forwardRef} from 'react'
import {navigate} from './navigation'
const Link=forwardRef<HTMLAnchorElement,any>(function Link({href,onClick,children,prefetch,replace,scroll,...props},ref){const url=typeof href==='string'?href:href?.pathname||'/';return <a {...props} ref={ref} href={url} onClick={e=>{onClick?.(e);if(e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||props.target==='_blank'||!url.startsWith('/'))return;e.preventDefault();navigate(url,replace)}}>{children}</a>})
export default Link
