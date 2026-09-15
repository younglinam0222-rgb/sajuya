import {spawn} from 'node:child_process'
// The supervised Sites preview supplies Vite flags. Ordinary local work keeps Next.
const args=process.argv.slice(2)
const preview=args.includes('--strictPort')
const child=spawn(process.execPath,preview?['node_modules/vite/bin/vite.js','--config','preview/vite.config.mts',...args]:['node_modules/next/dist/bin/next','dev',...args],{stdio:'inherit'})
child.on('exit',code=>process.exit(code??1))
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal))
